import * as orderRepository from '../repositories/orderRepository';
import { SagaCoordinator } from './sagaCoordinator';
import { isAxiosError } from 'axios';
import { NotFoundError, AppError } from '../utils/errors';
import { http, TRANSACTION_SERVICE_URL, ETUDIANT_SERVICE_URL } from '../utils/httpClient';
import logger from '../utils/logger';
import { prisma } from '../utils/prisma';
import { enqueueTransactionLock, enqueueAccountingEntry, enqueueComptaBordereau } from './outboxService';

const allowedTransitions: Record<string, string[]> = {
  Brouillon: ['Transmis', 'Rejeté'],
  EN_ATTENTE_BUDGET: ['Validé', 'Rejeté'],
  Transmis: ['Validé', 'Rejeté'],
  Validé: ['Approuvé', 'Rejeté', 'TRANSMIS_AU_BUDGET'],
  TRANSMIS_AU_BUDGET: ['Approuvé', 'Rejeté'],
  Approuvé: ['Payé'],
  Rejeté: [],
  Payé: [],
};

export const generatePaymentOrders = async (auteurId: number) => {
  const coordinator = new SagaCoordinator(auteurId);
  return coordinator.execute();
};

export type SynthesisOrderLineInput = {
  codeOt: string;
  antenneId: number;
  niveauId: number;
  statutId?: number;
  typeRecetteId: number;
  montantCumule: number | string | bigint;
  nombreFlux: number;
  transactionIds?: number[];
};

export type CreateOrdersFromSynthesisInput = {
  reference?: string;
  periodeDebut: string | Date;
  periodeFin: string | Date;
  typeFluxId?: number;
  auteurId: number;
  pdfUrl: string;
  lines: SynthesisOrderLineInput[];
};

type TransmittedTransaction = {
  refTresor?: string | null;
  dateHeure: string | Date;
  montant: number | string | bigint;
  antenneId?: number | null;
  niveauId?: number | null;
  niveau?: string | null;
  nomenclatureId?: number | null;
  libelleProduitBrut?: string | null;
};

type TransactionTransmissionResponse = {
  transactions?: TransmittedTransaction[];
};

type ReferentialItem = {
  id: number;
  code?: string | null;
  nom?: string | null;
  libelle?: string | null;
  codeProduit?: string | null;
  libelleStandard?: string | null;
  typeRecetteId?: number | null;
};

const getErrorText = (error: unknown) => {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string }; message?: string } | undefined;
    return data?.error?.message ?? data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Erreur inconnue';
};

const toBigIntAmount = (value: number | string | bigint) => {
  return typeof value === 'bigint' ? value : BigInt(value);
};

export const createOrdersFromSynthesis = async (payload: CreateOrdersFromSynthesisInput) => {
  if (!payload.pdfUrl) {
    throw new AppError(400, 'pdfUrl is required to create payment orders from synthesis');
  }
  if (!payload.lines || payload.lines.length === 0) {
    throw new AppError(400, 'At least one synthesis line is required');
  }

  const reference = payload.reference ?? `SYN-${Date.now()}`;
  const total = payload.lines.reduce((sum, line) => sum + toBigIntAmount(line.montantCumule), 0n);
  const nbTransactions = payload.lines.reduce((sum, line) => sum + line.nombreFlux, 0);

  const created = await prisma.$transaction(async (tx) => {
    const synthese = await tx.syntheseOT.create({
      data: {
        reference,
        periodeDebut: new Date(payload.periodeDebut),
        periodeFin: new Date(payload.periodeFin),
        typeFluxId: payload.typeFluxId ?? 2,
        statut: 'EN_ATTENTE_BUDGET',
        auteurId: payload.auteurId,
        montantTotal: total,
        nbTransactions,
      },
    });

    const ordresTraitement = [];
    for (const line of payload.lines) {
      const op = await tx.ordreTraitement.create({
        data: {
          codeOt: line.codeOt,
          syntheseId: synthese.id,
          antenneId: line.antenneId,
          niveauId: line.niveauId,
          typeRecetteId: line.typeRecetteId,
          statutId: line.statutId,
          montantCumule: toBigIntAmount(line.montantCumule),
          nombreFlux: line.nombreFlux,
          statut: 'EN_ATTENTE_BUDGET',
          creeParId: payload.auteurId,
          dateEmission: new Date(),
          pdfUrl: payload.pdfUrl,
          version: 1,
        },
      });

      await enqueueTransactionLock(tx, {
        ordreTraitementId: op.id,
        codeOt: op.codeOt,
        transactionIds: line.transactionIds,
        statut: 'EN_ATTENTE_BUDGET',
      });

      ordresTraitement.push(op);
    }

    return { synthese, ordresTraitement };
  });

  return created;
};

