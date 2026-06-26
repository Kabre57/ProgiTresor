import * as etudiantRepository from '../repositories/etudiantRepository';
import type { EtudiantCreateData, EtudiantUpdateData, EtudiantWithRelations } from '../repositories/etudiantRepository';
import redisClient from '../utils/redis';
import { NotFoundError, ConflictError } from '../utils/errors';
import { redisCacheHits, redisCacheMisses } from '../utils/metrics';
import logger from '../utils/logger';

const CACHE_TTL = 600;

const ETUDIANT_DATE_FIELDS = new Set(['dateCreation']);

const parseCachedEtudiant = (cached: string): EtudiantWithRelations => {
  return JSON.parse(cached, (key: string, value: unknown) => {
    if (ETUDIANT_DATE_FIELDS.has(key) && typeof value === 'string') {
      return new Date(value);
    }
    return value;
  }) as EtudiantWithRelations;
};

const isPrismaError = (error: unknown): error is { code: string } => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

const cacheKey = (matricule: string) => `etudiant:${matricule}`;

export const getEtudiantByMatricule = async (matricule: string) => {
  const key = cacheKey(matricule);

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      redisCacheHits.inc();
      return parseCachedEtudiant(cached);
    }
  } catch (err) {
    logger.warn({ err, matricule }, 'Redis read failed, falling back to DB');
  }

  redisCacheMisses.inc();

  const etudiant = await etudiantRepository.findByMatricule(matricule);
  if (!etudiant) {
    throw new NotFoundError('Etudiant not found');
  }

  try {
    await redisClient.setEx(key, CACHE_TTL, JSON.stringify(etudiant));
  } catch (err) {
    logger.warn({ err, matricule }, 'Redis write failed');
  }

  return etudiant;
};

export const batchLookupEtudiants = async (matricules: string[]) => {
  if (matricules.length === 0) return [];
  const results: EtudiantWithRelations[] = [];
  const missingMatricules: string[] = [];

  const keys = matricules.map((m) => cacheKey(m.toUpperCase()));
  let cachedValues: (string | null)[] = [];

  try {
    cachedValues = await redisClient.mGet(keys);
  } catch (err) {
    logger.warn({ err }, 'Redis mGet failed in batchLookupEtudiants');
    cachedValues = new Array(matricules.length).fill(null);
  }

  for (let i = 0; i < matricules.length; i++) {
    const cached = cachedValues[i];
    const matricule = matricules[i];
    if (cached) {
      redisCacheHits.inc();
      results.push(parseCachedEtudiant(cached));
    } else {
      redisCacheMisses.inc();
      missingMatricules.push(matricule);
    }
  }

  if (missingMatricules.length > 0) {
    const etudiant = await etudiantRepository.findManyByMatriculesOrTresorPay(missingMatricules);
    const cacheEntries: Record<string, string> = {};

    for (const etudiant of etudiant) {
      results.push(etudiant);
      const val = JSON.stringify(etudiant);
      cacheEntries[cacheKey(etudiant.matricule)] = val;
      if (etudiant.matriculeTresorPay) {
        cacheEntries[cacheKey(etudiant.matriculeTresorPay)] = val;
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
        logger.warn({ err }, 'Redis batch write failed during batchLookupEtudiants');
      }
    }
  }

  return results;
};

export const createEtudiant = async (data: EtudiantCreateData) => {
  try {
    const prismaInstance = etudiantRepository.getPrismaClient();
    const promotionId = (data as any).promotionId;
    let promotionString = null;

    if (promotionId) {
      const p = await prismaInstance.promotion.findUnique({ where: { id: promotionId } });
      if (p) {
        promotionString = p.nom;
      }
    }

    const { promotion, photoUrl, ...cleanedData } = data as any;

    const etudiant = await etudiantRepository.createEtudiant({
      ...cleanedData,
      promotionId: promotionId || null,
      promotionString: promotionString || null,
      photoUrl: photoUrl || null,
    });
    logger.info({ matricule: data.matricule }, 'Etudiant created');
    return etudiant;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') {
      throw new ConflictError('Etudiant with this matricule already exists');
    }
    throw e;
  }
};

export const updateEtudiant = async (
  matricule: string,
  data: EtudiantUpdateData,
) => {
  const prismaInstance = etudiantRepository.getPrismaClient();
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

  const updated = await etudiantRepository.updateEtudiant(matricule, updatePayload);

  try {
    await redisClient.del(cacheKey(matricule));
    logger.info({ matricule }, 'Updated etudiant, invalidated cache');
  } catch (err) {
    logger.warn({ err, matricule }, 'Redis cache invalidation failed');
  }

  return updated;
};

export const searchEtudiants = async (
  query?: string,
  antenneId?: number | number[],
  filiereId?: number | number[],
  statutId?: number | number[],
  promotion?: string | string[],
  promotionId?: number | number[]
) => {
  return etudiantRepository.searchEtudiants(query, antenneId, filiereId, statutId, promotion, promotionId);
};

