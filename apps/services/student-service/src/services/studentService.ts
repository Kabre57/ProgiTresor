import * as studentRepository from '../repositories/studentRepository';
import type { EtudiantCreateData, EtudiantUpdateData, EtudiantWithRelations } from '../repositories/studentRepository';
import redisClient from '../utils/redis';
import { NotFoundError, ConflictError } from '../utils/errors';
import { redisCacheHits, redisCacheMisses } from '../utils/metrics';
import logger from '../utils/logger';

const CACHE_TTL = 600;

const STUDENT_DATE_FIELDS = new Set(['dateCreation']);

const parseCachedStudent = (cached: string): EtudiantWithRelations => {
  return JSON.parse(cached, (key: string, value: unknown) => {
    if (STUDENT_DATE_FIELDS.has(key) && typeof value === 'string') {
      return new Date(value);
    }
    return value;
  }) as EtudiantWithRelations;
};

const isPrismaError = (error: unknown): error is { code: string } => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

const cacheKey = (matricule: string) => `student:${matricule}`;

export const getStudentByMatricule = async (matricule: string) => {
  const key = cacheKey(matricule);

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      redisCacheHits.inc();
      return parseCachedStudent(cached);
    }
  } catch (err) {
    logger.warn({ err, matricule }, 'Redis read failed, falling back to DB');
  }

  redisCacheMisses.inc();

  const student = await studentRepository.findByMatricule(matricule);
  if (!student) {
    throw new NotFoundError('Student not found');
  }

  try {
    await redisClient.setEx(key, CACHE_TTL, JSON.stringify(student));
  } catch (err) {
    logger.warn({ err, matricule }, 'Redis write failed');
  }

  return student;
};

export const batchLookupStudents = async (matricules: string[]) => {
  if (matricules.length === 0) return [];
  const results: EtudiantWithRelations[] = [];
  const missingMatricules: string[] = [];

  const keys = matricules.map((m) => cacheKey(m.toUpperCase()));
  let cachedValues: (string | null)[] = [];

  try {
    cachedValues = await redisClient.mGet(keys);
  } catch (err) {
    logger.warn({ err }, 'Redis mGet failed in batchLookupStudents');
    cachedValues = new Array(matricules.length).fill(null);
  }

  for (let i = 0; i < matricules.length; i++) {
    const cached = cachedValues[i];
    const matricule = matricules[i];
    if (cached) {
      redisCacheHits.inc();
      results.push(parseCachedStudent(cached));
    } else {
      redisCacheMisses.inc();
      missingMatricules.push(matricule);
    }
  }

  if (missingMatricules.length > 0) {
    const students = await studentRepository.findManyByMatriculesOrTresorPay(missingMatricules);
    const cacheEntries: Record<string, string> = {};

    for (const student of students) {
      results.push(student);
      const val = JSON.stringify(student);
      cacheEntries[cacheKey(student.matricule)] = val;
      if (student.matriculeTresorPay) {
        cacheEntries[cacheKey(student.matriculeTresorPay)] = val;
      }
    }

    if (Object.keys(cacheEntries).length > 0) {
      try {
        const pipeline = redisClient.multi();
        for (const [key, value] of Object.entries(cacheEntries)) {
          pipeline.setEx(key, CACHE_TTL, value);
        }
        await pipeline.exec();
      } catch (err) {
        logger.warn({ err }, 'Redis batch write failed during batchLookupStudents');
      }
    }
  }

  return results;
};

export const createStudent = async (data: EtudiantCreateData) => {
  try {
    const prismaInstance = studentRepository.getPrismaClient();
    const promotionId = (data as any).promotionId;
    let promotionString = null;

    if (promotionId) {
      const p = await prismaInstance.promotion.findUnique({ where: { id: promotionId } });
      if (p) {
        promotionString = p.nom;
      }
    }

    const { promotion, photoUrl, ...cleanedData } = data as any;

    const student = await studentRepository.createStudent({
      ...cleanedData,
      promotionId: promotionId || null,
      promotionString: promotionString || null,
      photoUrl: photoUrl || null,
    });
    logger.info({ matricule: data.matricule }, 'Student created');
    return student;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') {
      throw new ConflictError('Student with this matricule already exists');
    }
    throw e;
  }
};