const assertRoleForStatus = (newStatus: string, role: string | undefined) => {
  if (role === 'ADMIN') return;
  if (newStatus === 'Transmis' && role !== 'COMPTABLE' && role !== 'CHEF_COMPTABLE') {
    throw new AppError(403, 'Only COMPTABLE, CHEF_COMPTABLE or ADMIN can transmit OTs');
  }
  if (newStatus === 'Validé' && role !== 'CHEF_COMPTABLE' && role !== 'BUDGET') {
    throw new AppError(403, 'Only CHEF_COMPTABLE, BUDGET or ADMIN can validate OTs');
  }
  if (newStatus === 'Approuvé' && role !== 'DF') {
    throw new AppError(403, 'Only DF or ADMIN can approve OTs');
  }
  if (newStatus === 'Payé' && role !== 'BUDGET') {
    throw new AppError(403, 'Only BUDGET or ADMIN can mark OTs as paid');
  }
  if (newStatus === 'TRANSMIS_AU_BUDGET' && role !== 'CHEF_COMPTABLE' && role !== 'DF') {
    throw new AppError(403, 'Only CHEF_COMPTABLE, DF or ADMIN can transmit OTs to budget');
  }
};

export const updateOrderStatus = async (
  code: string,
  newStatus: string,
  role: string | undefined,
  userId: number | null,
  motif?: string,
) => {
  const op = await orderRepository.findOtByCode(code);
  if (!op) {
    throw new NotFoundError('Ordre de traitement not found');
  }

  const nextStatuses = allowedTransitions[op.statut] ?? [];
  if (!nextStatuses.includes(newStatus)) {
    throw new AppError(400, `Transition ${op.statut} -> ${newStatus} is not allowed`);
  }

  assertRoleForStatus(newStatus, role);

  const now = new Date();
  const updateData: orderRepository.OtUpdateData = { statut: newStatus };

  if (newStatus === 'Transmis') {
    if (!op.pdfUrl && !op.pdfPath) {
      throw new AppError(400, 'PDF obligatoire manquant : la synthese doit etre validee avant transmission.');
    }
    updateData.dateTransmissionBudget = now;
  } else if (newStatus === 'Validé' && userId) {
    updateData.dateValidationChefComptable = now;
    updateData.validateurChefComptableId = userId;
    updateData.valideParId = userId;

    try {
      // 1. Récupérer l'antenne pour obtenir son code trigramme (ex: BKE)
      const antenneRes = await http.get(`${ETUDIANT_SERVICE_URL}/antennes/${op.antenneId}`);
      const antenneCode = (antenneRes.data?.code || `ANT-${op.antenneId}`).toUpperCase();

      // 2. Calculer et incrémenter de façon atomique la séquence annuelle par antenne
      const currentYear = now.getFullYear();
      const nextSequence = await prisma.$transaction(async (tx) => {
        const counter = await tx.otCounter.upsert({
          where: {
            year_antenneId: { year: currentYear, antenneId: op.antenneId }
          },
          update: {
            sequence: { increment: 1 }
          },
          create: {
            year: currentYear,
            antenneId: op.antenneId,
            sequence: 1
          }
        });
        return counter.sequence;
      });

      // 3. Formater le code OT officiel (ex: OT-2026-BKE-001)
      const formattedSeq = String(nextSequence).padStart(3, '0');
      const officialCodeOt = `OT-${currentYear}-${antenneCode}-${formattedSeq}`;

      updateData.codeOt = officialCodeOt;
      logger.info({ oldCode: code, officialCodeOt }, 'Code OT officiel généré avec succès.');
    } catch (err) {
      logger.error({ err, code }, 'Erreur lors de la génération du code OT officiel');
      throw new AppError(500, `Échec de la génération du numéro officiel séquentiel : ${err instanceof Error ? err.message : String(err)}`);
    }
  } else if (newStatus === 'Approuvé' && userId) {
    updateData.dateApprobationDirecteurFinancier = now;
    updateData.approbateurDirecteurFinancierId = userId;
  } else if (newStatus === 'Rejeté') {
    updateData.dateRejet = now;
    updateData.motifRejet = motif ?? null;
    await http.post(`${TRANSACTION_SERVICE_URL}/unlink-ot`, { ordreTraitementId: op.id });
  } else if (newStatus === 'Payé') {
    updateData.datePaiement = now;
  }

  if (newStatus === 'Transmis') {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.ordreTraitement.update({
        where: { codeOt: code },
        data: updateData,
      });

      await enqueueTransactionLock(tx, {
        ordreTraitementId: updated.id,
        codeOt: updated.codeOt,
        statut: newStatus,
      });

      return updated;
    });
  }

  if (newStatus === 'Payé') {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.ordreTraitement.update({
        where: { codeOt: code },
        data: updateData,
      });

      await enqueueAccountingEntry(tx, {
        codeOt: updated.codeOt,
        montant: Number(updated.montantCumule),
      });

      return updated;
    });
  }

  if (newStatus === 'TRANSMIS_AU_BUDGET') {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.ordreTraitement.update({
        where: { codeOt: code },
        data: updateData,
      });

      await enqueueComptaBordereau(tx, {
        codesOt: [result.codeOt],
        sourceService: 'order-service',
        utilisateurTransmission: userId ? String(userId) : undefined,
      });

      return result;
    });

    try {
      await http.put(`${TRANSACTION_SERVICE_URL}/ot-status`, {
        ordreTraitementId: updated.id,
        codeOt: updated.codeOt,
        statut: newStatus,
      });
    } catch (syncError) {
      logger.error({ syncError, codeOt: code, statut: newStatus }, 'Failed to synchronize OT status with transaction-service');
      throw new AppError(502, 'OT status updated locally but transaction-service synchronization failed');
    }

    return updated;
  }

  const updated = await orderRepository.updateOt(code, updateData);

  try {
    await http.put(`${TRANSACTION_SERVICE_URL}/ot-status`, {
      ordreTraitementId: updated.id,
      codeOt: updated.codeOt,
      statut: newStatus,
    });
  } catch (syncError) {
    logger.error({ syncError, codeOt: code, statut: newStatus }, 'Failed to synchronize OT status with transaction-service');
    throw new AppError(502, 'OT status updated locally but transaction-service synchronization failed');
  }

  return updated;
};