export const batchLookupEtudiantsByIds = async (ids: number[]) => {
  return etudiantRepository.findManyByIds(ids);
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

export const getEtudiantByTresorPay = async (matriculeTresorPay: string) => {
  const cleanMatricule = matriculeTresorPay.trim();
  const etudiant = await etudiantRepository.findByMatriculeTresorPay(cleanMatricule);
  if (!etudiant) {
    throw new NotFoundError('Etudiant not found by Trésor Pay matricule');
  }
  return etudiant;
};

export const upsertTemporaryEtudiant = async (data: { matriculeTresorPay: string, nomPayeur: string }) => {
  const cleanMatricule = data.matriculeTresorPay.trim();
  
  // Check if etudiant already exists with this matriculeTresorPay
  const existing = await etudiantRepository.findByMatriculeTresorPay(cleanMatricule);
  if (existing) {
    return existing;
  }

  // Generer matricule TMP-XXXX
  const matricule = `TMP-${cleanMatricule.toUpperCase()}`;
  
  // Check if this matricule already exists (e.g. if we created it before or someone else has it)
  const existingByMatricule = await etudiantRepository.findByMatricule(matricule);
  if (existingByMatricule) {
    return existingByMatricule;
  }

  // Split nom et prenom
  const { nom, prenom } = splitFullName(data.nomPayeur);

  // Fallbacks referentiel obligatoires
  const prismaInstance = etudiantRepository.getPrismaClient();
  const antenne = await prismaInstance.antenne.findFirst();
  const filiere = await prismaInstance.filiere.findFirst();
  const statut = await prismaInstance.statutEtudiant.findFirst();

  if (!antenne || !filiere || !statut) {
    throw new Error('Default referentials (Antenne, Filiere, Statut) are missing in database.');
  }

  // Create etudiant
  const etudiant = await etudiantRepository.createEtudiant({
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
      etudiantTemporaireId: etudiant.id,
      traite: false
    }
  });

  logger.info({ matricule, etudiantId: etudiant.id }, 'Temporary etudiant created');
  return etudiant;
};

export const mapEtudiantTresorPay = async (etudiantId: number, matriculeTresorPay: string) => {
  const cleanMatricule = matriculeTresorPay.trim();
  const prismaInstance = etudiantRepository.getPrismaClient();

  // Find target etudiant
  const etudiant = await etudiantRepository.findManyByIds([etudiantId]);
  const realEtudiant = etudiant[0];
  if (!realEtudiant) {
    throw new NotFoundError('Target etudiant not found');
  }

  // Check if another etudiant currently uses this matriculeTresorPay
  const conflictingEtudiant = await etudiantRepository.findByMatriculeTresorPay(cleanMatricule);
  
  let oldEtudiantId: number | null = null;
  if (conflictingEtudiant && conflictingEtudiant.id !== etudiantId) {
    if (conflictingEtudiant.estTemporaire) {
      oldEtudiantId = conflictingEtudiant.id;
    } else {
      throw new ConflictError('This Trésor Pay matricule is already mapped to another real etudiant');
    }
  }

  // If there's an old temporary etudiant, merge transactions first
  if (oldEtudiantId !== null) {
    const transactionServiceUrl = process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:5003';
    try {
      const mergeResponse = await fetch(`${transactionServiceUrl}/merge-etudiant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldEtudiantId, newEtudiantId: etudiantId }),
      });
      if (!mergeResponse.ok) {
        throw new Error(`Failed to merge transactions in transaction-service: ${mergeResponse.statusText}`);
      }
      logger.info({ oldEtudiantId, newEtudiantId: etudiantId }, 'Transactions successfully merged');
    } catch (err) {
      logger.error(err, 'Failed to merge etudiant transactions');
      throw new Error('Transaction merge failed. Mapping aborted to maintain integrity.');
    }
  }

  // Update target etudiant mapping
  const updatedEtudiant = await etudiantRepository.updateEtudiant(realEtudiant.matricule, {
    matriculeTresorPay: cleanMatricule,
  });

  // If there was a temporary etudiant, we can delete it now!
  if (oldEtudiantId !== null) {
    // First remove conflicting mapping to bypass unique constraint if deletion is deferred
    await prismaInstance.etudiant.update({
      where: { id: oldEtudiantId },
      data: { matriculeTresorPay: null }
    });
    
    // Delete the etudiant (cascades to notification)
    await prismaInstance.etudiant.delete({
      where: { id: oldEtudiantId }
    });
    
    logger.info({ oldEtudiantId }, 'Temporary etudiant deleted after merge');
  }

  // Invalidate cache
  try {
    await redisClient.del(`etudiant:${realEtudiant.matricule}`);
  } catch (err) {
    logger.warn(err, 'Cache invalidation failed');
  }

  return updatedEtudiant;
};

export const getTemporaryEtudiantNotifications = async () => {
  const prismaInstance = etudiantRepository.getPrismaClient();
  return prismaInstance.notificationEtudiantTemporaire.findMany({
    orderBy: { dateCreation: 'desc' },
    include: {
      etudiantTemporaire: true
    }
  });
};

export const markTemporaryEtudiantNotificationTreated = async (id: number) => {
  const prismaInstance = etudiantRepository.getPrismaClient();
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
  const prismaInstance = etudiantRepository.getPrismaClient();
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

