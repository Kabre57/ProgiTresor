import { Prisma, TypeFlux } from '@prisma/client/index';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';

export const findAll = async (): Promise<TypeFlux[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'type_flux_find_all' });
  try { return await prisma.typeFlux.findMany({ orderBy: { libelle: 'asc' } }); }
  finally { end(); }
};

export const findById = async (id: number): Promise<TypeFlux | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'type_flux_find_by_id' });
  try { return await prisma.typeFlux.findUnique({ where: { id } }); }
  finally { end(); }
};

export const create = async (data: Prisma.TypeFluxCreateInput): Promise<TypeFlux> => {
  const end = dbQueryDuration.startTimer({ operation: 'type_flux_create' });
  try { return await prisma.typeFlux.create({ data }); }
  finally { end(); }
};

export const update = async (id: number, data: Prisma.TypeFluxUpdateInput): Promise<TypeFlux> => {
  const end = dbQueryDuration.startTimer({ operation: 'type_flux_update' });
  try { return await prisma.typeFlux.update({ where: { id }, data }); }
  finally { end(); }
};

export const remove = async (id: number): Promise<TypeFlux> => {
  const end = dbQueryDuration.startTimer({ operation: 'type_flux_delete' });
  try { return await prisma.typeFlux.delete({ where: { id } }); }
  finally { end(); }
};

export const countRecettes = async (id: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'type_flux_count_recettes' });
  try { return await prisma.typeRecette.count({ where: { typeFluxId: id } }); }
  finally { end(); }
};
