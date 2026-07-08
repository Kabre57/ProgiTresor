import * as repo from '../repositories/antenneRepository';
import { ConflictError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import type { AntenneCreateInput, AntenneUpdateInput } from '../../../../../shared/types/etudiant.types';
import { getCachedReferential, invalidateReferential } from './referentialCache';

const CACHE_KEY = 'referential:antennes';

const isPrismaError = (e: unknown): e is { code: string } =>
  typeof e === 'object' && e !== null && 'code' in e;

export const getAll = () => getCachedReferential(CACHE_KEY, repo.findAll);

export const getById = async (id: number) => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('Antenne not found');
  return item;
};

export const create = async (data: AntenneCreateInput) => {
  try {
    const antenne = await repo.create(data);
    await invalidateReferential(CACHE_KEY);
    logger.info({ code: data.code }, 'Antenne created');
    return antenne;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('Antenne code or nom already exists');
    throw e;
  }
};

export const update = async (id: number, data: AntenneUpdateInput) => {
  await getById(id);
  try {
    const antenne = await repo.update(id, data);
    await invalidateReferential(CACHE_KEY);
    return antenne;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('Antenne code or nom already exists');
    throw e;
  }
};

export const remove = async (id: number) => {
  await getById(id);
  const count = await repo.countEtudiants(id);
  if (count > 0) throw new ConflictError(`Cannot delete: ${count} étudiants are linked to this antenne`);
  const antenne = await repo.remove(id);
  await invalidateReferential(CACHE_KEY);
  return antenne;
};
