import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import { buildTransactionWhereClause } from '../utils/filterBuilder';
import { Prisma, Transaction } from '@prisma/client/index';
import { buildKpiCacheKey, getCachedKpis, setCachedKpis } from '../services/kpiCacheService';
import { buildWorkbook, getWorkbookContentType, type WorkbookFormat, type WorkbookSheet } from '../services/excelExportService';
import { fetchEtudiantJson } from '../utils/etudiantServiceClient';
import { buildFluxMeta, type FluxMeta } from '../utils/typeFlux';

const normalizeExportFormat = (format: unknown): WorkbookFormat =>
  String(format ?? 'xlsx').toLowerCase() === 'xls' ? 'xls' : 'xlsx';

type SyntheseScope = 'budget' | 'hors-budget' | 'both';

const normalizeSyntheseScope = (scope: unknown): SyntheseScope => {
  const value = String(scope ?? 'both').toLowerCase();
  if (value === 'budget') return 'budget';
  if (value === 'hors-budget' || value === 'horsbudget' || value === 'hors_budget') return 'hors-budget';
  return 'both';
};

const normalizeAndSortWords = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ieme/g, 'eme')
    .replace(/1er/g, '1')
    .replace(/1ere/g, '1')
    .replace(/2eme/g, '2')
    .replace(/3eme/g, '3')
    .replace(/l1/g, 'licence1')
    .replace(/l2/g, 'licence2')
    .replace(/l3/g, 'licence3')
    .replace(/d'/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w !== '' && w !== 'frais' && w !== 'de' && w !== 'du' && w !== 'des')
    .sort()
    .join('');
};

const sendWorkbook = (res: Response, filename: string, format: WorkbookFormat, sheets: WorkbookSheet[]) => {
  const workbook = buildWorkbook(sheets, format);
  res.setHeader('Content-Type', getWorkbookContentType(format));
  res.setHeader('Content-Disposition', `attachment; filename=${filename}_${Date.now()}.${format}`);
  res.send(workbook);
};

const DETAIL_TRANSACTION_ID_LIMIT = 200;

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
    logger.warn(err, 'Failed to fetch type flux referential from etudiant-service');
    return new Map();
  }
};

const getFluxMeta = (
  typeFluxMap: Map<number, FluxMeta>,
  typeFluxId?: number | null,
  embeddedFlux?: unknown,
): FluxMeta => {
  const id = typeFluxId ? Number(typeFluxId) : null;
  if (embeddedFlux && typeof embeddedFlux === 'object') {
    return buildFluxMeta(embeddedFlux as any, id);
  }
  if (id && typeFluxMap.has(id)) {
    return typeFluxMap.get(id)!;
  }
  return buildFluxMeta(null, id);
};

/**
 * Récupère les KPIs pour le dashboard.
 */
