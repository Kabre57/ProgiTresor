import * as repo from '../repositories/typeRecetteRepository';
import * as typeFluxRepo from '../repositories/typeFluxRepository';
import { ConflictError, NotFoundError, AppError } from '../utils/errors';
import logger from '../utils/logger';
import type { TypeRecetteCreateInput, TypeRecetteUpdateInput } from '../../../../../shared/types/etudiant.types';

const isPrismaError = (e: unknown): e is { code: string } =>
  typeof e === 'object' && e !== null && 'code' in e;

export const getAll = (filters: repo.TypeRecetteFilters = {}) => repo.findAll(filters);

export const getById = async (id: number) => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('TypeRecette not found');
  return item;
};

export const create = async (data: TypeRecetteCreateInput) => {
  // Vérifier que le TypeFlux référencé existe
  const typeFlux = await typeFluxRepo.findById(data.typeFluxId);
  if (!typeFlux) throw new AppError(400, `TypeFlux with id ${data.typeFluxId} does not exist`);

  try {
    const tr = await repo.create(data);
    logger.info({ code: data.code }, 'TypeRecette created');
    return tr;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('TypeRecette code already exists');
    throw e;
  }
};

export const update = async (id: number, data: TypeRecetteUpdateInput) => {
  await getById(id);
  if (data.typeFluxId) {
    const typeFlux = await typeFluxRepo.findById(data.typeFluxId);
    if (!typeFlux) throw new AppError(400, `TypeFlux with id ${data.typeFluxId} does not exist`);
  }
  try { return await repo.update(id, data); }
  catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('TypeRecette code already exists');
    throw e;
  }
};

export const remove = async (id: number) => {
  await getById(id);
  const count = await repo.countNomenclatures(id);
  if (count > 0) throw new ConflictError(`Cannot delete: ${count} nomenclatures are linked`);
  return repo.remove(id);
};
