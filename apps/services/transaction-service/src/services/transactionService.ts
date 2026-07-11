import * as transactionRepository from '../repositories/transactionRepository';
import * as importFichierRepository from '../repositories/importFichierRepository';
import * as ordreTraitementMiroirRepository from '../repositories/ordreTraitementMiroirRepository';
import { AppError } from '../utils/errors';
import { importCounter } from '../utils/metrics';
import logger from '../utils/logger';
import type { ImportPayloadInput, LockTransactionsInput } from '../../../../../shared/types/transaction.types';
import { buildTransactionWhereClause } from '../utils/filterBuilder';
import { prisma } from '../utils/prisma';
import { invalidateKpiCache } from './kpiCacheService';
import { fetchEtudiantJson } from '../utils/etudiantServiceClient';
import { normalizeFinancialLabel } from './importParserService';
import { buildFluxMeta, type FluxMeta } from '../utils/typeFlux';

type ResolvedEtudiant = {
  id: number;
  antenneId: number;
  statutId?: number | null;
  promotionId?: number | null;
  matricule?: string | null;
  matriculeTresorPay?: string | null;
  lookupKey?: string | null;
  lookupKeys?: string[] | null;
};

type EtudiantMapValue = { id: number; antenneId: number; statutId?: number | null; promotionId?: number | null };
type NomenclatureMapValue = {
  id: number;
  typeFluxId: number;
  typeRecetteId?: number | null;
  typeFrais?: string | null;
  niveau?: string | null;
  filiere?: string | null;
  versement?: string | null;
  montant?: number | string | bigint | null;
  regexPattern?: string | null;
  libelle?: string | null;
  codeProduit?: string | null;
  statutId?: number | null;
  promotionId?: number | null;
};

type NomenclatureIndex = {
  all: NomenclatureMapValue[];
  byId: Map<number, NomenclatureMapValue>;
  regexRules: Array<{ pattern: RegExp; source: string; nomenclature: NomenclatureMapValue }>;
};

const ETUDIANT_BATCH_SIZE = 1000;

const normalizeLookupKey = (value: unknown): string => String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');

const fetchTypeFluxMap = async (): Promise<Map<number, FluxMeta>> => {
  try {
    const flux = await fetchEtudiantJson<any[]>('/types-flux', undefined, []);
    if (!Array.isArray(flux)) return new Map();
    return new Map(
      flux
        .filter((item) => item?.id)
        .map((item) => [Number(item.id), buildFluxMeta(item, Number(item.id))]),
    );
  } catch (err) {
    logger.warn(err, 'Failed to fetch type flux referential');
    return new Map();
  }
};

const buildNomenclatureIndex = (items: any[]): NomenclatureIndex => {
  const all: NomenclatureMapValue[] = [];
  const byId = new Map<number, NomenclatureMapValue>();
  const regexRules: NomenclatureIndex['regexRules'] = [];

  for (const nom of items) {
    if (!nom?.id) continue;

    const typeFluxId = Number(nom.typeRecette?.typeFluxId ?? nom.typeFluxId);
    if (!Number.isInteger(typeFluxId) || typeFluxId <= 0) {
      logger.warn({ nomenclatureId: nom.id }, 'Nomenclature ignored: missing typeFlux relation');
      continue;
    }

    const value: NomenclatureMapValue = {
      id: Number(nom.id),
      typeFluxId,
      typeRecetteId: nom.typeRecetteId ?? nom.typeRecette?.id ?? null,
      typeFrais: nom.typeRecette?.libelle || nom.typeRecette?.code || null,
      niveau: null,
      filiere: null,
      versement: null,
      montant: nom.montant ?? null,
      regexPattern: nom.regexPattern ?? null,
      libelle: nom.libelle ?? null,
      codeProduit: nom.codeProduit ?? null,
      statutId: null,
      promotionId: null,
    };

    byId.set(value.id, value);
    all.push(value);

    if (nom.regexPattern) {
      try {
        regexRules.push({
          pattern: new RegExp(String(nom.regexPattern), 'i'),
          source: String(nom.regexPattern),
          nomenclature: value,
        });
      } catch (err) {
        logger.warn({ err, nomenclatureId: nom.id, regexPattern: nom.regexPattern }, 'Invalid nomenclature regex ignored');
      }
    }
  }

  return { all, byId, regexRules };
};