export const getKpis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = buildKpiCacheKey(req.query as Record<string, unknown>);
    const cached = await getCachedKpis(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.json(cached);
      return;
    }
    res.setHeader('X-Cache', 'MISS');

    const { dateDebut, dateFin, antenneId } = req.query;

    const where: any = {};

    if (dateDebut || dateFin) {
      where.dateHeure = {};
      if (dateDebut) {
        where.dateHeure.gte = new Date(dateDebut as string);
      }
      if (dateFin) {
        where.dateHeure.lte = new Date(dateFin as string);
      }
    }

    if (antenneId) {
      const aid = parseInt(antenneId as string, 10);
      if (!isNaN(aid)) {
        where.antenneId = aid;
      }
    }

    const typeFluxMap = await fetchTypeFluxMap();

    // Count non-classified transactions count (where statutTraitement = 'NON_CLASSIFIE')
    const nonClassifieCount = await prisma.transaction.count({
      where: {
        ...where,
        statutTraitement: 'NON_CLASSIFIE',
      },
    });

    // Récupérer les nomenclatures depuis etudiant-service
    const nomMap = new Map<number, { libelleStandard: string; flux: FluxMeta }>();
    const nomByLibelleMap = new Map<string, { libelleStandard: string; flux: FluxMeta }>();
    let nomenclatures: any[] = [];
    try {
      const result = await fetchEtudiantJson<any[]>('/nomenclatures', undefined, []);
      if (Array.isArray(result)) {
        nomenclatures = result;
        for (const nom of nomenclatures) {
          const typeFluxId = nom.typeRecette?.typeFluxId ?? nom.typeRecette?.typeFlux?.id ?? null;
          const meta = {
            libelleStandard: nom.libelleStandard,
            flux: getFluxMeta(typeFluxMap, typeFluxId, nom.typeRecette?.typeFlux),
          };
          nomMap.set(nom.id, meta);
          if (nom.libelleBrut) {
            nomByLibelleMap.set(nom.libelleBrut.trim().toUpperCase(), meta);
            nomByLibelleMap.set(normalizeAndSortWords(nom.libelleBrut), meta);
          }
          if (nom.libelleStandard) {
            nomByLibelleMap.set(nom.libelleStandard.trim().toUpperCase(), meta);
            nomByLibelleMap.set(normalizeAndSortWords(nom.libelleStandard), meta);
          }
        }
      }
    } catch (err) {
      logger.warn(err, 'Failed to fetch nomenclatures from etudiant-service');
    }

    // Calculate Expected amounts by group
    let expectedBudget = 0;
    let expectedHorsBudget = 0;
    try {
      const studentGroups = await fetchEtudiantJson<any[]>('/stats/groups', undefined, []);
      if (Array.isArray(studentGroups) && nomenclatures.length > 0) {
        for (const group of studentGroups) {
          const count = group._count?.id || 0;
          for (const nom of nomenclatures) {
            if (!nom.actif) continue;
            const promotionMatches = nom.promotionId === null || nom.promotionId === undefined || nom.promotionId === group.promotionId;
            const statutMatches = nom.statutId === null || nom.statutId === undefined || nom.statutId === group.statutId;
            if (promotionMatches && statutMatches) {
              const typeFluxId = nom.typeRecette?.typeFluxId ?? nom.typeRecette?.typeFlux?.id ?? null;
              const flux = getFluxMeta(typeFluxMap, typeFluxId, nom.typeRecette?.typeFlux);
              const amount = Number(nom.montant ?? 0) * count;
              if (flux.kind === 'budget') {
                expectedBudget += amount;
              } else if (flux.kind === 'hors-budget') {
                expectedHorsBudget += amount;
              }
            }
          }
        }
      }
    } catch (err) {
      logger.warn(err, 'Failed to calculate expected amounts for KPIs');
    }

    const grouped = await prisma.transaction.groupBy({
      by: ['typeFluxId', 'nomenclatureId', 'libelleProduitBrut', 'ordreTraitementId'],
      where,
      _sum: {
        montant: true,
      },
    });

    let totalBudget = 0n;
    let totalHorsBudget = 0n;
    let totalNonClassifie = 0n;
    let unassignedBudget = 0n;
    let unassignedHorsBudget = 0n;
    let unassignedNonClassifie = 0n;
    const byLibelleMap = new Map<string, { libelle: string; type: string; montant: bigint }>();

    for (const group of grouped) {
      const sumMontant = group._sum?.montant || 0n;
      const isUnassigned = !group.ordreTraitementId;
      let nom = group.nomenclatureId ? nomMap.get(group.nomenclatureId) : undefined;
      if (!nom && group.libelleProduitBrut) {
        nom = nomByLibelleMap.get(group.libelleProduitBrut.trim().toUpperCase()) ||
              nomByLibelleMap.get(normalizeAndSortWords(group.libelleProduitBrut));
      }
      const flux = nom?.flux ?? getFluxMeta(typeFluxMap, group.typeFluxId);
      if (flux.kind === 'budget') {
        totalBudget += sumMontant;
        if (isUnassigned) unassignedBudget += sumMontant;
      } else if (flux.kind === 'hors-budget') {
        totalHorsBudget += sumMontant;
        if (isUnassigned) unassignedHorsBudget += sumMontant;
      } else {
        totalNonClassifie += sumMontant;
        if (isUnassigned) unassignedNonClassifie += sumMontant;
      }

      let libelle = group.libelleProduitBrut || 'Autre Recette';
      let typeStr = flux.label;

      if (nom) {
        libelle = nom.libelleStandard;
        typeStr = nom.flux.label;
      }

      const key = `${libelle}-${typeStr}`;
      const existing = byLibelleMap.get(key);
      if (existing) {
        existing.montant += sumMontant;
      } else {
        byLibelleMap.set(key, { libelle, type: typeStr, montant: sumMontant });
      }
    }

    const byLibelle = Array.from(byLibelleMap.values()).map((item) => ({
      libelle: item.libelle,
      type: item.type,
      montant: Number(item.montant),
    }));

    const resteBudget = Math.max(0, expectedBudget - Number(totalBudget));
    const resteHorsBudget = Math.max(0, expectedHorsBudget - Number(totalHorsBudget));

    const payload = {
      totalBudget: Number(totalBudget),
      totalHorsBudget: Number(totalHorsBudget),
      totalNonClassifie: Number(totalNonClassifie),
      unassignedBudget: Number(unassignedBudget),
      unassignedHorsBudget: Number(unassignedHorsBudget),
      unassignedNonClassifie: Number(unassignedNonClassifie),
      nonClassifieCount: Number(nonClassifieCount),
      expectedBudget,
      expectedHorsBudget,
      resteBudget,
      resteHorsBudget,
      byLibelle,
    };

    await setCachedKpis(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

/**
 * Exporte les transactions sous forme de classeur Excel.
 */
export const exportTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const where = await buildTransactionWhereClause(req.query);
    const format = normalizeExportFormat(req.query.format);

    // 1. Fetch common referentials once
    const antenneMap = new Map<number, string>();
    const typeFluxMap = new Map<number, string>();
    const nomenclatureMap = new Map<number, string>();

    try {
      const [antennes, flux, nomenclatures] = await Promise.all([
        fetchEtudiantJson<any[]>('/antennes', undefined, []),
        fetchEtudiantJson<any[]>('/types-flux', undefined, []),
        fetchEtudiantJson<any[]>('/nomenclatures', undefined, [])
      ]);

      if (Array.isArray(antennes)) {
        for (const a of antennes) antenneMap.set(a.id, a.nom);
      }
      if (Array.isArray(flux)) {
        for (const f of flux) typeFluxMap.set(f.id, f.libelle);
      }
      if (Array.isArray(nomenclatures)) {
        for (const n of nomenclatures) nomenclatureMap.set(n.id, n.libelleStandard);
      }
    } catch (err) {
      logger.warn(err, 'Failed to fetch static referentials in exportTransactions');
    }

    const otMap = new Map<number, string>();
    try {
      const ots = await prisma.ordreTraitementMiroir.findMany();
      for (const ot of ots) {
        otMap.set(ot.id, ot.codeOt);
      }
    } catch (err) {
      logger.warn(err, 'Failed to fetch OTs in exportTransactions');
    }

    const headers = [
      'Référence Trésor',
      'Date/Heure',
      'Montant',
      'Étudiant',
      'Promotion',
      'Antenne',
      'Nomenclature',
      'Type de flux',
      'Payeur',
      'Contact payeur',
      'Libellé produit',
      'Statut'
    ];

    const excelRows: Array<Array<string | number>> = [];
    let cursor: bigint | undefined = undefined;
    const batchSize = 5000;

    while (true) {
      const transactions: Transaction[] = await prisma.transaction.findMany({
        where,
        take: batchSize,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
      });

      if (transactions.length === 0) break;

      // Batch resolve etudiant IDs for this chunk
      const etudiantIds = Array.from(
        new Set(
          transactions
            .map((t: Transaction) => t.etudiantId)
            .filter((id: number | null): id is number => id !== null)
        )
      );
      const etudiantMap = new Map<number, any>();
      if (etudiantIds.length > 0) {
        try {
          const etudiant = await fetchEtudiantJson<any[]>('/batch-ids', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: etudiantIds }),
          }, []);
          for (const s of etudiant) {
            etudiantMap.set(s.id, s);
          }
        } catch (err) {
          logger.warn(err, 'Failed to batch fetch etudiant from etudiant-service during export batch');
        }
      }

      for (const tx of transactions) {
        const etudiant = tx.etudiantId ? etudiantMap.get(tx.etudiantId) : null;
        const etudiantName = etudiant
          ? `${etudiant.matricule} - ${etudiant.nom} ${etudiant.prenom}`
          : tx.etudiantId
          ? `ID: ${tx.etudiantId}`
          : '';
        const antenneName = tx.antenneId
          ? antenneMap.get(tx.antenneId) || etudiant?.antenne?.nom || `ID: ${tx.antenneId}`
          : '';
        const nomenclatureLibelle = tx.nomenclatureId
          ? nomenclatureMap.get(tx.nomenclatureId) || `ID: ${tx.nomenclatureId}`
          : '';
        const typeFluxLibelle = tx.typeFluxId
          ? typeFluxMap.get(tx.typeFluxId) || `ID: ${tx.typeFluxId}`
          : '';
        const otCode = tx.ordreTraitementId ? otMap.get(tx.ordreTraitementId) || `ID: ${tx.ordreTraitementId}` : '';

        const row = [
          tx.refTresor,
          tx.dateHeure.toLocaleString('fr-FR', { timeZone: 'UTC' }),
          Number(tx.montant),
          etudiantName,
          etudiant?.promotionString || etudiant?.promotion?.nom || '',
          antenneName,
          nomenclatureLibelle,
          typeFluxLibelle,
          tx.nomPayeurBrut || '',
          tx.contactPayeur || '',
          tx.libelleProduitBrut || '',
          tx.statutTraitement
        ];

        excelRows.push(row);
      }

      cursor = transactions[transactions.length - 1].id;
    }

    sendWorkbook(res, 'transactions_export', format, [
      {
        name: 'Transactions',
        headers,
        rows: excelRows,
        currencyColumns: [2],
        widths: [22, 22, 14, 34, 18, 22, 34, 18, 22, 28, 34, 18],
      },
    ]);
  } catch (err) {
    next(err);
  }
};

