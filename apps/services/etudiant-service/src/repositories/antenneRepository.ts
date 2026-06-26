import { Prisma, Antenne } from '@prisma/client/index';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';

export const findAll = async (): Promise<Antenne[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'antenne_find_all' });
  try { return await prisma.antenne.findMany({ orderBy: { nom: 'asc' } }); }
  finally { end(); }
};

export const findById = async (id: number): Promise<Antenne | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'antenne_find_by_id' });
  try { return await prisma.antenne.findUnique({ where: { id } }); }
  finally { end(); }
};

export const create = async (data: Prisma.AntenneCreateInput): Promise<Antenne> => {
  const end = dbQueryDuration.startTimer({ operation: 'antenne_create' });
  try { return await prisma.antenne.create({ data }); }
  finally { end(); }
};

export const update = async (id: number, data: Prisma.AntenneUpdateInput): Promise<Antenne> => {
  const end = dbQueryDuration.startTimer({ operation: 'antenne_update' });
  try { return await prisma.antenne.update({ where: { id }, data }); }
  finally { end(); }
};

export const remove = async (id: number): Promise<Antenne> => {
  const end = dbQueryDuration.startTimer({ operation: 'antenne_delete' });
  try { return await prisma.antenne.delete({ where: { id } }); }
  finally { end(); }
};

export const countEtudiants = async (id: number): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'antenne_count_etudiant' });
  try { return await prisma.etudiant.count({ where: { antenneId: id } }); }
  finally { end(); }
};
