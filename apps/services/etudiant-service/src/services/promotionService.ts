import * as repo from '../repositories/promotionRepository';
import { ConflictError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import type { PromotionCreateInput, PromotionUpdateInput } from '../../../../../shared/types/etudiant.types';
import { getCachedReferential, invalidateReferential } from './referentialCache';

const CACHE_KEY = 'referential:promotions';

const isPrismaError = (e: unknown): e is { code: string } =>
  typeof e === 'object' && e !== null && 'code' in e;

export const getAll = () => getCachedReferential(CACHE_KEY, repo.findAll);

export const getById = async (id: number) => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('Promotion not found');
  return item;
};

export const create = async (data: PromotionCreateInput) => {
  try {
    const promotion = await repo.create(data);
    await invalidateReferential(CACHE_KEY);
    logger.info({ nom: data.nom }, 'Promotion created');
    return promotion;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('Promotion with this nom already exists');
    throw e;
  }
};

export const update = async (id: number, data: PromotionUpdateInput) => {
  await getById(id);
  try {
    const promotion = await repo.update(id, data);
    await invalidateReferential(CACHE_KEY);
    return promotion;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('Promotion with this nom already exists');
    throw e;
  }
};

export const remove = async (id: number) => {
  await getById(id);
  const count = await repo.countEtudiants(id);
  if (count > 0) throw new ConflictError(`Cannot delete: ${count} étudiants are linked to this promotion`);
  const promotion = await repo.remove(id);
  await invalidateReferential(CACHE_KEY);
  return promotion;
};
