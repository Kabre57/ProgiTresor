import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';
import { enqueueTransactionLock } from './outboxService';
import type { CreateOrdersFromSynthesisInput } from '../../../../../shared/types/order.types';

const toBigIntAmount = (value: number | string | bigint) => {
  return typeof value === 'bigint' ? value : BigInt(value);
};

export const createOrdersFromSynthesis = async (payload: CreateOrdersFromSynthesisInput) => {
  if (!payload.pdfUrl) throw new AppError(400, 'pdfUrl is required to create payment orders from synthesis');
  if (!payload.lines || payload.lines.length === 0) throw new AppError(400, 'At least one synthesis line is required');

  const reference = payload.reference ?? `SYN-${Date.now()}`;
  const referenceVague = payload.referenceVague ?? `VAGUE-${Date.now()}`;
  const titre = payload.titre ?? `Transmission ${referenceVague}`;
  const existing = await prisma.syntheseOT.findUnique({ where: { reference }, include: { ordresTraitement: true } });
  if (existing) {
    logger.info({ reference }, 'Synthesis already exists, returning existing records.');
    return { synthese: existing, ordresTraitement: existing.ordresTraitement };
  }

  const total = payload.lines.reduce((sum, line) => sum + toBigIntAmount(line.montantCumule), 0n);
  const nbTransactions = payload.lines.reduce((sum, line) => sum + line.nombreFlux, 0);

  return prisma.$transaction(async (tx) => {
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
          titre,
          description: payload.description,
          referenceVague,
          transmisParId: payload.auteurId,
          dateTransmissionSynthese: new Date(),
        },
      });

      await tx.otTransmissionHistory.create({
        data: {
          ordreTraitementId: op.id,
          referenceVague,
          titre,
          description: payload.description,
          utilisateurId: payload.auteurId,
          nombreLignes: 1,
          nombreFlux: line.nombreFlux,
          montantTotal: toBigIntAmount(line.montantCumule),
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
};
