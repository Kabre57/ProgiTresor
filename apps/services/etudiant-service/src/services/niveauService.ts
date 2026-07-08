import * as repo from '../repositories/niveauRepository';
import { ConflictError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import type { NiveauCreateInput, NiveauUpdateInput } from '../../../../../shared/types/etudiant.types';
import { getCachedReferential, invalidateReferential } from './referentialCache';

const CACHE_KEY = 'referential:niveaux';

const isPrismaError = (e: unknown): e is { code: string } =>
  typeof e === 'object' && e !== null && 'code' in e;

export const getAll = () => getCachedReferential(CACHE_KEY, repo.findAll);

export const getById = async (id: number) => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('Niveau not found');
  return item;
};

export const create = async (data: NiveauCreateInput) => {
  try {
    const niveau = await repo.create(data);
    await invalidateReferential(CACHE_KEY);
    logger.info({ code: data.code }, 'Niveau created');
    return niveau;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('Niveau code already exists');
    throw e;
  }
};

export const update = async (id: number, data: NiveauUpdateInput) => {
  await getById(id);
  try {
    const niveau = await repo.update(id, data);
    await invalidateReferential(CACHE_KEY);
    return niveau;
  }
  catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('Niveau code already exists');
    throw e;
  }
};

export const remove = async (id: number) => {
  await getById(id);
  const count = await repo.countDependencies(id);
  if (count > 0) throw new ConflictError(`Cannot delete: ${count} linked entities`);
  const niveau = await repo.remove(id);
  await invalidateReferential(CACHE_KEY);
  return niveau;
};