export const updateStudent = async (
  matricule: string,
  data: EtudiantUpdateData,
) => {
  const prismaInstance = studentRepository.getPrismaClient();
  let promotionId = (data as any).promotionId;
  let promotionString = (data as any).promotionString || (data as any).promotion;

  if (promotionId) {
    const p = await prismaInstance.promotion.findUnique({ where: { id: promotionId } });
    if (p) {
      promotionString = p.nom;
    }
  }

  const { promotion, photoUrl, ...cleanedData } = data as any;

  const updatePayload: any = {
    ...cleanedData,
  };

  if (photoUrl !== undefined) {
    updatePayload.photoUrl = photoUrl;
  }

  if (promotionId !== undefined) {
    updatePayload.promotionId = promotionId;
  }
  if (promotionString !== undefined) {
    updatePayload.promotionString = promotionString;
  }

  const updated = await studentRepository.updateStudent(matricule, updatePayload);

  try {
    await redisClient.del(cacheKey(matricule));
    logger.info({ matricule }, 'Updated student, invalidated cache');
  } catch (err) {
    logger.warn({ err, matricule }, 'Redis cache invalidation failed');
  }

  return updated;
};

export const searchStudents = async (
  query?: string,
  antenneId?: number | number[],
  filiereId?: number | number[],
  statutId?: number | number[],
  promotion?: string | string[],
  promotionId?: number | number[]
) => {
  return studentRepository.searchStudents(query, antenneId, filiereId, statutId, promotion, promotionId);
};

export const batchLookupStudentsByIds = async (ids: number[]) => {
  return studentRepository.findManyByIds(ids);
};

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { nom: parts[0].toUpperCase(), prenom: 'Temporaire' };
  }
  const nom = parts[0].toUpperCase();
  const prenom = parts.slice(1).join(' ');
  return { nom, prenom };
};

export const getStudentByTresorPay = async (matriculeTresorPay: string) => {
  const cleanMatricule = matriculeTresorPay.trim();
  const student = await studentRepository.findByMatriculeTresorPay(cleanMatricule);
  if (!student) {
    throw new NotFoundError('Student not found by Trésor Pay matricule');
  }
  return student;
};

export const upsertTemporaryStudent = async (data: { matriculeTresorPay: string, nomPayeur: string }) => {
  const cleanMatricule = data.matriculeTresorPay.trim();
  
  // Check if student already exists with this matriculeTresorPay
  const existing = await studentRepository.findByMatriculeTresorPay(cleanMatricule);
  if (existing) {
    return existing;
  }

  // Generer matricule TMP-XXXX
  const matricule = `TMP-${cleanMatricule.toUpperCase()}`;
  
  // Check if this matricule already exists (e.g. if we created it before or someone else has it)
  const existingByMatricule = await studentRepository.findByMatricule(matricule);
  if (existingByMatricule) {
    return existingByMatricule;
  }

  // Split nom et prenom
  const { nom, prenom } = splitFullName(data.nomPayeur);

  // Fallbacks referentiel obligatoires
  const prismaInstance = studentRepository.getPrismaClient();
  const antenne = await prismaInstance.antenne.findFirst();
  const filiere = await prismaInstance.filiere.findFirst();
  const statut = await prismaInstance.statutEtudiant.findFirst();

  if (!antenne || !filiere || !statut) {
    throw new Error('Default referentials (Antenne, Filiere, Statut) are missing in database.');
  }

  // Create student
  const student = await studentRepository.createStudent({
    matricule,
    nom,
    prenom,
    antenneId: antenne.id,
    filiereId: filiere.id,
    statutId: statut.id,
    matriculeTresorPay: cleanMatricule,
    estTemporaire: true,
  });

  // Create notification record
  await prismaInstance.notificationEtudiantTemporaire.create({
    data: {
      matriculeTresorPay: cleanMatricule,
      nomPayeur: data.nomPayeur,
      etudiantTemporaireId: student.id,
      traite: false
    }
  });

  logger.info({ matricule, studentId: student.id }, 'Temporary student created');
  return student;
};

