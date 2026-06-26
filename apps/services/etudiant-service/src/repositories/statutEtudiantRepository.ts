import { Prisma, StatutEtudiant } from '@prisma/client/index';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';

export const findAll = async (): Promise<StatutEtudiant[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'statut_find_all' });
  try { return await prisma.statutEtudiant.findMany({ orderBy: { libelle: 'asc' } }); }
  finally { end(); }
};

export const findById = async (id: number): Promise<StatutEtudiant | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'statut_find_by_id' });
  try { return await prisma.statutEtudiant.findUnique({ where: { id } }); }
  finally { end(); }
};

export const create = async (data: Prisma.StatutEtudiantCreateInput): Promise<StatutEtudiant> => {
  const end = dbQueryDuration.startTimer({ operation: 'statut_create' });
  try { return await prisma.statutEtudiant.create({ data }); }
  finally { end(); }
};

export const update = async (id: number, data: Prisma.StatutEtudiantUpdateInput): Promise<StatutEtudiant> => {
  const end = dbQueryDuration.startTimer({ operation: 'statut_update' });
  try { return await prisma.statutEtudiant.update({ where: { id }, data }); }
  finally { end(); }
};

export const remove = async (id: number): Promise<StatutEtudiant> => {
  const end = dbQueryDuration.startTimer({ operation: 'statut_delete' });
  try { return await prisma.statutEtudiant.delete({ where: { id } }); }
  finally { end(); }
};

export const countDependencies = async (id: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'statut_count_deps' });
  try {
    const [etudiant, nomenclatures] = await Promise.all([
      prisma.etudiant.count({ where: { statutId: id } }),
      prisma.nomenclatureProduit.count({ where: { statutId: id } }),
    ]);
    return etudiant + nomenclatures;
  } finally { end(); }
};
