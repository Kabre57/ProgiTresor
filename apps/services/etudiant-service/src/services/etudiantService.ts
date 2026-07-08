import * as etudiantRepository from '../repositories/etudiantRepository';
import type { EtudiantCreateData, EtudiantUpdateData, EtudiantWithRelations } from '../repositories/etudiantRepository';
import redisClient from '../utils/redis';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
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
    const etudiants = await etudiantRepository.findManyByMatriculesOrTresorPay(missingMatricules);
    const cacheEntries: Record<string, string> = {};

    for (const etudiant of etudiants) {
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

    const { promotion, photoUrl, filiereId, ...cleanedData } = data as any;

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

  const { promotion, photoUrl, filiereId, ...cleanedData } = data as any;

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
  promotionId?: number | number[],
  niveauId?: number | number[]
) => {
  return etudiantRepository.searchEtudiants(query, antenneId, filiereId, statutId, promotion, promotionId, niveauId);
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

const createHashSuffix = (value: string, length = 6): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).substring(0, length).toUpperCase();
};

const normalizeTresorLookupKey = (value: string): string => value.trim().toUpperCase().replace(/\s+/g, ' ');

const generateSafeTresorPayKey = (cleanMatricule: string): string => {
  const normalized = normalizeTresorLookupKey(cleanMatricule);
  if (normalized.length <= 50) {
    return normalized;
  }

  const hashStr = createHashSuffix(normalized, 8);
  return `${normalized.substring(0, 41)}-${hashStr}`.substring(0, 50);
};

const generateSafeTemporaryMatricule = (cleanMatricule: string): string => {
  const upper = cleanMatricule.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const hashStr = createHashSuffix(cleanMatricule, 6);
  const namePart = upper.substring(0, 15);
  return `TMP-${namePart}-${hashStr}`.substring(0, 30);
};

export const upsertTemporaryEtudiant = async (data: { matriculeTresorPay: string, nomPayeur: string }) => {
  const lookupKey = normalizeTresorLookupKey(data.matriculeTresorPay);
  const storedTresorPay = generateSafeTresorPayKey(lookupKey);
  
  // Check if etudiant already exists with this matriculeTresorPay
  const existing = await etudiantRepository.findByMatriculeTresorPay(storedTresorPay);
  if (existing) {
    return { ...existing, lookupKey, lookupKeys: [lookupKey] };
  }

  // Generer matricule TMP-XXXX
  const matricule = generateSafeTemporaryMatricule(lookupKey);
  
  // Check if this matricule already exists (e.g. if we created it before or someone else has it)
  const existingByMatricule = await etudiantRepository.findByMatricule(matricule);
  if (existingByMatricule) {
    return { ...existingByMatricule, lookupKey, lookupKeys: [lookupKey] };
  }

  // Split nom et prenom
  const { nom, prenom } = splitFullName(data.nomPayeur);

  // Fallbacks referentiel obligatoires
  const prismaInstance = etudiantRepository.getPrismaClient();
  const antenne = await prismaInstance.antenne.findFirst();
  const niveau = await prismaInstance.niveau.findFirst();
  const statut = await prismaInstance.statutEtudiant.findFirst();

  if (!antenne || !niveau || !statut) {
    throw new Error('Default referentials (Antenne, Niveau, Statut) are missing in database.');
  }

  // Create etudiant
  const etudiant = await etudiantRepository.createEtudiant({
    matricule,
    nom,
    prenom,
    antenneId: antenne.id,
    niveauId: niveau.id,
    statutId: statut.id,
    matriculeTresorPay: storedTresorPay,
    estTemporaire: true,
  });

  // Create notification record
  await prismaInstance.notificationEtudiantTemporaire.create({
    data: {
      matriculeTresorPay: storedTresorPay,
      nomPayeur: data.nomPayeur,
      etudiantTemporaireId: etudiant.id,
      traite: false
    }
  });

  logger.info({ matricule, etudiantId: etudiant.id }, 'Temporary etudiant created');
  return { ...etudiant, lookupKey, lookupKeys: [lookupKey] };
};

