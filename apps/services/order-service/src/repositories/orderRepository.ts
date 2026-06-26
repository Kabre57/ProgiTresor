import { Prisma } from '@prisma/client/index';
import { prisma } from '../utils/prisma';
import { dbQueryDuration } from '../utils/metrics';

export type OpCreateData = Prisma.OrdrePaiementUncheckedCreateInput;
export type OpUpdateData = Prisma.OrdrePaiementUncheckedUpdateInput;

export const createOp = async (data: OpCreateData) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_create' });
  try {
    return await prisma.ordrePaiement.create({ data });
  } finally {
    end();
  }
};

export const findOpByCode = async (codeOp: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_find_by_code' });
  try {
    return await prisma.ordrePaiement.findUnique({
      where: { codeOp },
      include: { synthese: true },
    });
  } finally {
    end();
  }
};

export const updateOp = async (codeOp: string, data: OpUpdateData) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_update' });
  try {
    return await prisma.ordrePaiement.update({
      where: { codeOp },
      data,
    });
  } finally {
    end();
  }
};

export const deleteOp = async (codeOp: string) => {
  const end = dbQueryDuration.startTimer({ operation: 'op_delete' });
  try {
    return await prisma.ordrePaiement.delete({ where: { codeOp } });
  } finally {
    end();
  }
};

export const findAllOps = async () => {
  const end = dbQueryDuration.startTimer({ operation: 'op_find_all' });
  try {
    return await prisma.ordrePaiement.findMany({
      orderBy: { dateCreation: 'desc' },
      include: { synthese: true },
    });
  } finally {
    end();
  }
};