export const getAllOrders = async () => {
  return orderRepository.findAllOts();
};

export const transmettreBudget = async (code: string, utilisateurTransmission?: string) => {
  const fs = require('fs');
  const path = require('path');

  const op = await orderRepository.findOtByCode(code);
  if (!op) {
    throw new NotFoundError('Ordre de traitement not found');
  }

  if (op.statut !== 'Validé') {
    throw new AppError(400, "L'ordre de traitement doit être validé avant la transmission au budget.");
  }

  // 1. Call transaction-service to mark transactions as TRANSMIS
  let txData: TransactionTransmissionResponse;
  try {
    const res = await http.post<TransactionTransmissionResponse>(`${TRANSACTION_SERVICE_URL}/ot/${code}/transmettre`);
    txData = res.data;
  } catch (err: unknown) {
    logger.error({ err, code }, 'Failed to transmit transactions in transaction-service');
    throw new AppError(500, `Erreur lors de la transmission des transactions : ${getErrorText(err)}`);
  }

  const transactions = txData.transactions || [];
  if (transactions.length === 0) {
    throw new AppError(400, "Aucune transaction trouvée pour cet ordre de traitement.");
  }

  // 2. Update local OT status to TRANSMIS_AU_BUDGET
  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.ordreTraitement.update({
      where: { codeOt: code },
      data: {
        statut: 'TRANSMIS_AU_BUDGET',
        dateTransmissionBudget: now,
      },
    });

    await enqueueComptaBordereau(tx, {
      codesOt: [result.codeOt],
      sourceService: 'order-service',
      utilisateurTransmission,
    });

    return result;
  });

  // 3. Sync status with transaction-service
  try {
    await http.put(`${TRANSACTION_SERVICE_URL}/ot-status`, {
      ordreTraitementId: updated.id,
      codeOt: updated.codeOt,
      statut: 'TRANSMIS_AU_BUDGET',
    });
  } catch (syncError) {
    logger.error({ syncError, codeOt: code }, 'Failed to sync TRANSMIS_AU_BUDGET status with transaction-service');
  }

  // 4. Fetch referentials from etudiant-service
  let antennes: ReferentialItem[] = [];
  let niveaux: ReferentialItem[] = [];
  let nomenclatures: ReferentialItem[] = [];
  let typeRecettes: ReferentialItem[] = [];

  try {
    const [antRes, nivRes, nomRes, trRes] = await Promise.all([
      http.get<ReferentialItem[]>(`${ETUDIANT_SERVICE_URL}/antennes`),
      http.get<ReferentialItem[]>(`${ETUDIANT_SERVICE_URL}/niveaux`),
      http.get<ReferentialItem[]>(`${ETUDIANT_SERVICE_URL}/nomenclatures`),
      http.get<ReferentialItem[]>(`${ETUDIANT_SERVICE_URL}/types-recettes`)
    ]);
    antennes = antRes.data || [];
    niveaux = nivRes.data || [];
    nomenclatures = nomRes.data || [];
    typeRecettes = trRes.data || [];
  } catch (refError) {
    logger.warn({ refError }, 'Failed to fetch some referentials, CSV may have fallback values');
  }

  const antenneMap = new Map(antennes.map(a => [a.id, a]));
  const niveauMap = new Map(niveaux.map(n => [n.id, n]));
  const nomenclatureMap = new Map(nomenclatures.map(n => [n.id, n]));
  const typeRecetteMap = new Map(typeRecettes.map(tr => [tr.id, tr]));

  // Helper formatting functions
  const formatDate = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const quote = (str: unknown) => `"${String(str ?? '').replace(/"/g, '""')}"`;

  // 5. Generate CSV content
  const headers = ['REF_TRESOR', 'DATE_PAIEMENT', 'MONTANT', 'CODE_PRODUIT', 'LIBELLE_PRODUIT', 'TYPE_RECETTE', 'ANTENNE', 'NIVEAU'];
  const csvRows = [headers.join(',')];

  // OT-level fallback data
  const otAntenneObj = op.antenneId ? antenneMap.get(op.antenneId) : null;
  const otAntenneName = otAntenneObj ? (otAntenneObj.nom || otAntenneObj.code || '') : '';
  const otNiveauObj = op.niveauId ? niveauMap.get(op.niveauId) : null;
  const otNiveauName = otNiveauObj ? (otNiveauObj.libelle || otNiveauObj.code || '') : '';
  const otTypeRecetteObj = op.typeRecetteId ? typeRecetteMap.get(op.typeRecetteId) : null;
  const otTypeRecetteName = otTypeRecetteObj ? (otTypeRecetteObj.libelle || otTypeRecetteObj.nom || otTypeRecetteObj.code || '') : '';

  for (const tx of transactions) {
    const antenneObj = tx.antenneId ? antenneMap.get(tx.antenneId) : null;
    const antenneName = antenneObj ? (antenneObj.nom || antenneObj.code || '') : otAntenneName;

    const niveauObj = tx.niveauId ? niveauMap.get(tx.niveauId) : null;
    const niveauName = niveauObj ? (niveauObj.libelle || niveauObj.code || '') : (tx.niveau || otNiveauName);

    const nomObj = tx.nomenclatureId ? nomenclatureMap.get(tx.nomenclatureId) : null;
    const codeProduit = nomObj ? (nomObj.codeProduit || '') : '';
    const libelleProduit = nomObj ? (nomObj.libelleStandard || tx.libelleProduitBrut || '') : (tx.libelleProduitBrut || '');

    const typeRecetteObj = nomObj?.typeRecetteId ? typeRecetteMap.get(nomObj.typeRecetteId) : null;
    const typeRecetteName = typeRecetteObj ? (typeRecetteObj.libelle || typeRecetteObj.nom || typeRecetteObj.code || '') : otTypeRecetteName;

    const row = [
      quote(tx.refTresor),
      quote(formatDate(tx.dateHeure)),
      tx.montant.toString(),
      quote(codeProduit),
      quote(libelleProduit),
      quote(typeRecetteName),
      quote(antenneName),
      quote(niveauName)
    ];
    csvRows.push(row.join(','));
  }

  const csvContent = csvRows.join('\n');

  // 6. Write CSV locally
  const pivotsDir = path.join(__dirname, '../../pivots');
  if (!fs.existsSync(pivotsDir)) {
    fs.mkdirSync(pivotsDir, { recursive: true });
  }

  const filename = `pivot_${code}_${Date.now()}.csv`;
  const filePath = path.join(pivotsDir, filename);
  fs.writeFileSync(filePath, '\uFEFF' + csvContent, 'utf-8');

  // 7. Return download URL
  return {
    message: 'Ordre de traitement transmis au budget et pivot généré.',
    downloadUrl: `/api/ots/download-pivot/${filename}`,
    order: updated
  };
};

