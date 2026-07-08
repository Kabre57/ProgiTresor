import { Prisma } from '@prisma/client/index';
import { prisma } from '../utils/prisma';
import { dbQueryDuration } from '../utils/metrics';

export type OtCreateData = Prisma.OrdreTraitementUncheckedCreateInput;
export type OtUpdateData = Prisma.OrdreTraitementUncheckedUpdateInput;

export const createOt = async (data: OtCreateData) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_create' });
  try {
    return await prisma.ordreTraitement.create({ data });
  } finally {
    end();
  }
};

export const findOtByCode = async (codeOt: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_find_by_code' });
  try {
    return await prisma.ordreTraitement.findUnique({
      where: { codeOt },
      include: { synthese: true },
    });
  } finally {
    end();
  }
};

export const updateOt = async (codeOt: string, data: OtUpdateData) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_update' });
  try {
    return await prisma.ordreTraitement.update({
      where: { codeOt },
      data,
    });
  } finally {
    end();
  }
};

export const deleteOt = async (codeOt: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_delete' });
  try {
    return await prisma.ordreTraitement.delete({ where: { codeOt } });
  } finally {
    end();
  }
};

export const findAllOts = async () => {
  const end = dbQueryDuration.startTimer({ operation: 'op_find_all' });
  try {
    return await prisma.ordreTraitement.findMany({
      orderBy: { dateCreation: 'desc' },
      include: { synthese: true },
    });
  } finally {
    end();
  }
};
