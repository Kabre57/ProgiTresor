import { Prisma, Filiere } from '@prisma/client/index';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';

export const findAll = async (): Promise<Filiere[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'filiere_find_all' });
  try { return await prisma.filiere.findMany({ orderBy: { anneeEtude: 'asc' } }); }
  finally { end(); }
};

export const findById = async (id: number): Promise<Filiere | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'filiere_find_by_id' });
  try { return await prisma.filiere.findUnique({ where: { id } }); }
  finally { end(); }
};

export const create = async (data: Prisma.FiliereCreateInput): Promise<Filiere> => {
  const end = dbQueryDuration.startTimer({ operation: 'filiere_create' });
  try { return await prisma.filiere.create({ data }); }
  finally { end(); }
};

export const update = async (id: number, data: Prisma.FiliereUpdateInput): Promise<Filiere> => {
  const end = dbQueryDuration.startTimer({ operation: 'filiere_update' });
  try { return await prisma.filiere.update({ where: { id }, data }); }
  finally { end(); }
};

export const remove = async (id: number): Promise<Filiere> => {
  const end = dbQueryDuration.startTimer({ operation: 'filiere_delete' });
  try { return await prisma.filiere.delete({ where: { id } }); }
  finally { end(); }
};

export const countDependencies = async (id: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'filiere_count_deps' });
  try {
    const [etudiant, nomenclatures] = await Promise.all([
      prisma.etudiant.count({ where: { filiereId: id } }),
      prisma.nomenclatureProduit.count({ where: { filiereId: id } }),
    ]);
    return etudiant + nomenclatures;
  } finally { end(); }
};