export const getOrderByCode = async (code: string) => {
  return orderRepository.findOtByCode(code);
};

export const attachPdfToOrder = async (code: string, pdfUrl: string) => {
  const op = await orderRepository.findOtByCode(code);
  if (!op) {
    throw new NotFoundError('Ordre de traitement not found');
  }
  if (op.pdfUrl) {
    throw new AppError(409, 'A PDF is already attached to this payment order');
  }

  return orderRepository.updateOt(code, {
    pdfUrl,
    pdfPath: pdfUrl,
  });
};

export const patchOrder = async (code: string, data: Partial<SynthesisOrderLineInput>) => {
  const op = await orderRepository.findOtByCode(code);
  if (!op) {
    throw new NotFoundError('Ordre de traitement not found');
  }
  if (op.pdfUrl || op.pdfPath) {
    throw new AppError(409, 'Archived OT cannot be modified. Create a corrected version instead.');
  }

  const allowedData: orderRepository.OtUpdateData = {};
  if (data.antenneId !== undefined) allowedData.antenneId = data.antenneId;
  if (data.niveauId !== undefined) allowedData.niveauId = data.niveauId;
  if (data.statutId !== undefined) allowedData.statutId = data.statutId;
  if (data.typeRecetteId !== undefined) allowedData.typeRecetteId = data.typeRecetteId;
  if (data.montantCumule !== undefined) allowedData.montantCumule = toBigIntAmount(data.montantCumule);
  if (data.nombreFlux !== undefined) allowedData.nombreFlux = data.nombreFlux;

  return orderRepository.updateOt(code, allowedData);
};