const resolveNomenclature = (
  index: NomenclatureIndex,
  libelle: unknown,
  context?: { statutId?: number | null; promotionId?: number | null; typeRecette?: string | null; promotion?: string | null }
): NomenclatureMapValue | null => {
  const normalized = normalizeFinancialLabel(libelle);
  if (!normalized) return null;

  // 1. Try regex pattern match first
  for (const rule of index.regexRules) {
    if (rule.pattern.test(normalized)) {
      return rule.nomenclature;
    }
  }

  // 2. Try exact or fuzzy substring matches on all nomenclatures
  const candidates = index.all.filter(nom => {
    const nomLib = nom.libelle ? normalizeFinancialLabel(nom.libelle) : '';
    const nomCode = nom.codeProduit ? normalizeFinancialLabel(nom.codeProduit) : '';
    return (
      (nomLib && (nomLib.includes(normalized) || normalized.includes(nomLib))) ||
      (nomCode && (nomCode.includes(normalized) || normalized.includes(nomCode)))
    );
  });

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // 3. Filter using context if we have multiple candidates
  if (context) {
    let filtered = candidates;

    if (context.statutId) {
      filtered = filtered.filter(c => c.statutId === context.statutId);
    }
    if (context.promotionId) {
      filtered = filtered.filter(c => c.promotionId === context.promotionId);
    }

    if (filtered.length === 1) return filtered[0];

    if (context.promotion) {
      const normPromo = context.promotion.toLowerCase().trim();
      const promoFiltered = filtered.filter(c => 
        c.niveau && (c.niveau.toLowerCase().includes(normPromo) || normPromo.includes(c.niveau.toLowerCase()))
      );
      if (promoFiltered.length > 0) filtered = promoFiltered;
    }

    if (filtered.length === 1) return filtered[0];

    if (context.typeRecette) {
      const normTR = context.typeRecette.toLowerCase().trim();
      const trFiltered = filtered.filter(c => 
        c.typeFrais && (c.typeFrais.toLowerCase().includes(normTR) || normTR.includes(c.typeFrais.toLowerCase()))
      );
      if (trFiltered.length > 0) filtered = trFiltered;
    }

    if (filtered.length > 0) return filtered[0];
  }

  return candidates[0];
};

const addResolvedEtudiant = (
  etudiantMap: Map<string, EtudiantMapValue>,
  etudiant: ResolvedEtudiant,
  aliases: string[] = [],
) => {
  if (!etudiant?.id || !etudiant?.antenneId) return;

  const resolvedVal = {
    id: etudiant.id,
    antenneId: etudiant.antenneId,
    statutId: etudiant.statutId ?? null,
    promotionId: etudiant.promotionId ?? null,
  };
  const keys = [
    etudiant.matricule,
    etudiant.matriculeTresorPay,
    etudiant.lookupKey,
    ...(Array.isArray(etudiant.lookupKeys) ? etudiant.lookupKeys : []),
    ...aliases,
  ];

  for (const key of keys) {
    const normalized = normalizeLookupKey(key);
    if (normalized) {
      etudiantMap.set(normalized, resolvedVal);
    }
  }
};

const resolveEtudiantsInChunks = async (
  matricules: string[],
  etudiantMap: Map<string, EtudiantMapValue>,
) => {
  for (let i = 0; i < matricules.length; i += ETUDIANT_BATCH_SIZE) {
    const chunk = matricules.slice(i, i + ETUDIANT_BATCH_SIZE);
    try {
      const etudiants = await fetchEtudiantJson<ResolvedEtudiant[]>('/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ matricules: chunk }),
      }, []);

      if (Array.isArray(etudiants)) {
        for (const etudiant of etudiants) {
          addResolvedEtudiant(etudiantMap, etudiant);
        }
      }
    } catch (err) {
      logger.warn(err, 'Failed to resolve etudiant in batch chunk');
    }
  }
};

const isPrismaError = (error: unknown): error is { code: string } => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

