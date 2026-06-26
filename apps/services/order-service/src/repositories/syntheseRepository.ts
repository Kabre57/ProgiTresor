import { Prisma } from '@prisma/client/index';
import { prisma } from '../utils/prisma';
import { dbQueryDuration } from '../utils/metrics';

export type SyntheseCreateData = Prisma.SyntheseOPUncheckedCreateInput;
export type SyntheseUpdateData = Prisma.SyntheseOPUncheckedUpdateInput;

export const createSynthese = async (data: SyntheseCreateData) => {
  const end = dbQueryDuration.startTimer({ operation: 'synthese_create' });
  try {
    return await prisma.syntheseOP.create({ data });
  } finally {
    end();
  }
};

export const findSyntheseById = async (id: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'synthese_find_by_id' });
  try {
    return await prisma.syntheseOP.findUnique({
      where: { id },
      include: { ordresPaiement: true },
    });
  } finally {
    end();
  }
};

export const findSyntheseByReference = async (reference: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'synthese_find_by_ref' });
  try {
    return await prisma.syntheseOP.findUnique({
      where: { reference },
      include: { ordresPaiement: true },
    });
  } finally {
    end();
  }
};

export const findAllSyntheses = async (limit: number, offset: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'synthese_find_all' });
  try {
    return await prisma.syntheseOP.findMany({
      take: limit,
      skip: offset,
      orderBy: { dateGeneration: 'desc' },
      include: { ordresPaiement: { select: { id: true, codeOp: true, statut: true, montantCumule: true, nombreFlux: true } } },
    });
  } finally {
    end();
  }
};

export const countSyntheses = async (): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'synthese_count' });
  try {
    return await prisma.syntheseOP.count();
  } finally {
    end();
  }
};

export const updateSynthese = async (id: number, data: SyntheseUpdateData) => {
  const end = dbQueryDuration.startTimer({ operation: 'synthese_update' });
  try {
    return await prisma.syntheseOP.update({
      where: { id },
      data,
    });
  } finally {
    end();
  }
};

export const deleteSynthese = async (id: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'synthese_delete' });
  try {
    return await prisma.syntheseOP.delete({ where: { id } });
  } finally {
    end();
  }
};
