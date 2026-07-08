import { Prisma } from '@prisma/client/index';
import { prisma } from '../utils/prisma';

export type LigneBudgetaireInput = {
  code: string;
  libelle: string;
  anneeBudgetaire: number;
  montantAlloue: number;
};

export const listLignes = async () => {
  return prisma.ligneBudgetaire.findMany({
    orderBy: [{ anneeBudgetaire: 'desc' }, { code: 'asc' }],
  });
};

export const upsertLigne = async (input: LigneBudgetaireInput) => {
  return prisma.ligneBudgetaire.upsert({
    where: {
      code_anneeBudgetaire: {
        code: input.code,
        anneeBudgetaire: input.anneeBudgetaire,
      },
    },
    update: {
      libelle: input.libelle,
      montantAlloue: new Prisma.Decimal(input.montantAlloue),
    },
    create: {
      code: input.code,
      libelle: input.libelle,
      anneeBudgetaire: input.anneeBudgetaire,
      montantAlloue: new Prisma.Decimal(input.montantAlloue),
    },
  });
};
