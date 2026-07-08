import { Prisma } from '@prisma/client/index';
import { prisma } from '../utils/prisma';
import { dbQueryDuration } from '../utils/metrics';

export type ImportCreateData = Prisma.ImportFichierUncheckedCreateInput;

export const createImportFichier = async (data: ImportCreateData) => {
  const end = dbQueryDuration.startTimer({ operation: 'import_fichier_create' });
  try {
    return await prisma.importFichier.create({ data });
  } finally {
    end();
  }
};

export const updateImportFichier = async (id: number, data: Prisma.ImportFichierUpdateInput) => {
  const end = dbQueryDuration.startTimer({ operation: 'import_fichier_update' });
  try {
    return await prisma.importFichier.update({
      where: { id },
      data,
    });
  } finally {
    end();
  }
};

export const findImportFichiers = async (limit: number, offset: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'import_fichier_find_many' });
  try {
    return await prisma.importFichier.findMany({
      take: limit,
      skip: offset,
      orderBy: { dateImport: 'desc' },
      include: { transactions: { select: { id: true, refTresor: true, montant: true, statutTraitement: true } } },
    });
  } finally {
    end();
  }
};

export const countImportFichiers = async (): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'import_fichier_count' });
  try {
    return await prisma.importFichier.count();
  } finally {
    end();
  }
};

export const findImportFichierById = async (id: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'import_fichier_find_by_id' });
  try {
    return await prisma.importFichier.findUnique({
      where: { id },
      include: { transactions: true },
    });
  } finally {
    end();
  }
};