export const mapStudentTresorPay = async (etudiantId: number, matriculeTresorPay: string) => {
  const cleanMatricule = matriculeTresorPay.trim();
  const prismaInstance = studentRepository.getPrismaClient();

  // Find target student
  const students = await studentRepository.findManyByIds([etudiantId]);
  const realStudent = students[0];
  if (!realStudent) {
    throw new NotFoundError('Target student not found');
  }

  // Check if another student currently uses this matriculeTresorPay
  const conflictingStudent = await studentRepository.findByMatriculeTresorPay(cleanMatricule);
  
  let oldStudentId: number | null = null;
  if (conflictingStudent && conflictingStudent.id !== etudiantId) {
    if (conflictingStudent.estTemporaire) {
      oldStudentId = conflictingStudent.id;
    } else {
      throw new ConflictError('This Trésor Pay matricule is already mapped to another real student');
    }
  }

  // If there's an old temporary student, merge transactions first
  if (oldStudentId !== null) {
    const transactionServiceUrl = process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:5003';
    try {
      const mergeResponse = await fetch(`${transactionServiceUrl}/merge-students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldStudentId, newStudentId: etudiantId }),
      });
      if (!mergeResponse.ok) {
        throw new Error(`Failed to merge transactions in transaction-service: ${mergeResponse.statusText}`);
      }
      logger.info({ oldStudentId, newStudentId: etudiantId }, 'Transactions successfully merged');
    } catch (err) {
      logger.error(err, 'Failed to merge student transactions');
      throw new Error('Transaction merge failed. Mapping aborted to maintain integrity.');
    }
  }

  // Update target student mapping
  const updatedStudent = await studentRepository.updateStudent(realStudent.matricule, {
    matriculeTresorPay: cleanMatricule,
  });

  // If there was a temporary student, we can delete it now!
  if (oldStudentId !== null) {
    // First remove conflicting mapping to bypass unique constraint if deletion is deferred
    await prismaInstance.etudiant.update({
      where: { id: oldStudentId },
      data: { matriculeTresorPay: null }
    });
    
    // Delete the student (cascades to notification)
    await prismaInstance.etudiant.delete({
      where: { id: oldStudentId }
    });
    
    logger.info({ oldStudentId }, 'Temporary student deleted after merge');
  }

  // Invalidate cache
  try {
    await redisClient.del(`student:${realStudent.matricule}`);
  } catch (err) {
    logger.warn(err, 'Cache invalidation failed');
  }

  return updatedStudent;
};

export const getTemporaryStudentNotifications = async () => {
  const prismaInstance = studentRepository.getPrismaClient();
  return prismaInstance.notificationEtudiantTemporaire.findMany({
    orderBy: { dateCreation: 'desc' },
    include: {
      etudiantTemporaire: true
    }
  });
};

export const markTemporaryStudentNotificationTreated = async (id: number) => {
  const prismaInstance = studentRepository.getPrismaClient();
  const notification = await prismaInstance.notificationEtudiantTemporaire.findUnique({
    where: { id }
  });
  if (!notification) {
    throw new NotFoundError('Notification not found');
  }
  return prismaInstance.notificationEtudiantTemporaire.update({
    where: { id },
    data: { traite: true },
    include: {
      etudiantTemporaire: true
    }
  });
};

export const getDistinctPromotions = async (): Promise<string[]> => {
  const prismaInstance = studentRepository.getPrismaClient();
  const result = await prismaInstance.promotion.findMany({
    select: {
      nom: true,
    },
    orderBy: {
      nom: 'asc',
    },
  });
  return result.map((r) => r.nom);
};

