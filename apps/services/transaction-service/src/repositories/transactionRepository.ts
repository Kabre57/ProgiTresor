import { Prisma } from '@prisma/client/index';
import { prisma } from '../utils/prisma';
import { dbQueryDuration } from '../utils/metrics';

export type TransactionCreateData = Prisma.TransactionUncheckedCreateInput;

export const findTransactions = async (
  limit: number,
  offset: number,
  where: Prisma.TransactionWhereInput = {},
  sortBy = 'dateHeure',
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_find_many' });
  
  let orderBy: any = { dateHeure: sortOrder };
  if (sortBy === 'montant') orderBy = { montant: sortOrder };
  else if (sortBy === 'nomPayeurBrut') orderBy = { nomPayeurBrut: sortOrder };
  else if (sortBy === 'matriculeEtudiant') orderBy = { etudiantId: sortOrder };

  try {
    return await prisma.transaction.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy,
      include: { importFichier: true },
    });
  } finally {
    end();
  }
};

export const countTransactions = async (where: Prisma.TransactionWhereInput = {}): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_count' });
  try {
    return await prisma.transaction.count({ where });
  } finally {
    end();
  }
};

export const findUnassignedHorsBudget = async () => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_find_unassigned' });
  try {
    return await prisma.transaction.findMany({
      where: {
        ordrePaiementId: null,
        typeFluxId: 2,
      },
      include: { importFichier: true },
    });
  } finally {
    end();
  }
};

export const createTransaction = async (data: TransactionCreateData) => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_create' });
  try {
    return await prisma.transaction.create({ data });
  } finally {
    end();
  }
};

export const linkTransactionsToOp = async (txIds: number[], ordrePaiementId: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_link_op' });
  try {
    const result = await prisma.transaction.updateMany({
      where: { id: { in: txIds } },
      data: {
        ordrePaiementId,
        statutTraitement: 'AFFECTE',
      },
    });
    return result.count;
  } finally {
    end();
  }
};

export const findAlreadyLinkedTransaction = async (txIds: number[]) => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_find_linked' });
  try {
    return await prisma.transaction.findFirst({
      where: {
        id: { in: txIds },
        NOT: { ordrePaiementId: null },
      },
    });
  } finally {
    end();
  }
};

export const unlinkTransactionsFromOp = async (ordrePaiementId: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_unlink_op' });
  try {
    const result = await prisma.transaction.updateMany({
      where: { ordrePaiementId },
      data: {
        ordrePaiementId: null,
        statutTraitement: 'IMPORTE',
        gele: false,
      },
    });
    return result.count;
  } finally {
    end();
  }
};

export const updateTransaction = async (id: number, data: Prisma.TransactionUncheckedUpdateInput) => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_update' });
  try {
    return await prisma.transaction.update({
      where: { id },
      data,
    });
  } finally {
    end();
  }
};

export const deleteTransaction = async (id: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_delete' });
  try {
    return await prisma.transaction.delete({
      where: { id },
    });
  } finally {
    end();
  }
};

export const updateTransactionsEtudiantId = async (oldEtudiantId: number, newEtudiantId: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_merge_etudiant' });
  try {
    const result = await prisma.transaction.updateMany({
      where: { etudiantId: oldEtudiantId },
      data: { etudiantId: newEtudiantId }
    });
    return result.count;
  } finally {
    end();
  }
};
