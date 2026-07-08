import { Prisma, ConfigurationFraisNiveau } from '@prisma/client/index';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';

const defaultInclude = {
  nomenclatureProduit: {
    include: {
      typeRecette: { include: { typeFlux: true } }
    }
  },
  niveau: { include: { filiere: true } },
  statutEtudiant: true,
} satisfies Prisma.ConfigurationFraisNiveauInclude;

export type ConfigurationWithRelations = Prisma.ConfigurationFraisNiveauGetPayload<{ include: typeof defaultInclude }>;

export type ConfigurationFilters = {
  niveauId?: number;
  statutEtudiantId?: number;
  nomenclatureProduitId?: number;
};

export const findAll = async (filters: ConfigurationFilters = {}): Promise<ConfigurationWithRelations[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'config_frais_find_all' });
  try {
    const where: Prisma.ConfigurationFraisNiveauWhereInput = {};
    if (filters.niveauId) where.niveauId = filters.niveauId;
    if (filters.statutEtudiantId) where.statutEtudiantId = filters.statutEtudiantId;
    if (filters.nomenclatureProduitId) where.nomenclatureProduitId = filters.nomenclatureProduitId;

    return await prisma.configurationFraisNiveau.findMany({
      where,
      include: defaultInclude,
    });
  } finally {
    end();
  }
};

export const findById = async (id: number): Promise<ConfigurationWithRelations | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'config_frais_find_by_id' });
  try {
    return await prisma.configurationFraisNiveau.findUnique({
      where: { id },
      include: defaultInclude,
    });
  } finally {
    end();
  }
};

export const create = async (data: Prisma.ConfigurationFraisNiveauUncheckedCreateInput): Promise<ConfigurationWithRelations> => {
  const end = dbQueryDuration.startTimer({ operation: 'config_frais_create' });
  try {
    return await prisma.configurationFraisNiveau.create({
      data,
      include: defaultInclude,
    });
  } finally {
    end();
  }
};

export const update = async (id: number, data: Prisma.ConfigurationFraisNiveauUncheckedUpdateInput): Promise<ConfigurationWithRelations> => {
  const end = dbQueryDuration.startTimer({ operation: 'config_frais_update' });
  try {
    return await prisma.configurationFraisNiveau.update({
      where: { id },
      data,
      include: defaultInclude,
    });
  } finally {
    end();
  }
};

export const remove = async (id: number): Promise<ConfigurationFraisNiveau> => {
  const end = dbQueryDuration.startTimer({ operation: 'config_frais_remove' });
  try {
    return await prisma.configurationFraisNiveau.delete({
      where: { id },
    });
  } finally {
    end();
  }
};
