import { Prisma } from '@prisma/client/index';
import { prisma } from '../utils/prisma';
import { dbQueryDuration } from '../utils/metrics';

export const upsertOrdrePaiementMiroir = async (id: number, codeOp: string, statut: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'ordre_paiement_miroir_upsert' });
  try {
    return await prisma.ordrePaiementMiroir.upsert({
      where: { id },
      update: { codeOp, statut },
      create: { id, codeOp, statut },
    });
  } finally {
    end();
  }
};

export const findOrdrePaiementMiroirById = async (id: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'ordre_paiement_miroir_find_by_id' });
  try {
    return await prisma.ordrePaiementMiroir.findUnique({
      where: { id },
    });
  } finally {
    end();
  }
};

export const findOrdrePaiementMiroirByCode = async (codeOp: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'ordre_paiement_miroir_find_by_code' });
  try {
    return await prisma.ordrePaiementMiroir.findUnique({
      where: { codeOp },
    });
  } finally {
    end();
  }
};

export const findAllOrdrePaiementMiroirs = async () => {
  const end = dbQueryDuration.startTimer({ operation: 'ordre_paiement_miroir_find_all' });
  try {
    return await prisma.ordrePaiementMiroir.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  } finally {
    end();
  }
};
