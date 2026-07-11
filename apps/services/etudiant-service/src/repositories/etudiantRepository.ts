import { Prisma } from '@prisma/client/index';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';

const defaultInclude = {
  antenne: true,
  filiere: true,
  statut: true,
  promotion: true,
  nomenclatures: true,
} satisfies Prisma.EtudiantInclude;

export type EtudiantWithRelations = Prisma.EtudiantGetPayload<{
  include: typeof defaultInclude;
}>;

export type EtudiantCreateData = Prisma.EtudiantUncheckedCreateInput;
export type EtudiantUpdateData = Prisma.EtudiantUncheckedUpdateInput;

export const findByMatricule = async (matricule: string): Promise<EtudiantWithRelations | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'etudiant_find_by_matricule' });
  try {
    return await prisma.etudiant.findUnique({
      where: { matricule },
      include: defaultInclude,
    });
  } finally {
    end();
  }
};

export const findByMatriculeTresorPay = async (matriculeTresorPay: string): Promise<EtudiantWithRelations | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'etudiant_find_by_matricule_tresor_pay' });
  try {
    return await prisma.etudiant.findUnique({
      where: { matriculeTresorPay },
      include: defaultInclude,
    });
  } finally {
    end();
  }
};

export const findManyByMatricules = async (matricules: string[]): Promise<EtudiantWithRelations[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'etudiant_find_many_by_matricules' });
  try {
    return await prisma.etudiant.findMany({
      where: { matricule: { in: matricules } },
      include: defaultInclude,
    });
  } finally {
    end();
  }
};

export const findManyByMatriculesOrTresorPay = async (matricules: string[]): Promise<EtudiantWithRelations[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'etudiant_find_many_by_matricules_or_tresor_pay' });
  try {
    return await prisma.etudiant.findMany({
      where: {
        OR: [
          { matricule: { in: matricules } },
          { matriculeTresorPay: { in: matricules } }
        ]
      },
      include: defaultInclude,
    });
  } finally {
    end();
  }
};

export const createEtudiant = async (data: EtudiantCreateData): Promise<EtudiantWithRelations> => {
  const end = dbQueryDuration.startTimer({ operation: 'etudiant_create' });
  try {
    return await prisma.etudiant.create({
      data,
      include: defaultInclude,
    });
  } finally {
    end();
  }
};

export const updateEtudiant = async (
  matricule: string,
  data: EtudiantUpdateData,
): Promise<EtudiantWithRelations> => {
  const end = dbQueryDuration.startTimer({ operation: 'etudiant_update' });
  try {
    return await prisma.etudiant.update({
      where: { matricule },
      data,
      include: defaultInclude,
    });
  } finally {
    end();
  }
};

export const searchEtudiants = async (
  query?: string,
  antenneId?: number | number[],
  filiereId?: number | number[],
  statutId?: number | number[],
  promotion?: string | string[],
  promotionId?: number | number[]
): Promise<EtudiantWithRelations[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'etudiant_search' });
  try {
    const where: Prisma.EtudiantWhereInput = {};
    if (query) {
      where.OR = [
        { matricule: { contains: query, mode: 'insensitive' } },
        { nom: { contains: query, mode: 'insensitive' } },
        { prenom: { contains: query, mode: 'insensitive' } },
        { matriculeTresorPay: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (antenneId) {
      if (Array.isArray(antenneId)) {
        where.antenneId = { in: antenneId };
      } else {
        where.antenneId = antenneId;
      }
    }
    if (filiereId) {
      if (Array.isArray(filiereId)) {
        where.filiereId = { in: filiereId };
      } else {
        where.filiereId = filiereId;
      }
    }
    if (statutId) {
      if (Array.isArray(statutId)) {
        where.statutId = { in: statutId };
      } else {
        where.statutId = statutId;
      }
    }
    if (promotion) {
      if (Array.isArray(promotion)) {
        where.promotionString = { in: promotion };
      } else {
        if (promotion.includes(',')) {
          const promoList = promotion.split(',').map(p => p.trim()).filter(Boolean);
          where.promotionString = { in: promoList };
        } else {
          where.promotionString = promotion;
        }
      }
    }
    if (promotionId) {
      if (Array.isArray(promotionId)) {
        where.promotionId = { in: promotionId };
      } else {
        where.promotionId = promotionId;
      }
    }
    return await prisma.etudiant.findMany({
      where,
      include: defaultInclude,
    });
  } finally {
    end();
  }
};

export const findManyByIds = async (ids: number[]): Promise<EtudiantWithRelations[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'etudiant_find_many_by_ids' });
  try {
    return await prisma.etudiant.findMany({
      where: { id: { in: ids } },
      include: defaultInclude,
    });
  } finally {
    end();
  }
};

export const getPrismaClient = () => prisma;

export const countEtudiantsByGroups = async () => {
  const end = dbQueryDuration.startTimer({ operation: 'etudiant_count_by_groups' });
  try {
    return await prisma.etudiant.groupBy({
      by: ['promotionId', 'statutId'],
      _count: {
        id: true,
      },
    });
  } finally {
    end();
  }
};

