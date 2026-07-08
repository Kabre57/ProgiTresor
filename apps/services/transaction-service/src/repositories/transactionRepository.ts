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

export const findUnassignedHorsBudget = async (dateDebut?: string, dateFin?: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_find_unassigned' });

  const where: any = {
    ordreTraitementId: null,
    typeFluxId: { in: [2, 8] },
  };

  if (dateDebut || dateFin) {
    where.dateHeure = {};
    if (dateDebut) {
      where.dateHeure.gte = new Date(dateDebut);
    }
    if (dateFin) {
      const endDate = new Date(dateFin);
      endDate.setHours(23, 59, 59, 999);
      where.dateHeure.lte = endDate;
    }
  }

  try {
    return await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        montant: true,
        dateHeure: true,
        antenneId: true,
        etudiantId: true,
        nomenclatureId: true,
        typeFluxId: true,
        libelleProduitBrut: true,
      },
    }) as any;
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

export const linkTransactionsToOt = async (txIds: number[], ordreTraitementId: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_link_op' });
  try {
    const result = await prisma.transaction.updateMany({
      where: { id: { in: txIds } },
      data: {
        ordreTraitementId,
        statutTraitement: 'AFFECTE',
        gele: true,
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
        NOT: { ordreTraitementId: null },
      },
    });
  } finally {
    end();
  }
};

export const findTransactionById = async (id: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_find_by_id' });
  try {
    return await prisma.transaction.findUnique({
      where: { id },
    });
  } finally {
    end();
  }
};

export const lockTransactions = async (params: {
  transactionIds?: number[];
  ordreTraitementId?: number;
}): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_lock' });
  const where: Prisma.TransactionWhereInput = params.transactionIds && params.transactionIds.length > 0
    ? { id: { in: params.transactionIds } }
    : { ordreTraitementId: params.ordreTraitementId };

  try {
    const result = await prisma.transaction.updateMany({
      where,
      data: {
        ...(params.ordreTraitementId ? { ordreTraitementId: params.ordreTraitementId } : {}),
        statutTraitement: 'AFFECTE',
        gele: true,
      },
    });
    return result.count;
  } finally {
    end();
  }
};

export const unlinkTransactionsFromOt = async (ordreTraitementId: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_unlink_op' });
  try {
    const result = await prisma.transaction.updateMany({
      where: { ordreTraitementId },
      data: {
        ordreTraitementId: null,
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

export const findTransactionsByOtId = async (ordreTraitementId: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_find_by_ot' });
  try {
    return await prisma.transaction.findMany({
      where: { ordreTraitementId }
    });
  } finally {
    end();
  }
};

export const transmitTransactionsByOtId = async (ordreTraitementId: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'transaction_transmit_by_ot' });
  try {
    const result = await prisma.transaction.updateMany({
      where: { ordreTraitementId },
      data: {
        statutTraitement: 'TRANSMIS',
        gele: true
      }
    });
    return result.count;
  } finally {
    end();
  }
};