export const getGroupedByRecette = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const where = await buildTransactionWhereClause(req.query);
    const typeFluxMap = await fetchTypeFluxMap();

    // Fetch nomenclatures from etudiant-service
    const nomMap = new Map<number, { id: number; libelle: string; typeRecetteLibelle: string; flux: FluxMeta }>();
    const nomByLibelleMap = new Map<string, { id: number; libelle: string; typeRecetteLibelle: string; flux: FluxMeta }>();
    try {
      const nomenclatures = await fetchEtudiantJson<any[]>('/nomenclatures', undefined, []);
      if (Array.isArray(nomenclatures)) {
        for (const nom of nomenclatures) {
          const typeFluxId = nom.typeRecette?.typeFluxId ?? nom.typeRecette?.typeFlux?.id ?? null;
          const flux = getFluxMeta(typeFluxMap, typeFluxId, nom.typeRecette?.typeFlux);
          const meta = {
            id: nom.id,
            libelle: nom.libelle,
            typeRecetteLibelle: nom.typeRecette?.libelle || 'Autre',
            flux,
          };
          nomMap.set(nom.id, meta);
          if (nom.libelle) {
            nomByLibelleMap.set(nom.libelle.trim().toUpperCase(), meta);
            nomByLibelleMap.set(normalizeAndSortWords(nom.libelle), meta);
          }
        }
      }
    } catch (err) {
      logger.warn(err, 'Failed to fetch nomenclatures from etudiant-service');
    }

    const grouped = await prisma.transaction.groupBy({
      by: ['nomenclatureId', 'typeFluxId', 'libelleProduitBrut'],
      where,
      _sum: {
        montant: true,
      },
      _count: {
        _all: true,
      },
    });

    // Grouping structure: key is nomenclatureId (or raw libelle if null)
    // We map it to: { libelle, typeRecette, typeFluxCode, montantBudget, montantHorsBudget, montantTotal, nombreFlux, transactionIds }
    const resultsMap = new Map<string, {
      nomenclatureId: number | null;
      libelle: string;
      typeRecette: string;
      typeFluxCode: string;
      montantBudget: bigint;
      montantHorsBudget: bigint;
      montantNonClassifie: bigint;
      montantTotal: bigint;
      nombreFlux: number;
      transactionIds: number[];
    }>();

    const appendSampleTransactionIds = async (
      groupWhere: Prisma.TransactionWhereInput,
      target: { transactionIds: number[] },
    ) => {
      const remaining = DETAIL_TRANSACTION_ID_LIMIT - target.transactionIds.length;
      if (remaining <= 0) return;

      const ids = await prisma.transaction.findMany({
        where: groupWhere,
        select: { id: true },
        orderBy: { dateHeure: 'desc' },
        take: remaining,
      });

      target.transactionIds.push(...ids.map((item) => Number(item.id)));
    };

    for (const group of grouped) {
      const sumMontant = group._sum?.montant || 0n;
      const fluxCount = group._count?._all || 0;

      let key = '';
      let libelle = '';
      let typeRecette = '';
      let nomenclatureId: number | null = null;
      let flux = getFluxMeta(typeFluxMap, group.typeFluxId);

      let matchedNom = group.nomenclatureId ? nomMap.get(group.nomenclatureId) : null;
      if (!matchedNom && group.libelleProduitBrut) {
        matchedNom = nomByLibelleMap.get(group.libelleProduitBrut.trim().toUpperCase()) ||
                     nomByLibelleMap.get(normalizeAndSortWords(group.libelleProduitBrut));
      }

      if (matchedNom) {
        nomenclatureId = matchedNom.id;
        libelle = matchedNom.libelle;
        typeRecette = matchedNom.typeRecetteLibelle;
        flux = matchedNom.flux;
        key = `nom-${matchedNom.id}`;
      } else {
        libelle = group.libelleProduitBrut || 'Autre Recette';
        typeRecette = 'Non classifié';
        key = `raw-${libelle}`;
      }

      const groupWhere: Prisma.TransactionWhereInput = {
        ...where,
        nomenclatureId: group.nomenclatureId,
        typeFluxId: group.typeFluxId,
        libelleProduitBrut: group.libelleProduitBrut,
      };

      const existing = resultsMap.get(key);
      if (existing) {
        if (flux.kind === 'budget') {
          existing.montantBudget += sumMontant;
        } else if (flux.kind === 'hors-budget') {
          existing.montantHorsBudget += sumMontant;
        } else {
          existing.montantNonClassifie += sumMontant;
        }
        existing.montantTotal += sumMontant;
        existing.nombreFlux += fluxCount;
        await appendSampleTransactionIds(groupWhere, existing);
      } else {
        const entry = {
          nomenclatureId,
          libelle,
          typeRecette,
          typeFluxCode: flux.code || (flux.kind === 'budget' ? 'BUDGET' : flux.kind === 'hors-budget' ? 'HORS_BUDGET' : 'UNKNOWN'),
          montantBudget: flux.kind === 'budget' ? sumMontant : 0n,
          montantHorsBudget: flux.kind === 'hors-budget' ? sumMontant : 0n,
          montantNonClassifie: flux.kind === 'unknown' ? sumMontant : 0n,
          montantTotal: sumMontant,
          nombreFlux: fluxCount,
          transactionIds: [],
        };
        await appendSampleTransactionIds(groupWhere, entry);
        resultsMap.set(key, entry);
      }
    }

    const results = Array.from(resultsMap.values()).map((r) => ({
      nomenclatureId: r.nomenclatureId,
      libelle: r.libelle,
      typeRecette: r.typeRecette,
      typeFluxCode: r.typeFluxCode,
      montantBudget: Number(r.montantBudget),
      montantHorsBudget: Number(r.montantHorsBudget),
      montantNonClassifie: Number(r.montantNonClassifie),
      montantTotal: Number(r.montantTotal),
      nombreFlux: r.nombreFlux,
      transactionIds: r.transactionIds,
    }));

    res.json(results);
  } catch (err) {
    next(err);
  }
};

