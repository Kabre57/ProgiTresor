import * as transactionRepository from '../repositories/transactionRepository';
import * as importFichierRepository from '../repositories/importFichierRepository';
import * as ordrePaiementMiroirRepository from '../repositories/ordrePaiementMiroirRepository';
import { AppError } from '../utils/errors';
import { importCounter } from '../utils/metrics';
import logger from '../utils/logger';
import type { ImportPayloadInput } from '../../../../../shared/types/transaction.types';
import { buildTransactionWhereClause } from '../utils/filterBuilder';
import { prisma } from '../utils/prisma';
import { invalidateKpiCache } from './kpiCacheService';
import { fetchStudentJson, fetchStudentResult } from '../utils/studentServiceClient';

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

  // 2. Batch resolve students by distinct matricules (internal and external)
  const studentMap = new Map<string, { id: number; antenneId: number }>();
  const distinctMatricules = Array.from(
    new Set(
      uniqueItems
        .map((item: any) => (item.matriculeTresorPay || item.etudiantMatricule || '').trim())
        .filter((m): m is string => typeof m === 'string' && m.trim() !== '')
    )
  );

  if (distinctMatricules.length > 0) {
    try {
      const students = await fetchStudentJson<any[]>('/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ matricules: distinctMatricules }),
      }, []);
      if (Array.isArray(students)) {
        for (const s of students) {
          const resolvedVal = { id: s.id, antenneId: s.antenneId };
          if (s.matricule) studentMap.set(s.matricule.toUpperCase(), resolvedVal);
          if (s.matriculeTresorPay) studentMap.set(s.matriculeTresorPay.toUpperCase(), resolvedVal);
        }
      }
    } catch (err) {
      logger.warn(err, 'Failed to resolve students in batch');
    }
  }

  // 3. Fetch all nomenclatures to resolve by libelle
  const nomenclatureMap = new Map<string, { id: number; typeFluxId: number }>();
  try {
    const noms = await fetchStudentJson<any[]>('/nomenclatures', {
      headers: {
        'Accept': 'application/json',
      },
    }, []);
    if (Array.isArray(noms)) {
      for (const nom of noms) {
        if (nom.libelleBrut) {
          nomenclatureMap.set(nom.libelleBrut.toUpperCase(), { id: nom.id, typeFluxId: nom.typeRecette?.typeFluxId || 1 });
        }
        if (nom.libelleStandard) {
          nomenclatureMap.set(nom.libelleStandard.toUpperCase(), { id: nom.id, typeFluxId: nom.typeRecette?.typeFluxId || 1 });
        }
      }
    }
  } catch (err) {
    logger.warn(err, 'Failed to fetch nomenclatures for import resolution');
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

  // 4. Map transactions with pre-resolved relations
  for (const item of uniqueItems) {
    try {
      let etudiantId = item.etudiantId;
      let antenneId = item.antenneId;
      let nomenclatureId = item.nomenclatureId;
      let typeFluxId = item.typeFluxId;

      const matCandidate = (item.matriculeTresorPay || (item as any).matricule || item.etudiantMatricule || '').trim();
      if (!etudiantId && matCandidate) {
        if (studentMap.has(matCandidate.toUpperCase())) {
          const resolved = studentMap.get(matCandidate.toUpperCase())!;
          etudiantId = resolved.id;
          if (!antenneId) antenneId = resolved.antenneId;
        } else {
          // Si non trouvé dans le batch initial, tenter une résolution par matricule externe (création temporaire)
          try {
            const res = await fetchStudentResult<any | null>(`/tresor-pay/${encodeURIComponent(matCandidate)}`, undefined, null);
            if (res.ok && res.data) {
              const student = res.data;
              etudiantId = student.id;
              if (!antenneId) antenneId = student.antenneId;
              studentMap.set(matCandidate.toUpperCase(), { id: student.id, antenneId: student.antenneId });
            } else if (res.status === 404) {
              const createRes = await fetchStudentResult<any | null>('/tresor-pay/temporary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  matriculeTresorPay: matCandidate,
                  nomPayeur: item.nomPayeurBrut || 'Payeur Inconnu'
                })
              }, null);
              if (createRes.ok && createRes.data) {
                const tempStudent = createRes.data;
                etudiantId = tempStudent.id;
                if (!antenneId) antenneId = tempStudent.antenneId;
                studentMap.set(matCandidate.toUpperCase(), { id: tempStudent.id, antenneId: tempStudent.antenneId });
              }
            }
          } catch (err) {
            logger.error(err, `Erreur lors de la résolution de l'étudiant pour le matricule ${matCandidate}`);
          }
        }
      }

      const libelle = item.libelleProduitBrut;
      if (!nomenclatureId && libelle && nomenclatureMap.has(libelle.toUpperCase())) {
        const resolved = nomenclatureMap.get(libelle.toUpperCase())!;
        nomenclatureId = resolved.id;
        if (!typeFluxId) {
          typeFluxId = resolved.typeFluxId;
        }
      }

      transactionsToCreate.push({
        refTresor: item.refTresor.trim(),
        dateHeure: new Date(item.dateHeure),
        montant: BigInt(item.montant),
        etudiantId: etudiantId ?? null,
        antenneId: antenneId ?? null,
        nomenclatureId: nomenclatureId ?? null,
        typeFluxId: typeFluxId ?? null,
        importId: importFichier.id,
        ordrePaiementId: item.ordrePaiementId ?? null,
        mois: item.mois ?? null,
        nomPayeurBrut: item.nomPayeurBrut?.trim() ?? null,
        libelleProduitBrut: item.libelleProduitBrut?.trim() ?? null,
        statutTraitement: item.ordrePaiementId ? 'AFFECTE' : 'IMPORTE',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(`${item.refTresor}: ${message}`);
    }
  }

  // 5. Execute DB bulk insertion (createMany)
  let importedCount = 0;
  let dbDuplicatesCount = 0;
  if (transactionsToCreate.length > 0) {
    try {
      const dbResult = await prisma.transaction.createMany({
        data: transactionsToCreate,
        skipDuplicates: true,
      });
      importedCount = dbResult.count;
      dbDuplicatesCount = transactionsToCreate.length - dbResult.count;
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

  const where = await buildTransactionWhereClause(query);

  const [list, total, sums] = await Promise.all([
    transactionRepository.findTransactions(limit, offset, where, sortBy, sortOrder),
    transactionRepository.countTransactions(where),
    prisma.transaction.groupBy({
      by: ['typeFluxId'],
      where,
      _sum: {
        montant: true
      }
    })
  ]);

  // Aggregate totals
  let totalBudget = 0n;
  let totalHorsBudget = 0n;
  for (const s of sums) {
    if (s.typeFluxId === 1) totalBudget = s._sum.montant || 0n;
    if (s.typeFluxId === 2) totalHorsBudget = s._sum.montant || 0n;
  }
  const totals = {
    budget: Number(totalBudget),
    horsBudget: Number(totalHorsBudget),
    total: Number(totalBudget + totalHorsBudget)
  };

  // Cross-service resolution
  const studentMap = new Map<number, any>();
  const nomenclatureMap = new Map<number, any>();

  const etudiantIds = Array.from(new Set(list.map(tx => tx.etudiantId).filter((id): id is number => id !== null)));
  const nomenclatureIds = Array.from(new Set(list.map(tx => tx.nomenclatureId).filter((id): id is number => id !== null)));

  if (etudiantIds.length > 0) {
    try {
      const students = await fetchStudentJson<any[]>('/batch-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: etudiantIds })
      }, []);
      if (Array.isArray(students)) {
        for (const s of students) {
          studentMap.set(s.id, s);
        }
      }
    } catch (err) {
      logger.warn(err, 'Failed to batch lookup students by IDs in getTransactions');
    }
  }

  if (nomenclatureIds.length > 0) {
    try {
      const noms = await fetchStudentJson<any[]>('/nomenclatures', undefined, []);
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
    student: tx.etudiantId ? studentMap.get(tx.etudiantId) || null : null,
    nomenclature: tx.nomenclatureId ? nomenclatureMap.get(tx.nomenclatureId) || null : null
  }));

  return { list: enrichedList, total, limit, offset, totals };
};

