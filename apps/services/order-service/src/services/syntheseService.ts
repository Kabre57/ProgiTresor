import * as syntheseRepository from '../repositories/syntheseRepository';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export const getSyntheses = async (limit: number, offset: number) => {
  const [list, total] = await Promise.all([
    syntheseRepository.findAllSyntheses(limit, offset),
    syntheseRepository.countSyntheses(),
  ]);
  return { list, total, limit, offset };
};

export const getSyntheseById = async (id: number) => {
  const synthese = await syntheseRepository.findSyntheseById(id);
  if (!synthese) {
    throw new NotFoundError(`Synthese OT with id ${id} not found`);
  }
  return synthese;
};

export const getSyntheseByReference = async (reference: string) => {
  const synthese = await syntheseRepository.findSyntheseByReference(reference);
  if (!synthese) {
    throw new NotFoundError(`Synthese OT with reference ${reference} not found`);
  }
  return synthese;
};

export const updateSyntheseStatut = async (id: number, statut: string, transmisParId?: number) => {
  const synthese = await syntheseRepository.findSyntheseById(id);
  if (!synthese) {
    throw new NotFoundError(`Synthese OT with id ${id} not found`);
  }

  const updateData: syntheseRepository.SyntheseUpdateData = { statut };

  if (statut === 'Transmis') {
    updateData.dateTransmission = new Date();
    if (transmisParId) {
      updateData.transmisParId = transmisParId;
    }
  }

  return syntheseRepository.updateSynthese(id, updateData);
};
