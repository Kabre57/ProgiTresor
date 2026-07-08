import * as importFichierRepository from '../repositories/importFichierRepository';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export const getImportFichiers = async (limit: number, offset: number) => {
  const [list, total] = await Promise.all([
    importFichierRepository.findImportFichiers(limit, offset),
    importFichierRepository.countImportFichiers(),
  ]);
  return { list, total, limit, offset };
};

export const getImportFichierById = async (id: number) => {
  const importFichier = await importFichierRepository.findImportFichierById(id);
  if (!importFichier) {
    throw new NotFoundError(`Import fichier with id ${id} not found`);
  }
  return importFichier;
};