export const upsertTemporaryEtudiantsBatch = async (items: { matriculeTresorPay: string, nomPayeur: string }[]) => {
  const cleanItems = items
    .map(item => {
      const lookupKey = normalizeTresorLookupKey(item.matriculeTresorPay || '');
      return {
        lookupKey,
        storedTresorPay: generateSafeTresorPayKey(lookupKey),
        temporaryMatricule: generateSafeTemporaryMatricule(lookupKey),
        nomPayeur: (item.nomPayeur || 'Payeur Inconnu').trim()
      };
    })
    .filter(item => item.lookupKey !== '');

  const prismaInstance = etudiantRepository.getPrismaClient();
  const antenne = await prismaInstance.antenne.findFirst();
  const niveau = await prismaInstance.niveau.findFirst();
  const statut = await prismaInstance.statutEtudiant.findFirst();

  if (!antenne || !niveau || !statut) {
    throw new Error('Default referentials (Antenne, Niveau, Statut) are missing in database.');
  }

  const uniqueItemsByLookupKey = new Map<string, typeof cleanItems[number]>();
  for (const item of cleanItems) {
    uniqueItemsByLookupKey.set(item.lookupKey, item);
  }

  const uniqueItems = Array.from(uniqueItemsByLookupKey.values());
  const storedTresorPayKeys = uniqueItems.map(i => i.storedTresorPay);
  const temporaryMatricules = uniqueItems.map(i => i.temporaryMatricule);
  
  const existingEtudiants = await prismaInstance.etudiant.findMany({
    where: {
      OR: [
        { matriculeTresorPay: { in: storedTresorPayKeys } },
        { matricule: { in: temporaryMatricules } }
      ]
    }
  });

  const existingByTresorPay = new Map<string, any>();
  const existingByMatricule = new Map<string, any>();
  for (const e of existingEtudiants) {
    if (e.matriculeTresorPay) existingByTresorPay.set(e.matriculeTresorPay.toUpperCase(), e);
    existingByMatricule.set(e.matricule.toUpperCase(), e);
  }

  const existingIds = new Set(existingEtudiants.map(e => e.id));
  const itemsToCreate = uniqueItems.filter(item =>
    !existingByTresorPay.has(item.storedTresorPay.toUpperCase()) &&
    !existingByMatricule.has(item.temporaryMatricule.toUpperCase())
  );
  
  if (itemsToCreate.length > 0) {
    await prismaInstance.etudiant.createMany({
      data: itemsToCreate.map(item => {
        const { nom, prenom } = splitFullName(item.nomPayeur);
        return {
          matricule: item.temporaryMatricule,
          nom,
          prenom,
          antenneId: antenne.id,
          niveauId: niveau.id,
          statutId: statut.id,
          matriculeTresorPay: item.storedTresorPay,
          estTemporaire: true,
        };
      }),
      skipDuplicates: true,
    });
  }

  const finalEtudiants = await prismaInstance.etudiant.findMany({
    where: {
      OR: [
        { matriculeTresorPay: { in: storedTresorPayKeys } },
        { matricule: { in: temporaryMatricules } }
      ]
    }
  });

  const itemByStoredTresorPay = new Map(uniqueItems.map(item => [item.storedTresorPay.toUpperCase(), item]));
  const itemByTemporaryMatricule = new Map(uniqueItems.map(item => [item.temporaryMatricule.toUpperCase(), item]));

  const notificationsToCreate = finalEtudiants
    .filter(etudiant => !existingIds.has(etudiant.id))
    .map(etudiant => {
      const item = (etudiant.matriculeTresorPay ? itemByStoredTresorPay.get(etudiant.matriculeTresorPay.toUpperCase()) : undefined)
        || itemByTemporaryMatricule.get(etudiant.matricule.toUpperCase());
      if (!item) return null;
      return {
        matriculeTresorPay: item.storedTresorPay,
        nomPayeur: item.nomPayeur,
        etudiantTemporaireId: etudiant.id,
        traite: false
      };
    })
    .filter((notification): notification is NonNullable<typeof notification> => notification !== null);

  if (notificationsToCreate.length > 0) {
    await prismaInstance.notificationEtudiantTemporaire.createMany({
      data: notificationsToCreate,
    });
  }

  return finalEtudiants.map(etudiant => {
    const lookupKeys = uniqueItems
      .filter(item =>
        (etudiant.matriculeTresorPay && item.storedTresorPay.toUpperCase() === etudiant.matriculeTresorPay.toUpperCase()) ||
        item.temporaryMatricule.toUpperCase() === etudiant.matricule.toUpperCase()
      )
      .map(item => item.lookupKey);

    return {
      ...etudiant,
      lookupKey: lookupKeys[0],
      lookupKeys,
    };
  });
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

export const getEtudiantStatsGroups = async () => {
  return await etudiantRepository.countEtudiantsByGroups();
};

export const getStudentFinancialSummary = async (identifier: string) => {
  const prismaInstance = etudiantRepository.getPrismaClient();
  let student;
  const id = parseInt(identifier, 10);
  if (!isNaN(id)) {
    student = await prismaInstance.etudiant.findUnique({
      where: { id },
      include: {
        antenne: true,
        niveau: {
          include: {
            filiere: true
          }
        },
        statut: true,
        promotion: true
      }
    });
  } else {
    student = await prismaInstance.etudiant.findUnique({
      where: { matricule: identifier },
      include: {
        antenne: true,
        niveau: {
          include: {
            filiere: true
          }
        },
        statut: true,
        promotion: true
      }
    });
  }

  if (!student) {
    throw new NotFoundError('Etudiant not found');
  }

  // Fetch active configurations of mandatory fees matching the student's level and status
  const currentDate = new Date();
  const configurations = await prismaInstance.configurationFraisNiveau.findMany({
    where: {
      niveauId: student.niveauId,
      statutEtudiantId: student.statutId,
      estObligatoire: true,
      dateDebutValidite: { lte: currentDate },
    },
    include: {
      nomenclatureProduit: {
        include: {
          niveau: true,
          statut: true
        }
      }
    }
  });

  // Filter configurations to make sure the nomenclature is active and dateFinValidite is not expired
  const activeConfigurations = configurations.filter((config: any) => {
    if (!config.nomenclatureProduit || !config.nomenclatureProduit.actif) return false;
    if (!config.dateFinValidite) return true;
    return new Date(config.dateFinValidite) >= currentDate;
  });

  // Map to nomenclature objects with final amount (specific or default)
  const applicableNomenclatures = activeConfigurations.map((config: any) => {
    const defaultNom = config.nomenclatureProduit;
    const finalMontant = config.montantSpecifique !== null && config.montantSpecifique !== undefined
      ? config.montantSpecifique
      : defaultNom.montant;
    return {
      ...defaultNom,
      montant: finalMontant
    };
  });

  const montantTotalAttendu = applicableNomenclatures.reduce((sum: number, item: any) => sum + item.montant, 0);

  // Fetch CLASSE transactions from transaction-service
  const transactionServiceUrl = process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:5003';
  const res = await fetch(`${transactionServiceUrl}/?etudiantId=${student.id}&statutTraitement=CLASSE&limit=1000`, {
    headers: {
      'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch transactions from transaction-service: ${res.statusText}`);
  }
  const data = (await res.json()) as { list?: any[] };
  const transactions = data.list || [];
  const montantTotalPaye = transactions.reduce((sum: number, tx: any) => sum + Number(tx.montant), 0);

  const soldeRestant = Math.max(0, montantTotalAttendu - montantTotalPaye);
  const isSolded = soldeRestant === 0;

  return {
    student: {
      id: student.id,
      matricule: student.matricule,
      nom: student.nom,
      prenom: student.prenom,
      niveau: student.niveau?.libelle,
      filiere: student.niveau?.filiere?.libelle,
      statut: student.statut?.libelle,
      promotion: student.promotion?.nom || student.promotionString,
    },
    montantTotalAttendu,
    montantTotalPaye,
    soldeRestant,
    isSolded,
    applicableNomenclatures,
    transactions,
  };
};

export const generateStudentAttestation = async (identifier: string): Promise<Buffer> => {
  const summary = await getStudentFinancialSummary(identifier);
  if (!summary.isSolded) {
    const formattedSolde = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(summary.soldeRestant).replace(/[\u202f\u00a0]/g, ' ');
    throw new ValidationError(`Solde restant à régler : ${formattedSolde} FCFA. L'attestation ne peut être générée qu'après le règlement complet.`);
  }

  const analyseServiceUrl = process.env.ANALYSE_SERVICE_URL || 'http://analyse-service:5002';
  const res = await fetch(`${analyseServiceUrl}/generate-attestation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
    },
    body: JSON.stringify({
      student: summary.student,
      transactions: summary.transactions,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to generate attestation in analyse-service: ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

