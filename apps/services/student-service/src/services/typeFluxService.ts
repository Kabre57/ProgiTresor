import * as repo from '../repositories/typeFluxRepository';
import { ConflictError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import type { TypeFluxCreateInput, TypeFluxUpdateInput } from '../../../../../shared/types/student.types';

const isPrismaError = (e: unknown): e is { code: string } =>
  typeof e === 'object' && e !== null && 'code' in e;

export const getAll = () => repo.findAll();

export const getById = async (id: number) => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('TypeFlux not found');
  return item;
};

export const create = async (data: TypeFluxCreateInput) => {
  try {
    const tf = await repo.create(data);
    logger.info({ code: data.code }, 'TypeFlux created');
    return tf;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('TypeFlux code already exists');
    throw e;
  }
};

export const update = async (id: number, data: TypeFluxUpdateInput) => {
  await getById(id);
  try { return await repo.update(id, data); }
  catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('TypeFlux code already exists');
    throw e;
  }
};

export const remove = async (id: number) => {
  await getById(id);
  const count = await repo.countRecettes(id);
  if (count > 0) throw new ConflictError(`Cannot delete: ${count} TypeRecette are linked`);
  return repo.remove(id);
};
