import { Prisma } from '@prisma/client/index';
import { prisma } from '../utils/prisma';
import { dbQueryDuration } from '../utils/metrics';

export const upsertOrdreTraitementMiroir = async (id: number, codeOt: string, statut: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'ordre_traitement_miroir_upsert' });
  try {
    return await prisma.ordreTraitementMiroir.upsert({
      where: { id },
      update: { codeOt, statut },
      create: { id, codeOt, statut },
    });
  } finally {
    end();
  }
};

export const findOrdreTraitementMiroirById = async (id: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'ordre_traitement_miroir_find_by_id' });
  try {
    return await prisma.ordreTraitementMiroir.findUnique({
      where: { id },
    });
  } finally {
    end();
  }
};

export const findOrdreTraitementMiroirByCode = async (codeOt: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'ordre_traitement_miroir_find_by_code' });
  try {
    return await prisma.ordreTraitementMiroir.findUnique({
      where: { codeOt },
    });
  } finally {
    end();
  }
};

export const findAllOrdreTraitementMiroirs = async () => {
  const end = dbQueryDuration.startTimer({ operation: 'ordre_traitement_miroir_find_all' });
  try {
    return await prisma.ordreTraitementMiroir.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  } finally {
    end();
  }
};