export const importTransactions = async (payload: ImportPayloadInput): Promise<{
  imported: number;
  duplicatesSkipped: number;
  importId: number;
}> => {
  const errors: string[] = [];

  // 1. Filter out duplicates within the uploaded payload itself
  const uniqueItemsMap = new Map<string, any>();
  for (const item of payload.items) {
    if (item.refTresor) {
      uniqueItemsMap.set(item.refTresor.trim(), item);
    }
  }
  const uniqueItems = Array.from(uniqueItemsMap.values());
  const fileDuplicatesCount = payload.items.length - uniqueItems.length;

  // 2. Batch resolve etudiant by distinct matricules (internal and external)
  const etudiantMap = new Map<string, EtudiantMapValue>();
  const distinctMatricules = Array.from(
    new Set(
      uniqueItems
        .map((item: any) => normalizeLookupKey(item.matriculeTresorPay || item.etudiantMatricule || ''))
        .filter((m): m is string => m !== '')
    )
  );

  if (distinctMatricules.length > 0) {
    await resolveEtudiantsInChunks(distinctMatricules, etudiantMap);
  }

  // 3. Fetch active nomenclatures to resolve financial classification dynamically.
  let nomenclatureIndex: NomenclatureIndex = {
    all: [],
    byId: new Map(),
    regexRules: [],
  };
  try {
    const noms = await fetchEtudiantJson<any[]>('/nomenclatures?actif=true', {
      headers: {
        'Accept': 'application/json',
      },
    }, []);
    if (Array.isArray(noms)) {
      nomenclatureIndex = buildNomenclatureIndex(noms);
    }
  } catch (err) {
    logger.warn(err, 'Failed to fetch nomenclatures for import resolution');
  }

  // Fetch active antennas to resolve regional branches dynamically.
  let antennasList: any[] = [];
  try {
    const ants = await fetchEtudiantJson<any[]>('/antennes', {
      headers: {
        'Accept': 'application/json',
      },
    }, []);
    if (Array.isArray(ants)) {
      antennasList = ants;
    }
  } catch (err) {
    logger.warn(err, 'Failed to fetch antennas for import resolution');
  }

  const normalizeForMatch = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  const matchAntenne = (excelAnt: string | null | undefined): number | null => {
    if (!excelAnt) return null;
    const normExcel = normalizeForMatch(excelAnt);
    const cleanExcel = normExcel.replace(/^infas\s+/, '').trim();

    const found = antennasList.find(a => {
      const normCode = normalizeForMatch(a.code);
      const normNom = normalizeForMatch(a.nom);
      const cleanNom = normNom.replace(/^antenne\s+/, '').trim();

      return (
        cleanExcel === normCode ||
        cleanExcel === cleanNom ||
        normExcel.includes(normCode) ||
        normExcel.includes(cleanNom) ||
        normNom.includes(cleanExcel)
      );
    });
    return found ? found.id : null;
  };

  // Pre-resolve antenne and niveau properties on items
  for (const item of uniqueItems) {
    if (!item.antenneId && (item as any).antenne) {
      const matchedId = matchAntenne((item as any).antenne);
      if (matchedId) {
        item.antenneId = matchedId;
      }
    }

    let resolvedNomenclature: NomenclatureMapValue | null = null;
    if (item.nomenclatureId) {
      resolvedNomenclature = nomenclatureIndex.byId.get(Number(item.nomenclatureId)) ?? null;
    }
    if (!resolvedNomenclature && item.libelleProduitBrut) {
      resolvedNomenclature = resolveNomenclature(nomenclatureIndex, item.libelleProduitBrut);
    }
    if (resolvedNomenclature) {
      item.nomenclatureId = resolvedNomenclature.id;
      if (!item.niveau) item.niveau = resolvedNomenclature.niveau;
    }
  }

  // Create ImportFichier log record
  const importFichier = await importFichierRepository.createImportFichier({
    nomFichier: payload.nomFichier,
    typeFichier: payload.typeFichier,
    auteurId: payload.auteurId,
    periodeDebut: payload.periodeDebut,
    periodeFin: payload.periodeFin,
    nbLignesLues: payload.items.length,
    nbLignesTraitees: 0,
    nbErreurs: 0,
    statut: 'EN_COURS',
  });

  const transactionsToCreate: any[] = [];

  // 3.5 Pre-create missing temporary students in bulk
  const missingMatricules: { matriculeTresorPay: string; nom: string; prenom: string; antenneId?: number; filiere?: string }[] = [];
  const seenMissing = new Set<string>();

  for (const item of uniqueItems) {
    const matCandidate = normalizeLookupKey(item.matriculeTresorPay || (item as any).matricule || item.etudiantMatricule || '');
    if (matCandidate && !etudiantMap.has(matCandidate) && !seenMissing.has(matCandidate)) {
      seenMissing.add(matCandidate);
      const payeurName = item.nomPayeurBrut || 'Payeur Inconnu';
      const parts = payeurName.trim().split(/\s+/);
      const nom = parts[0] || 'TRESORPAY';
      const prenom = parts.slice(1).join(' ') || 'PAYEUR';

      missingMatricules.push({
        matriculeTresorPay: matCandidate,
        nom,
        prenom,
        antenneId: item.antenneId ?? undefined,
        filiere: item.filiere ?? undefined,
      });
    }
  }

  if (missingMatricules.length > 0) {
    logger.info({ count: missingMatricules.length }, 'Bulk creating temporary students');
    for (let i = 0; i < missingMatricules.length; i += ETUDIANT_BATCH_SIZE) {
      const chunk = missingMatricules.slice(i, i + ETUDIANT_BATCH_SIZE);
      try {
        const createdStudents = await fetchEtudiantJson<ResolvedEtudiant[]>('/tresor-pay/batch-temporary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ items: chunk }),
        }, []);

        if (Array.isArray(createdStudents)) {
          for (const s of createdStudents) {
            addResolvedEtudiant(etudiantMap, s);
          }
        }
      } catch (err) {
        logger.error(err, 'Failed to bulk create temporary students chunk');
      }
    }

    const stillMissing = missingMatricules
      .map((item) => item.matriculeTresorPay)
      .filter((matricule) => !etudiantMap.has(matricule));

    if (stillMissing.length > 0) {
      logger.warn({ count: stillMissing.length }, 'Resolving temporary students after bulk creation');
      await resolveEtudiantsInChunks(stillMissing, etudiantMap);
    }
  }

  // 4. Map transactions with pre-resolved relations
  for (const item of uniqueItems) {
    try {
      let etudiantId = item.etudiantId;
      let antenneId = item.antenneId;
      let nomenclatureId = item.nomenclatureId;
      let typeFluxId = item.typeFluxId;
      let montantAttendu: number | string | bigint | null = null;
      let filiere = item.filiere ?? null;
      let niveau = item.niveau ?? null;
      let versement = item.versement ?? null;
      let typeFrais = item.typeFrais ?? null;

      const matCandidate = normalizeLookupKey(item.matriculeTresorPay || (item as any).matricule || item.etudiantMatricule || '');
      if (!etudiantId && matCandidate) {
        if (etudiantMap.has(matCandidate)) {
          const resolved = etudiantMap.get(matCandidate)!;
          etudiantId = resolved.id;
          if (!antenneId) antenneId = resolved.antenneId;
        } else {
          errors.push(`${item.refTresor}: étudiant non résolu pour le matricule Trésor Pay ${matCandidate}`);
        }
      }

      let resolvedNomenclature: NomenclatureMapValue | null = null;
      if (nomenclatureId) {
        resolvedNomenclature = nomenclatureIndex.byId.get(Number(nomenclatureId)) ?? null;
      }

      if (!resolvedNomenclature) {
        let statutId = null;
        let promotionId = null;
        if (etudiantId && etudiantMap.has(matCandidate)) {
          const resolved = etudiantMap.get(matCandidate)!;
          statutId = resolved.statutId ?? null;
          promotionId = resolved.promotionId ?? null;
        }
        resolvedNomenclature = resolveNomenclature(nomenclatureIndex, item.libelleProduitBrut, {
          statutId,
          promotionId,
          typeRecette: item.typeRecette,
          promotion: item.niveau,
        });
      }

      if (resolvedNomenclature) {
        const resolved = resolvedNomenclature;
        nomenclatureId = resolved.id;
        typeFluxId = resolved.typeFluxId;
        montantAttendu = resolved.montant ?? null;
        filiere = filiere ?? resolved.filiere ?? null;
        niveau = niveau ?? resolved.niveau ?? null;
        versement = versement ?? resolved.versement ?? null;
        typeFrais = typeFrais ?? resolved.typeFrais ?? null;
      }

      if (!resolvedNomenclature && item.libelleProduitBrut) {
        errors.push(`${item.refTresor}: nomenclature active non trouvée pour le libellé "${item.libelleProduitBrut}"`);
      }

      transactionsToCreate.push({
        refTresor: item.refTresor.trim(),
        dateHeure: new Date(item.dateHeure),
        montant: BigInt(item.montant),
        montantAttendu: montantAttendu !== null && montantAttendu !== undefined ? BigInt(montantAttendu) : null,
        etudiantId: etudiantId ?? null,
        antenneId: antenneId ?? null,
        nomenclatureId: nomenclatureId ?? null,
        typeFluxId: typeFluxId ?? null,
        importId: importFichier.id,
        ordreTraitementId: item.ordreTraitementId ?? null,
        mois: item.mois ?? null,
        nomPayeurBrut: item.nomPayeurBrut?.trim() ?? null,
        contactPayeur: item.contactPayeur?.trim() ?? null,
        libelleProduitBrut: item.libelleProduitBrut?.trim() ?? null,
        filiere: filiere?.trim() ?? null,
        niveau: niveau?.trim() ?? null,
        versement: versement?.trim() ?? null,
        typeFrais: typeFrais?.trim() ?? null,
        statutTraitement: item.ordreTraitementId ? 'AFFECTE' : (nomenclatureId ? 'IMPORTE' : 'NON_CLASSIFIE'),
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(`${item.refTresor}: ${message}`);
    }
  }

  // 5. Execute DB bulk insertion in chunks of 5000 to avoid giant single SQL query overhead
  let importedCount = 0;
  let dbDuplicatesCount = 0;
  const chunkSize = 5000;
  if (transactionsToCreate.length > 0) {
    try {
      for (let i = 0; i < transactionsToCreate.length; i += chunkSize) {
        const chunk = transactionsToCreate.slice(i, i + chunkSize);
        const dbResult = await prisma.transaction.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        importedCount += dbResult.count;
        dbDuplicatesCount += (chunk.length - dbResult.count);
      }
    } catch (err) {
      logger.error(err, 'Bulk transaction insertion failed');
      errors.push(`BulkInsertError: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const duplicatesCount = fileDuplicatesCount + dbDuplicatesCount;

  // Update ImportFichier log record
  await importFichierRepository.updateImportFichier(importFichier.id, {
    nbLignesTraitees: importedCount,
    nbErreurs: errors.length,
    statut: errors.length > 0 ? 'TERMINE_AVEC_ERREURS' : 'TERMINE',
    logsErreurs: errors.length > 0 ? errors.join('\n') : null,
  });

  importCounter.inc({ status: errors.length > 0 ? 'partial' : 'success' });
  await invalidateKpiCache();
  return { imported: importedCount, duplicatesSkipped: duplicatesCount, importId: importFichier.id };
};

export const getTransactions = async (query: any) => {
  const limit = parseInt(query.limit as string, 10) || 20;
  const offset = parseInt(query.offset as string, 10) || 0;
  const sortBy = (query.sortBy as string) || 'dateHeure';
  const sortOrder = (query.sortOrder as 'asc' | 'desc') || 'desc';

  let totalOverride: number | undefined;
  let actualOffset = offset;
  if (query.ids) {
    const parsedIds = Array.isArray(query.ids)
      ? query.ids.map(Number)
      : String(query.ids).split(',').filter(Boolean).map(Number);
    
    totalOverride = parsedIds.length;
    query.ids = parsedIds.slice(offset, offset + limit);
    actualOffset = 0;
  }

  const where = await buildTransactionWhereClause(query);

  const [list, total, sums] = await Promise.all([
    transactionRepository.findTransactions(limit, actualOffset, where, sortBy, sortOrder),
    totalOverride !== undefined ? Promise.resolve(totalOverride) : transactionRepository.countTransactions(where),
    prisma.transaction.groupBy({
      by: ['typeFluxId'],
      where,
      _sum: {
        montant: true
      }
    })
  ]);

  const typeFluxMap = await fetchTypeFluxMap();

  // Aggregate totals from the dynamic TypeFlux referential.
  let totalBudget = 0n;
  let totalHorsBudget = 0n;
  let totalNonClassifie = 0n;
  for (const s of sums) {
    const amount = s._sum.montant || 0n;
    const flux = s.typeFluxId ? typeFluxMap.get(s.typeFluxId) : undefined;
    if (flux?.kind === 'budget') totalBudget += amount;
    else if (flux?.kind === 'hors-budget') totalHorsBudget += amount;
    else totalNonClassifie += amount;
  }
  const totals = {
    budget: Number(totalBudget),
    horsBudget: Number(totalHorsBudget),
    nonClassifie: Number(totalNonClassifie),
    total: Number(totalBudget + totalHorsBudget + totalNonClassifie)
  };

  // Cross-service resolution
  const etudiantMap = new Map<number, any>();
  const nomenclatureMap = new Map<number, any>();

  const etudiantIds = Array.from(new Set(list.map(tx => tx.etudiantId).filter((id): id is number => id !== null)));
  const nomenclatureIds = Array.from(new Set(list.map(tx => tx.nomenclatureId).filter((id): id is number => id !== null)));

  if (etudiantIds.length > 0) {
    try {
      const etudiant = await fetchEtudiantJson<any[]>('/batch-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: etudiantIds })
      }, []);
      if (Array.isArray(etudiant)) {
        for (const s of etudiant) {
          etudiantMap.set(s.id, s);
        }
      }
    } catch (err) {
      logger.warn(err, 'Failed to batch lookup etudiant by IDs in getTransactions');
    }
  }

  if (nomenclatureIds.length > 0) {
    try {
      const noms = await fetchEtudiantJson<any[]>('/nomenclatures', undefined, []);
      if (Array.isArray(noms)) {
        for (const n of noms) {
          nomenclatureMap.set(n.id, n);
        }
      }
    } catch (err) {
      logger.warn(err, 'Failed to fetch nomenclatures in getTransactions');
    }
  }

  const enrichedList = list.map(tx => ({
    ...tx,
    montant: Number(tx.montant),
    montantAttendu: tx.montantAttendu !== null && tx.montantAttendu !== undefined ? Number(tx.montantAttendu) : null,
    etudiant: tx.etudiantId ? etudiantMap.get(tx.etudiantId) || null : null,
    nomenclature: tx.nomenclatureId ? nomenclatureMap.get(tx.nomenclatureId) || null : null,
    typeFlux: tx.typeFluxId ? typeFluxMap.get(tx.typeFluxId) || null : null
  }));

  return { list: enrichedList, total, limit, offset, totals };
};

export const getUnassignedTransactions = async (dateDebut?: string, dateFin?: string) => {
  return transactionRepository.findUnassignedHorsBudget(dateDebut, dateFin);
};

export const linkTransactionsToOt = async (ordreTraitementId: number, codeOt: string, transactionIds: number[]) => {
  await ordreTraitementMiroirRepository.upsertOrdreTraitementMiroir(ordreTraitementId, codeOt, 'Brouillon');

  const alreadyLinked = await transactionRepository.findAlreadyLinkedTransaction(transactionIds);
  if (alreadyLinked) {
    throw new AppError(
      400,
      `Transaction ${alreadyLinked.id.toString()} is already assigned to OT ${alreadyLinked.ordreTraitementId}`,
    );
  }

  const count = await transactionRepository.linkTransactionsToOt(transactionIds, ordreTraitementId);
  await invalidateKpiCache();
  return { message: 'Linked successfully', updatedCount: count };
};

export const unlinkTransactionsFromOt = async (ordreTraitementId: number) => {
  const count = await transactionRepository.unlinkTransactionsFromOt(ordreTraitementId);
  return { message: 'Unlinked successfully', count };
};

export const syncOtStatus = async (ordreTraitementId: number, codeOt: string, statut: string) => {
  return ordreTraitementMiroirRepository.upsertOrdreTraitementMiroir(ordreTraitementId, codeOt, statut);
};

export const lockTransactions = async (payload: LockTransactionsInput) => {
  if (payload.ordreTraitementId && payload.codeOt) {
    await ordreTraitementMiroirRepository.upsertOrdreTraitementMiroir(
      payload.ordreTraitementId,
      payload.codeOt,
      payload.statut,
    );
  }

  const updatedCount = await transactionRepository.lockTransactions({
    transactionIds: payload.transactionIds,
    ordreTraitementId: payload.ordreTraitementId,
  });

  await invalidateKpiCache();
  return {
    message: 'Transactions locked successfully',
    updatedCount,
  };
};

export const updateTransaction = async (id: number, data: any) => {
  const existing = await transactionRepository.findTransactionById(id);
  if (!existing) {
    throw new AppError(404, 'Transaction not found');
  }
  if (existing.gele) {
    throw new AppError(403, 'Modification refusee : la transaction est gelee par un ordre de traitement.');
  }

  const { ordreTraitementId, ordreTraitement, codeOt, ...cleanData } = data;
  if (cleanData.montant !== undefined) {
    cleanData.montant = BigInt(cleanData.montant);
  }
  const transaction = await transactionRepository.updateTransaction(id, cleanData);
  await invalidateKpiCache();
  return transaction;
};

export const deleteTransaction = async (id: number) => {
  const existing = await transactionRepository.findTransactionById(id);
  if (!existing) {
    throw new AppError(404, 'Transaction not found');
  }
  if (existing.gele) {
    throw new AppError(403, 'Suppression refusee : la transaction est gelee par un ordre de traitement.');
  }

  const transaction = await transactionRepository.deleteTransaction(id);
  await invalidateKpiCache();
  return transaction;
};

export const mergeEtudiants = async (oldEtudiantId: number, newEtudiantId: number) => {
  const count = await transactionRepository.updateTransactionsEtudiantId(oldEtudiantId, newEtudiantId);
  await invalidateKpiCache();
  logger.info({ oldEtudiantId, newEtudiantId, count }, 'Merged etudiant transactions');
  return count;
};

export const getTransactionsByOtCode = async (codeOt: string) => {
  const mirror = await ordreTraitementMiroirRepository.findOrdreTraitementMiroirByCode(codeOt);
  if (!mirror) {
    throw new AppError(404, `Ordre de traitement ${codeOt} non trouvé.`);
  }

  return transactionRepository.findTransactionsByOtId(mirror.id);
};

export const transmitOtTransactions = async (codeOt: string) => {
  const mirror = await ordreTraitementMiroirRepository.findOrdreTraitementMiroirByCode(codeOt);
  if (!mirror) {
    throw new AppError(404, `Ordre de traitement ${codeOt} non trouvé.`);
  }

  const transactions = await transactionRepository.findTransactionsByOtId(mirror.id);
  if (transactions.length === 0) {
    throw new AppError(400, "Aucune transaction associée à cet ordre de traitement.");
  }

  // Fetch type-flux references to check they are all budget
  const fluxList = await fetchEtudiantJson<any[]>('/types-flux', undefined, []);
  const fluxMap = new Map<number, any>(fluxList.map(f => [f.id, f]));

  // Check validations:
  // 1. Le circuit bordereau/OP traite uniquement les flux hors-budget.
  const { resolveFluxKind } = require('../utils/typeFlux');
  for (const tx of transactions) {
    const fluxId = tx.typeFluxId;
    const flux = fluxId ? fluxMap.get(fluxId) : null;
    const kind = resolveFluxKind(flux, fluxId);
    if (kind !== 'hors-budget') {
      throw new AppError(400, `La transaction ${tx.refTresor} n'est pas de type hors-budget.`);
    }
  }

  // 2. None of the transactions must be already transmitted
  for (const tx of transactions) {
    if (tx.statutTraitement === 'TRANSMIS') {
      throw new AppError(400, `La transaction ${tx.refTresor} a déjà été transmise.`);
    }
  }

  // Update all transactions to TRANSMIS and gele = true
  const count = await transactionRepository.transmitTransactionsByOtId(mirror.id);
  await invalidateKpiCache();

  // Return the updated transactions list
  const updatedTransactions = await transactionRepository.findTransactionsByOtId(mirror.id);
  return {
    message: 'Transactions transmises avec succès',
    count,
    transactions: updatedTransactions
  };
};
