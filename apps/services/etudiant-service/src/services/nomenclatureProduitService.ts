import * as repo from '../repositories/nomenclatureProduitRepository';
import * as typeRecetteRepo from '../repositories/typeRecetteRepository';
import { ConflictError, NotFoundError, AppError } from '../utils/errors';
import logger from '../utils/logger';
import type { NomenclatureProduitCreateInput, NomenclatureProduitUpdateInput } from '../../../../../shared/types/etudiant.types';

const isPrismaError = (e: unknown): e is { code: string } =>
  typeof e === 'object' && e !== null && 'code' in e;

export const getAll = (filters: repo.NomenclatureFilters = {}) => repo.findAll(filters);

export const getById = async (id: number) => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('NomenclatureProduit not found');
  return item;
};

const validateForeignKeys = async (data: { typeRecetteId?: number }) => {
  if (data.typeRecetteId) {
    const tr = await typeRecetteRepo.findById(data.typeRecetteId);
    if (!tr) throw new AppError(400, `TypeRecette with id ${data.typeRecetteId} does not exist`);
  }
};

export const create = async (data: NomenclatureProduitCreateInput) => {
  await validateForeignKeys(data);
  try {
    const nom = await repo.create(data);
    logger.info({ codeProduit: data.codeProduit }, 'NomenclatureProduit created');
    return nom;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('NomenclatureProduit libelleBrut already exists');
    throw e;
  }
};

export const update = async (id: number, data: NomenclatureProduitUpdateInput) => {
  await getById(id);
  await validateForeignKeys(data);
  try { return await repo.update(id, data); }
  catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') throw new ConflictError('NomenclatureProduit libelleBrut already exists');
    throw e;
  }
};

export const remove = async (id: number) => {
  await getById(id);
  return repo.remove(id);
};