export const createCorrectedVersion = async (
  code: string,
  data: Partial<SynthesisOrderLineInput>,
  userId: number,
) => {
  const op = await orderRepository.findOtByCode(code);
  if (!op) {
    throw new NotFoundError('Ordre de traitement not found');
  }

  const baseCode = op.codeOt.replace(/-V\d+$/i, '');
  
  // Find all existing OTs matching the base code to find the highest version
  const existingOts = await prisma.ordreTraitement.findMany({
    where: {
      codeOt: {
        startsWith: baseCode,
      },
    },
    select: {
      version: true,
    },
  });

  const maxVersion = existingOts.reduce((max, curr) => curr.version > max ? curr.version : max, op.version);
  const nextVersion = maxVersion + 1;
  const correctedCode = `${baseCode}-V${nextVersion}`;

  return orderRepository.createOt({
    codeOt: correctedCode,
    syntheseId: op.syntheseId,
    antenneId: data.antenneId ?? op.antenneId,
    niveauId: data.niveauId ?? op.niveauId,
    typeRecetteId: data.typeRecetteId ?? op.typeRecetteId,
    statutId: data.statutId ?? op.statutId,
    montantCumule: data.montantCumule !== undefined ? toBigIntAmount(data.montantCumule) : op.montantCumule,
    nombreFlux: data.nombreFlux ?? op.nombreFlux,
    statut: 'Brouillon',
    creeParId: userId,
    version: nextVersion,
  });
};

export const validateAndTransmitMultiple = async (
  codes: string[],
  role: string | undefined,
  userId: number | null,
) => {
  if (role !== 'CHEF_COMPTABLE' && role !== 'DF' && role !== 'ADMIN') {
    throw new AppError(403, "Seuls le Chef Comptable, le Directeur Financier ou l'Administrateur peuvent effectuer cette action.");
  }

  const results: { code: string; success: boolean; message?: string; downloadUrl?: string }[] = [];

  for (const code of codes) {
    try {
      const op = await orderRepository.findOtByCode(code);
      if (!op) {
        results.push({ code, success: false, message: "Ordre de traitement non trouvé." });
        continue;
      }

      if (op.statut === 'TRANSMIS_AU_BUDGET') {
        results.push({ code, success: true, message: "Déjà transmis." });
        continue;
      }

      let currentOp = op;
      if (op.statut === 'EN_ATTENTE_BUDGET' || op.statut === 'Transmis') {
        const updated = await updateOrderStatus(code, 'Validé', role, userId);
        const fetched = await orderRepository.findOtByCode(updated.codeOt);
        if (!fetched) {
          throw new AppError(400, "Impossible de valider cet ordre de traitement.");
        }
        currentOp = fetched;
      }

      if (!currentOp || currentOp.statut !== 'Validé') {
        throw new AppError(400, "Impossible de valider cet ordre de traitement.");
      }

      const transmitResult = await transmettreBudget(currentOp.codeOt, userId ? String(userId) : undefined);
      results.push({
        code,
        success: true,
        message: "Validé et transmis avec succès.",
        downloadUrl: transmitResult.downloadUrl
      });
    } catch (err: unknown) {
      logger.error({ err, code }, 'Failed to validate and transmit in bulk');
      results.push({
        code,
        success: false,
        message: getErrorText(err)
      });
    }
  }

  return results;
};
