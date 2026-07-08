import { Prisma } from '@prisma/client/index';
import {
  LotTraitementCreateInput,
  LotTraitementProcessInput,
  LotTraitementTransmitInput,
} from '../../../../../shared/types/compta.types';
import { prisma } from '../utils/prisma';
import { BUDGET_SERVICE_URL, http } from '../utils/httpClient';
import { AppError } from '../utils/errors';

type BudgetOpResponse = {
  id: string;
  referenceOp: string;
  sourceBordereauId: number;
  sourceLotTraitementId: number;
  montantTotal: string;
  nombreLignes: number;
  statut: string;
};

const buildLotReference = (bordereauId: number) => {
  const stamp = Date.now().toString(36).toUpperCase();
  return `LOT-BDR${bordereauId}-${stamp}`;
};

const buildEcritureWhere = (input: LotTraitementCreateInput): Prisma.EcritureBudgetaireWhereInput => {
  const where: Prisma.EcritureBudgetaireWhereInput = {
    bordereauId: input.bordereauId,
    statut: 'EN_ATTENTE',
  };
  if (input.typeRecetteId) where.typeRecetteId = input.typeRecetteId;
  if (input.antenneId) where.antenneId = input.antenneId;
  if (input.dateDebutFlux || input.dateFinFlux) {
    where.dateFlux = {};
    if (input.dateDebutFlux) where.dateFlux.gte = new Date(input.dateDebutFlux);
    if (input.dateFinFlux) where.dateFlux.lte = new Date(input.dateFinFlux);
  }
  return where;
};

export const createLot = async (input: LotTraitementCreateInput) => {
  const ecritures = await prisma.ecritureBudgetaire.findMany({
    where: buildEcritureWhere(input),
    select: { id: true, montant: true },
  });
  if (ecritures.length === 0) {
    throw new AppError(400, 'Aucune écriture disponible pour ce lot de traitement.');
  }

  const montantTotal = ecritures.reduce((sum, item) => sum + Number(item.montant), 0);
  return prisma.$transaction(async (tx) => {
    const lot = await tx.lotTraitement.create({
      data: {
        bordereauId: input.bordereauId,
        reference: input.reference ?? buildLotReference(input.bordereauId),
        dateDebutFlux: input.dateDebutFlux ? new Date(input.dateDebutFlux) : null,
        dateFinFlux: input.dateFinFlux ? new Date(input.dateFinFlux) : null,
        typeRecetteId: input.typeRecetteId,
        antenneId: input.antenneId,
        montantTotal: new Prisma.Decimal(montantTotal),
        nombreEcritures: ecritures.length,
      },
    });

    await tx.lotTraitementEcriture.createMany({
      data: ecritures.map((ecriture) => ({
        lotTraitementId: lot.id,
        ecritureBudgetaireId: ecriture.id,
      })),
    });

    return tx.lotTraitement.findUniqueOrThrow({
      where: { id: lot.id },
      include: { ecritures: { include: { ecritureBudgetaire: true } } },
    });
  });
};

export const listLots = async () => {
  return prisma.lotTraitement.findMany({
    orderBy: { dateCreation: 'desc' },
    include: { bordereau: true },
  });
};

export const getLot = async (id: number) => {
  const lot = await prisma.lotTraitement.findUnique({
    where: { id },
    include: { ecritures: { include: { ecritureBudgetaire: true } }, bordereau: true },
  });
  if (!lot) throw new AppError(404, 'Lot de traitement introuvable');
  return lot;
};

export const traiterLot = async (id: number, input: LotTraitementProcessInput) => {
  const lot = await getLot(id);
  if (lot.statut !== 'EN_ATTENTE') {
    throw new AppError(409, 'Ce lot a déjà été traité ou transmis.');
  }

  const ligne = await prisma.ligneBudgetaire.findUnique({ where: { id: input.ligneBudgetaireId } });
  if (!ligne) throw new AppError(404, 'Ligne budgétaire introuvable');

  return prisma.$transaction(async (tx) => {
    const ecritureIds = lot.ecritures.map((link) => link.ecritureBudgetaireId);
    await tx.imputationBudgetaire.createMany({
      data: lot.ecritures.map((link) => ({
        ecritureBudgetaireId: link.ecritureBudgetaireId,
        ligneBudgetaireId: input.ligneBudgetaireId,
        montantImpute: link.ecritureBudgetaire.montant,
        utilisateurImputation: input.utilisateurTraitement,
        remarques: input.remarques,
      })),
    });

    await tx.ecritureBudgetaire.updateMany({
      where: { id: { in: ecritureIds } },
      data: { statut: 'IMPUTEE' },
    });

    await tx.ligneBudgetaire.update({
      where: { id: input.ligneBudgetaireId },
      data: { montantUtilise: { increment: lot.montantTotal } },
    });

    await tx.bordereau.update({
      where: { id: lot.bordereauId },
      data: { statut: 'PARTIELLEMENT_TRAITE', utilisateurTraitement: input.utilisateurTraitement },
    });

    return tx.lotTraitement.update({
      where: { id },
      data: { statut: 'TRAITE', dateTraitement: new Date() },
      include: { ecritures: { include: { ecritureBudgetaire: true } }, bordereau: true },
    });
  });
};

export const transmettreBudget = async (id: number, input: LotTraitementTransmitInput) => {
  const lot = await getLot(id);
  if (lot.statut !== 'TRAITE' && lot.statut !== 'TRANSMIS_BUDGET') {
    throw new AppError(409, 'Le lot doit être traité avant transmission au Budget.');
  }

  const response = await http.post<BudgetOpResponse>(`${BUDGET_SERVICE_URL}/ordres-paiement/from-lot`, {
    bordereauId: lot.bordereauId,
    lotTraitementId: lot.id,
    referenceLot: lot.reference,
    montantTotal: Number(lot.montantTotal),
    nombreEcritures: lot.nombreEcritures,
    utilisateurCreation: input.utilisateurTransmission,
    lignes: lot.ecritures.map((link) => {
      const ecriture = link.ecritureBudgetaire;
      return {
        sourceEcritureId: ecriture.id,
        codeOt: ecriture.codeOt,
        refTresor: ecriture.refTresor ?? undefined,
        produitLibelleBrut: ecriture.produitLibelleBrut,
        typeRecetteId: ecriture.typeRecetteId ?? undefined,
        typeRecetteLibelle: ecriture.typeRecetteLibelle ?? undefined,
        montant: Number(ecriture.montant),
        matriculeEtudiant: ecriture.matriculeEtudiant ?? undefined,
        dateFlux: ecriture.dateFlux.toISOString(),
      };
    }),
  });

  await prisma.lotTraitement.update({
    where: { id },
    data: { statut: 'TRANSMIS_BUDGET', dateTransmissionBudget: new Date() },
  });

  return response.data;
};
