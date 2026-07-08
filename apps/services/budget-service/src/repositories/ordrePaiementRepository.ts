import { Prisma } from '@prisma/client/index';
import { OrdrePaiementFromLotInput } from '../../../../../shared/types/budget.types';
import { prisma } from '../utils/prisma';
import { dbQueryDuration } from '../utils/metrics';

const includeDetails = {
  lignes: true,
  historique: {
    orderBy: { dateCreation: 'desc' as const },
  },
};

export const findBySourceLot = async (sourceLotTraitementId: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_find_by_source_lot' });
  try {
    return prisma.ordrePaiement.findUnique({
      where: { sourceLotTraitementId },
      include: includeDetails,
    });
  } finally {
    end();
  }
};

export const findById = async (id: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_find_by_id' });
  try {
    return prisma.ordrePaiement.findUnique({
      where: { id },
      include: includeDetails,
    });
  } finally {
    end();
  }
};

export const list = async (params: { statut?: string; skip: number; take: number }) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_list' });
  try {
    return prisma.ordrePaiement.findMany({
      where: params.statut ? { statut: params.statut } : {},
      orderBy: { dateCreation: 'desc' },
      skip: params.skip,
      take: params.take,
      include: { lignes: true },
    });
  } finally {
    end();
  }
};

export const count = async (statut?: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_count' });
  try {
    return prisma.ordrePaiement.count({
      where: statut ? { statut } : {},
    });
  } finally {
    end();
  }
};

export const createFromLot = async (
  payload: OrdrePaiementFromLotInput,
  referenceOp: string,
) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_create_from_lot' });
  try {
    return prisma.ordrePaiement.create({
      data: {
        referenceOp,
        sourceBordereauId: payload.bordereauId,
        sourceLotTraitementId: payload.lotTraitementId,
        referenceLot: payload.referenceLot,
        montantTotal: new Prisma.Decimal(payload.montantTotal),
        nombreLignes: payload.nombreEcritures,
        utilisateurCreation: payload.utilisateurCreation,
        historique: {
          create: {
            statut: 'BROUILLON',
            commentaire: 'OP créé depuis un lot de traitement budgétaire.',
            utilisateur: payload.utilisateurCreation,
          },
        },
        lignes: {
          create: payload.lignes.map((line) => ({
            sourceEcritureId: line.sourceEcritureId,
            codeOt: line.codeOt,
            refTresor: line.refTresor,
            produitLibelleBrut: line.produitLibelleBrut,
            typeRecetteId: line.typeRecetteId,
            typeRecetteLibelle: line.typeRecetteLibelle,
            montant: new Prisma.Decimal(line.montant),
            matriculeEtudiant: line.matriculeEtudiant,
            dateFlux: new Date(line.dateFlux),
          })),
        },
      },
      include: includeDetails,
    });
  } finally {
    end();
  }
};

export const markTransmittedToCompta = async (id: string, utilisateur?: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_transmit_compta' });
  try {
    return prisma.ordrePaiement.update({
      where: { id },
      data: {
        statut: 'TRANSMIS_COMPTA',
        utilisateurTransmission: utilisateur,
        dateTransmissionCompta: new Date(),
        historique: {
          create: {
            statut: 'TRANSMIS_COMPTA',
            commentaire: 'OP transmis au service comptable pour contrôle OP/OT.',
            utilisateur,
          },
        },
      },
      include: includeDetails,
    });
  } finally {
    end();
  }
};
