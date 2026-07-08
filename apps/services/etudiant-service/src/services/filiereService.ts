import * as repo from '../repositories/filiereRepository';
import { ConflictError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import type { FiliereCreateInput, FiliereUpdateInput } from '../../../../../shared/types/etudiant.types';
import { getCachedReferential, invalidateReferential } from './referentialCache';

const CACHE_KEY = 'referential:filieres';

const isPrismaError = (e: unknown): e is { code: string } =>
  typeof e === 'object' && e !== null && 'code' in e;

export const getAll = () => getCachedReferential(CACHE_KEY, repo.findAll);

export const getById = async (id: number) => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('Filiere not found');
  return item;
};

export const create = async (data: FiliereCreateInput) => {
  try {
    const filiere = await repo.create(data);
    await invalidateReferential(CACHE_KEY);
    logger.info({ code: data.code }, 'Filiere created');
    return filiere;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('Filiere code already exists');
    throw e;
  }
};

export const update = async (id: number, data: FiliereUpdateInput) => {
  await getById(id);
  try {
    const filiere = await repo.update(id, data);
    await invalidateReferential(CACHE_KEY);
    return filiere;
  }
  catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('Filiere code already exists');
    throw e;
  }
};

export const remove = async (id: number) => {
  await getById(id);
  const count = await repo.countDependencies(id);
  if (count > 0) throw new ConflictError(`Cannot delete: ${count} linked entities`);
  const filiere = await repo.remove(id);
  await invalidateReferential(CACHE_KEY);
  return filiere;
};
