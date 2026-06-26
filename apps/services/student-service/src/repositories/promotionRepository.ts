import { Prisma, Promotion } from '@prisma/client/index';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';

export const findAll = async () => {
  const end = dbQueryDuration.startTimer({ operation: 'promotion_find_all' });
  try {
    return await prisma.promotion.findMany({
      orderBy: { ordre: 'asc' },
      include: {
        _count: {
          select: { etudiants: true }
        }
      }
    });
  }
  finally { end(); }
};

export const findById = async (id: number): Promise<Promotion | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'promotion_find_by_id' });
  try { return await prisma.promotion.findUnique({ where: { id } }); }
  finally { end(); }
};

export const findByName = async (nom: string): Promise<Promotion | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'promotion_find_by_name' });
  try { return await prisma.promotion.findUnique({ where: { nom } }); }
  finally { end(); }
};

export const create = async (data: Prisma.PromotionCreateInput): Promise<Promotion> => {
  const end = dbQueryDuration.startTimer({ operation: 'promotion_create' });
  try { return await prisma.promotion.create({ data }); }
  finally { end(); }
};

export const update = async (id: number, data: Prisma.PromotionUpdateInput): Promise<Promotion> => {
  const end = dbQueryDuration.startTimer({ operation: 'promotion_update' });
  try { return await prisma.promotion.update({ where: { id }, data }); }
  finally { end(); }
};

export const remove = async (id: number): Promise<Promotion> => {
  const end = dbQueryDuration.startTimer({ operation: 'promotion_delete' });
  try { return await prisma.promotion.delete({ where: { id } }); }
  finally { end(); }
};

export const countEtudiants = async (id: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'promotion_count_etudiants' });
  try { return await prisma.etudiant.count({ where: { promotionId: id } }); }
  finally { end(); }
};