/**
 * Exporte la synthèse des recettes sous forme de classeur Excel.
 */
export const exportSynthese = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const where = await buildTransactionWhereClause(req.query);
    const format = normalizeExportFormat(req.query.format);
    const scope = normalizeSyntheseScope(req.query.scope ?? req.query.segment);
    const typeFluxMap = await fetchTypeFluxMap();

    // Fetch nomenclatures from etudiant-service
    const nomMap = new Map<number, { id: number; libelleStandard: string; typeRecetteLibelle: string; flux: FluxMeta }>();
    const nomByLibelleMap = new Map<string, { id: number; libelleStandard: string; typeRecetteLibelle: string; flux: FluxMeta }>();
    try {
      const nomenclatures = await fetchEtudiantJson<any[]>('/nomenclatures', undefined, []);
      if (Array.isArray(nomenclatures)) {
        for (const nom of nomenclatures) {
          const typeFluxId = nom.typeRecette?.typeFluxId ?? nom.typeRecette?.typeFlux?.id ?? null;
          const flux = getFluxMeta(typeFluxMap, typeFluxId, nom.typeRecette?.typeFlux);
          const meta = {
            id: nom.id,
            libelleStandard: nom.libelleStandard,
            typeRecetteLibelle: nom.typeRecette?.libelle || 'Autre',
            flux,
          };
          nomMap.set(nom.id, meta);
          if (nom.libelleBrut) {
            nomByLibelleMap.set(nom.libelleBrut.trim().toUpperCase(), meta);
            nomByLibelleMap.set(normalizeAndSortWords(nom.libelleBrut), meta);
          }
          if (nom.libelleStandard) {
            nomByLibelleMap.set(nom.libelleStandard.trim().toUpperCase(), meta);
            nomByLibelleMap.set(normalizeAndSortWords(nom.libelleStandard), meta);
          }
        }
      }
    } catch (err) {
      logger.warn(err, 'Failed to fetch nomenclatures from etudiant-service');
    }

    const grouped = await prisma.transaction.groupBy({
      by: ['nomenclatureId', 'typeFluxId', 'libelleProduitBrut'],
      where,
      _sum: {
        montant: true,
      },
    });

    const resultsMap = new Map<string, {
      libelleStandard: string;
      typeRecette: string;
      montantBudget: bigint;
      montantHorsBudget: bigint;
      montantNonClassifie: bigint;
      montantTotal: bigint;
    }>();

    for (const group of grouped) {
      const sumMontant = group._sum?.montant || 0n;

      let key = '';
      let libelleStandard = '';
      let typeRecette = '';
      let flux = getFluxMeta(typeFluxMap, group.typeFluxId);

      let matchedNom = group.nomenclatureId ? nomMap.get(group.nomenclatureId) : null;
      if (!matchedNom && group.libelleProduitBrut) {
        matchedNom = nomByLibelleMap.get(group.libelleProduitBrut.trim().toUpperCase()) ||
                     nomByLibelleMap.get(normalizeAndSortWords(group.libelleProduitBrut));
      }

      if (matchedNom) {
        libelleStandard = matchedNom.libelleStandard;
        typeRecette = matchedNom.typeRecetteLibelle;
        flux = matchedNom.flux;
        key = `nom-${matchedNom.id}`;
      } else {
        libelleStandard = group.libelleProduitBrut || 'Autre Recette';
        typeRecette = 'Non classifié';
        key = `raw-${libelleStandard}`;
      }

      const existing = resultsMap.get(key);
      if (existing) {
        if (flux.kind === 'budget') {
          existing.montantBudget += sumMontant;
        } else if (flux.kind === 'hors-budget') {
          existing.montantHorsBudget += sumMontant;
        } else {
          existing.montantNonClassifie += sumMontant;
        }
        existing.montantTotal += sumMontant;
      } else {
        resultsMap.set(key, {
          libelleStandard,
          typeRecette,
          montantBudget: flux.kind === 'budget' ? sumMontant : 0n,
          montantHorsBudget: flux.kind === 'hors-budget' ? sumMontant : 0n,
          montantNonClassifie: flux.kind === 'unknown' ? sumMontant : 0n,
          montantTotal: sumMontant,
        });
      }
    }

    const results = Array.from(resultsMap.values()).map((r) => ({
      typeRecette: r.typeRecette,
      libelleStandard: r.libelleStandard,
      montantBudget: Number(r.montantBudget),
      montantHorsBudget: Number(r.montantHorsBudget),
      montantNonClassifie: Number(r.montantNonClassifie),
      montantTotal: Number(r.montantTotal),
    }));

    const budgetHeaders = ['Type de recette', 'Nomenclature', 'Budget'];
    const horsBudgetHeaders = ['Type de recette', 'Nomenclature', 'Hors-Budget'];
    const nonClassifieHeaders = ['Type de recette', 'Nomenclature', 'Non classifié'];
    const budgetRows = results
      .filter((r) => r.montantBudget > 0)
      .map((r) => [r.typeRecette, r.libelleStandard, r.montantBudget]);
    const horsBudgetRows = results
      .filter((r) => r.montantHorsBudget > 0)
      .map((r) => [r.typeRecette, r.libelleStandard, r.montantHorsBudget]);
    const nonClassifieRows = results
      .filter((r) => r.montantNonClassifie > 0)
      .map((r) => [r.typeRecette, r.libelleStandard, r.montantNonClassifie]);

    const sheets: WorkbookSheet[] = [];
    if (scope === 'budget' || scope === 'both') {
      sheets.push({
        name: 'Budget',
        headers: budgetHeaders,
        rows: budgetRows,
        currencyColumns: [2],
        widths: [24, 42, 16],
      });
    }
    if (scope === 'hors-budget' || scope === 'both') {
      sheets.push({
        name: 'Hors Budget',
        headers: horsBudgetHeaders,
        rows: horsBudgetRows,
        currencyColumns: [2],
        widths: [24, 42, 16],
      });
    }
    if (scope === 'both' && nonClassifieRows.length > 0) {
      sheets.push({
        name: 'Non classifie',
        headers: nonClassifieHeaders,
        rows: nonClassifieRows,
        currencyColumns: [2],
        widths: [24, 42, 16],
      });
    }

    sendWorkbook(res, 'synthese_recettes_export', format, sheets);
  } catch (err) {
    next(err);
  }
};