export const getUnassignedTransactions = async () => {
  return transactionRepository.findUnassignedHorsBudget();
};

export const linkTransactionsToOp = async (ordrePaiementId: number, codeOp: string, transactionIds: number[]) => {
  await ordrePaiementMiroirRepository.upsertOrdrePaiementMiroir(ordrePaiementId, codeOp, 'Brouillon');

  const alreadyLinked = await transactionRepository.findAlreadyLinkedTransaction(transactionIds);
  if (alreadyLinked) {
    throw new AppError(
      400,
      `Transaction ${alreadyLinked.id.toString()} is already assigned to OP ${alreadyLinked.ordrePaiementId}`,
    );
  }

  const count = await transactionRepository.linkTransactionsToOp(transactionIds, ordrePaiementId);
  return { message: 'Linked successfully', updatedCount: count };
};

export const unlinkTransactionsFromOp = async (ordrePaiementId: number) => {
  const count = await transactionRepository.unlinkTransactionsFromOp(ordrePaiementId);
  return { message: 'Unlinked successfully', count };
};

export const syncOpStatus = async (ordrePaiementId: number, codeOp: string, statut: string) => {
  return ordrePaiementMiroirRepository.upsertOrdrePaiementMiroir(ordrePaiementId, codeOp, statut);
};

export const updateTransaction = async (id: number, data: any) => {
  const { ordrePaiementId, ordrePaiement, codeOp, ...cleanData } = data;
  if (cleanData.montant !== undefined) {
    cleanData.montant = BigInt(cleanData.montant);
  }
  const transaction = await transactionRepository.updateTransaction(id, cleanData);
  await invalidateKpiCache();
  return transaction;
};

export const deleteTransaction = async (id: number) => {
  const transaction = await transactionRepository.deleteTransaction(id);
  await invalidateKpiCache();
  return transaction;
};

export const mergeStudents = async (oldStudentId: number, newStudentId: number) => {
  const count = await transactionRepository.updateTransactionsStudentId(oldStudentId, newStudentId);
  await invalidateKpiCache();
  logger.info({ oldStudentId, newStudentId, count }, 'Merged student transactions');
  return count;
};
