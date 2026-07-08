import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import path from 'path';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const sanitizeFilename = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

let s3Client: S3Client | null = null;

const getS3Client = () => {
  if (s3Client) return s3Client;

  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'minioadmin';
  const secretAccessKey = process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin';
  const region = process.env.S3_REGION || 'us-east-1';

  if (!endpoint) {
    throw new AppError(500, 'S3_ENDPOINT is required when PDF_STORAGE_TYPE=s3');
  }

  s3Client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });

  return s3Client;
};

const ensureBucketExists = async (client: S3Client, bucket: string) => {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      logger.info({ bucket }, 'Bucket does not exist, creating it...');
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      logger.info({ bucket }, 'Bucket created successfully');
    } else {
      throw err;
    }
  }
};

export const storePdf = async (buffer: Buffer, reference: string): Promise<string> => {
  const storageType = (process.env.PDF_STORAGE_TYPE || 'local').toLowerCase();
  const filename = `${sanitizeFilename(reference)}-${Date.now()}.pdf`;

  if (storageType === 's3') {
    const bucket = process.env.PDF_BUCKET_NAME || 'progi-pdfs';
    const client = getS3Client();

    await ensureBucketExists(client, bucket);

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `pdfs/${filename}`,
      Body: buffer,
      ContentType: 'application/pdf',
    }));

    const publicBaseUrl = process.env.PDF_PUBLIC_BASE_URL || '';
    return `${publicBaseUrl}/uploads/pdfs/${filename}`;
  }

  const uploadRoot = process.env.PDF_UPLOAD_ROOT || path.join(process.cwd(), 'uploads');
  const uploadDir = process.env.PDF_LOCAL_DIR || path.join(uploadRoot, 'pdfs');
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);

  const publicBaseUrl = process.env.PDF_PUBLIC_BASE_URL || '';
  return `${publicBaseUrl}/uploads/pdfs/${filename}`;
};

export const getPdfStream = async (filename: string) => {
  const storageType = (process.env.PDF_STORAGE_TYPE || 'local').toLowerCase();

  if (storageType === 's3') {
    const bucket = process.env.PDF_BUCKET_NAME || 'progi-pdfs';
    const client = getS3Client();
    const response = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: `pdfs/${filename}`,
    }));
    return response.Body;
  }

  const uploadRoot = process.env.PDF_UPLOAD_ROOT || path.join(process.cwd(), 'uploads');
  const uploadDir = process.env.PDF_LOCAL_DIR || path.join(uploadRoot, 'pdfs');
  const filePath = path.join(uploadDir, filename);
  return filePath;
};
