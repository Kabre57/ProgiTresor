import * as repo from '../repositories/configurationFraisNiveauRepository';
import * as nomenclatureRepo from '../repositories/nomenclatureProduitRepository';
import * as niveauRepo from '../repositories/niveauRepository';
import * as statutRepo from '../repositories/statutEtudiantRepository';
import { ConflictError, NotFoundError, AppError } from '../utils/errors';
import logger from '../utils/logger';
import type { 
  ConfigurationFraisNiveauCreateInput, 
  ConfigurationFraisNiveauUpdateInput 
} from '../../../../../shared/types/etudiant.types';

const isPrismaError = (e: unknown): e is { code: string } =>
  typeof e === 'object' && e !== null && 'code' in e;

export const getAll = (filters: repo.ConfigurationFilters = {}) => repo.findAll(filters);

export const getById = async (id: number) => {
  const item = await repo.findById(id);
  if (!item) throw new NotFoundError('ConfigurationFraisNiveau not found');
  return item;
};

const validateForeignKeys = async (data: { nomenclatureProduitId?: number; niveauId?: number; statutEtudiantId?: number }) => {
  if (data.nomenclatureProduitId) {
    const nom = await nomenclatureRepo.findById(data.nomenclatureProduitId);
    if (!nom) throw new AppError(400, `NomenclatureProduit with id ${data.nomenclatureProduitId} does not exist`);
  }
  if (data.niveauId) {
    const niveau = await niveauRepo.findById(data.niveauId);
    if (!niveau) throw new AppError(400, `Niveau with id ${data.niveauId} does not exist`);
  }
  if (data.statutEtudiantId) {
    const stat = await statutRepo.findById(data.statutEtudiantId);
    if (!stat) throw new AppError(400, `StatutEtudiant with id ${data.statutEtudiantId} does not exist`);
  }
};

export const create = async (data: ConfigurationFraisNiveauCreateInput) => {
  await validateForeignKeys(data);
  try {
    const config = await repo.create({
      nomenclatureProduitId: data.nomenclatureProduitId,
      niveauId: data.niveauId,
      statutEtudiantId: data.statutEtudiantId,
      montantSpecifique: data.montantSpecifique,
      estObligatoire: data.estObligatoire,
      dateDebutValidite: data.dateDebutValidite || new Date(),
      dateFinValidite: data.dateFinValidite,
    });
    logger.info({ id: config.id }, 'ConfigurationFraisNiveau created');
    return config;
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') {
      throw new ConflictError('A configuration already exists for this nomenclature, level, and student status');
    }
    throw e;
  }
};

export const update = async (id: number, data: ConfigurationFraisNiveauUpdateInput) => {
  await getById(id);
  await validateForeignKeys(data);
  try {
    return await repo.update(id, data);
  } catch (e: unknown) {
    if (isPrismaError(e) && e.code === 'P2002') {
      throw new ConflictError('A configuration conflict exists with these values');
    }
    throw e;
  }
};

export const remove = async (id: number) => {
  await getById(id);
  return await repo.remove(id);
};
