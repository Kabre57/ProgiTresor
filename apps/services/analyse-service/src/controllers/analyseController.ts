import { Request, Response, NextFunction } from 'express';
import * as analyseService from '../services/analyse.service';
import { AppError, ValidationError } from '../utils/errors';
import { prisma } from '../utils/prisma';
import { getPdfStream } from '../services/storage.service';
import { Readable } from 'stream';

const getUserId = (req: Request) => {
  const raw = req.headers['x-user-id'];
  const id = raw ? Number(raw) : 1;
  return Number.isFinite(id) && id > 0 ? id : 1;
};

const forwardedAuthHeaders = (req: Request): Record<string, string> => {
  const headers: Record<string, string> = {};
  for (const key of ['x-user-id', 'x-user-role', 'x-user-permissions', 'x-user-denies']) {
    const value = req.headers[key];
    if (typeof value === 'string') {
      headers[key] = value;
    }
  }
  return headers;
};

export const generateSynthesis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = analyseService.SynthesisFiltersSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(JSON.stringify(parsed.error.format()));
    }

    const result = await analyseService.generateSynthesis(parsed.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const validateSynthesis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = analyseService.ValidateSynthesisSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(JSON.stringify(parsed.error.format()));
    }

    const result = await analyseService.validateSynthesis(parsed.data, getUserId(req));
    broadcastNotification('NEW_SYNTHESIS', `Nouvelle synthèse ${result.reference} disponible pour validation`, { reference: result.reference });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const getKpis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyseService.getKpis(req.query as Record<string, unknown>, forwardedAuthHeaders(req));
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const healthCheck = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'analyse-service' });
  } catch (err) {
    next(new AppError(503, `Database connection failed: ${String(err)}`));
  }
};

export const getMetrics = async (_req: Request, res: Response) => {
  const promClient = require('../utils/metrics').default;
  res.setHeader('Content-Type', promClient.register.contentType);
  res.send(await promClient.register.metrics());
};

export const servePdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = req.params.filename;
    const result = await getPdfStream(filename);

    res.setHeader('Content-Type', 'application/pdf');
    if (typeof result === 'string') {
      res.sendFile(result);
    } else if (result) {
      (result as Readable).pipe(res);
    } else {
      throw new AppError(404, 'PDF file not found');
    }
  } catch (err) {
    next(err);
  }
};

interface SseClient {
  res: Response;
  perms: Record<string, number>;
  role: string;
}

const sseClients = new Set<SseClient>();

export const handleSseConnection = (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(':\n\n');
  const heartbeat = setInterval(() => {
    res.write(':\n\n');
  }, 15000);

  const role = String(req.headers['x-user-role'] || '');
  const userPermsRaw = req.headers['x-user-permissions'];
  let perms: Record<string, number> = {};
  if (typeof userPermsRaw === 'string') {
    try {
      perms = JSON.parse(userPermsRaw);
    } catch {}
  }

  const client: SseClient = { res, perms, role };
  sseClients.add(client);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(client);
  });
};

export const broadcastNotification = (type: string, message: string, payload: any) => {
  const data = JSON.stringify({ type, message, ...payload });
  
  for (const client of sseClients) {
    const hasBudgetAccess = (client.perms['ANALYSE'] >= 1) || 
                            (client.perms['OT'] >= 3) || 
                            ['Agent Budget', 'BUDGET'].includes(client.role);
                            
    if (hasBudgetAccess) {
      client.res.write(`data: ${data}\n\n`);
    }
  }
};

export const previewPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pdfBuffer = await analyseService.previewSynthesisPDF(req.body);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

export const generateAttestation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { student, transactions } = req.body;
    const pdfBuffer = await analyseService.getAttestationPDF({ student, transactions });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="attestation.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

