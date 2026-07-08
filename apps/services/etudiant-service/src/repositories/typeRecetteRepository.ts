import { Prisma, TypeRecette } from '@prisma/client/index';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';

const defaultInclude = { typeFlux: true } satisfies Prisma.TypeRecetteInclude;

export type TypeRecetteWithRelations = Prisma.TypeRecetteGetPayload<{ include: typeof defaultInclude }>;

export type TypeRecetteFilters = {
  typeFluxId?: number;
};

export const findAll = async (filters: TypeRecetteFilters = {}): Promise<TypeRecetteWithRelations[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'type_recette_find_all' });
  try {
    return await prisma.typeRecette.findMany({
      where: filters.typeFluxId ? { typeFluxId: filters.typeFluxId } : undefined,
      orderBy: { libelle: 'asc' },
      include: defaultInclude,
    });
  }
  finally { end(); }
};

export const findById = async (id: number): Promise<TypeRecetteWithRelations | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'type_recette_find_by_id' });
  try { return await prisma.typeRecette.findUnique({ where: { id }, include: defaultInclude }); }
  finally { end(); }
};

export const create = async (data: Prisma.TypeRecetteUncheckedCreateInput): Promise<TypeRecetteWithRelations> => {
  const end = dbQueryDuration.startTimer({ operation: 'type_recette_create' });
  try { return await prisma.typeRecette.create({ data, include: defaultInclude }); }
  finally { end(); }
};

export const update = async (id: number, data: Prisma.TypeRecetteUncheckedUpdateInput): Promise<TypeRecetteWithRelations> => {
  const end = dbQueryDuration.startTimer({ operation: 'type_recette_update' });
  try { return await prisma.typeRecette.update({ where: { id }, data, include: defaultInclude }); }
  finally { end(); }
};

export const remove = async (id: number): Promise<TypeRecette> => {
  const end = dbQueryDuration.startTimer({ operation: 'type_recette_delete' });
  try { return await prisma.typeRecette.delete({ where: { id } }); }
  finally { end(); }
};

export const countNomenclatures = async (id: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'type_recette_count_nomenclatures' });
  try { return await prisma.nomenclatureProduit.count({ where: { typeRecetteId: id } }); }
  finally { end(); }
};
