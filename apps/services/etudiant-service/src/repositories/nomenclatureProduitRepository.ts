import { Prisma, NomenclatureProduit } from '@prisma/client/index';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';

const defaultInclude = {
  typeRecette: { include: { typeFlux: true } },
} satisfies Prisma.NomenclatureProduitInclude;

export type NomenclatureWithRelations = Prisma.NomenclatureProduitGetPayload<{ include: typeof defaultInclude }>;

export type NomenclatureFilters = {
  typeRecetteId?: number;
  typeFluxId?: number;
  actif?: boolean;
};

export const findAll = async (filters: NomenclatureFilters = {}): Promise<NomenclatureWithRelations[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'nomenclature_find_all' });
  try {
    const where: Prisma.NomenclatureProduitWhereInput = {};
    if (filters.typeRecetteId) where.typeRecetteId = filters.typeRecetteId;
    if (filters.actif !== undefined) where.actif = filters.actif;
    if (filters.typeFluxId) {
      where.typeRecette = { typeFluxId: filters.typeFluxId };
    }

    return await prisma.nomenclatureProduit.findMany({
      where,
      orderBy: { libelle: 'asc' },
      include: defaultInclude,
    });
  }
  finally { end(); }
};

export const findById = async (id: number): Promise<NomenclatureWithRelations | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'nomenclature_find_by_id' });
  try { return await prisma.nomenclatureProduit.findUnique({ where: { id }, include: defaultInclude }); }
  finally { end(); }
};

export const create = async (data: Prisma.NomenclatureProduitUncheckedCreateInput): Promise<NomenclatureWithRelations> => {
  const end = dbQueryDuration.startTimer({ operation: 'nomenclature_create' });
  try { return await prisma.nomenclatureProduit.create({ data, include: defaultInclude }); }
  finally { end(); }
};

export const update = async (id: number, data: Prisma.NomenclatureProduitUncheckedUpdateInput): Promise<NomenclatureWithRelations> => {
  const end = dbQueryDuration.startTimer({ operation: 'nomenclature_update' });
  try { return await prisma.nomenclatureProduit.update({ where: { id }, data, include: defaultInclude }); }
  finally { end(); }
};

export const remove = async (id: number): Promise<NomenclatureProduit> => {
  const end = dbQueryDuration.startTimer({ operation: 'nomenclature_delete' });
  try { return await prisma.nomenclatureProduit.delete({ where: { id } }); }
  finally { end(); }
};
