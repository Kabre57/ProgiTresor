import * as repo from '../repositories/statutEtudiantRepository';
import { ConflictError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import type { StatutEtudiantCreateInput, StatutEtudiantUpdateInput } from '../../../../../shared/types/etudiant.types';

const isPrismaError = (e: unknown): e is { code: string } =>
  typeof e === 'object' && e !== null && 'code' in e;

export const getAll = () => repo.findAll();

export const getById = async (id: number) => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('StatutEtudiant not found');
  return item;
};

export const create = async (data: StatutEtudiantCreateInput) => {
  try {
    const statut = await repo.create(data);
    logger.info({ code: data.code }, 'StatutEtudiant created');
    return statut;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('StatutEtudiant code already exists');
    throw e;
  }
};

export const update = async (id: number, data: StatutEtudiantUpdateInput) => {
  await getById(id);
  try { return await repo.update(id, data); }
  catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('StatutEtudiant code already exists');
    throw e;
  }
};

export const remove = async (id: number) => {
  await getById(id);
  const count = await repo.countDependencies(id);
  if (count > 0) throw new ConflictError(`Cannot delete: ${count} linked entities`);
  return repo.remove(id);
};
