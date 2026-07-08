import { Prisma, Niveau } from '@prisma/client/index';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';

export const findAll = async (): Promise<Niveau[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'niveau_find_all' });
  try { return await prisma.niveau.findMany({ orderBy: { anneeEtude: 'asc' }, include: { filiere: true } }); }
  finally { end(); }
};

export const findById = async (id: number): Promise<Niveau | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'niveau_find_by_id' });
  try { return await prisma.niveau.findUnique({ where: { id }, include: { filiere: true } }); }
  finally { end(); }
};

export const create = async (data: Prisma.NiveauUncheckedCreateInput): Promise<Niveau> => {
  const end = dbQueryDuration.startTimer({ operation: 'niveau_create' });
  try { return await prisma.niveau.create({ data, include: { filiere: true } }); }
  finally { end(); }
};

export const update = async (id: number, data: Prisma.NiveauUncheckedUpdateInput): Promise<Niveau> => {
  const end = dbQueryDuration.startTimer({ operation: 'niveau_update' });
  try { return await prisma.niveau.update({ where: { id }, data, include: { filiere: true } }); }
  finally { end(); }
};

export const remove = async (id: number): Promise<Niveau> => {
  const end = dbQueryDuration.startTimer({ operation: 'niveau_delete' });
  try { return await prisma.niveau.delete({ where: { id } }); }
  finally { end(); }
};

export const countDependencies = async (id: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'niveau_count_deps' });
  try {
    const [etudiant, nomenclatures] = await Promise.all([
      prisma.etudiant.count({ where: { niveauId: id } }),
      prisma.nomenclatureProduit.count({ where: { niveauId: id } }),
    ]);
    return etudiant + nomenclatures;
  } finally { end(); }
};
