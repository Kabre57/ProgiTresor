import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { dbQueryDuration } from '../utils/metrics';
import { prisma } from '../utils/prisma';

// Types
export type UserWithRole = Prisma.UtilisateurGetPayload<{
  include: { role: true };
}>;

export type UserProfile = Prisma.UtilisateurGetPayload<{
  select: {
    id: true;
    username: true;
    nom: true;
    prenom: true;
    email: true;
    service: true;
    actif: true;
    photoUrl: true;
    dateCreation: true;
    derniereConnexion: true;
    role: {
      select: {
        id: true;
        code: true;
        libelle: true;
        description: true;
      };
    };
  };
}>;

export type UserCreateData = {
  nom: string;
  prenom: string;
  username: string;
  email: string;
  motDePasseHash: string;
  roleId: number;
  service?: string;
  photoUrl?: string | null;
};

export type UserUpdateData = Prisma.UtilisateurUpdateInput;

const userProfileSelect = {
  id: true,
  username: true,
  nom: true,
  prenom: true,
  email: true,
  service: true,
  actif: true,
  photoUrl: true,
  dateCreation: true,
  derniereConnexion: true,
  role: {
    select: {
      id: true,
      code: true,
      libelle: true,
      description: true,
    },
  },
} satisfies Prisma.UtilisateurSelect;

// ---- Fonctions (utilisent `prisma`) ----

export const findRoleByCode = async (code: string) => {
  return prisma.role.findUnique({ where: { code } });
};

export const findUserByUsername = async (username: string): Promise<UserWithRole | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'user_find_by_username' });
  try {
    return await prisma.utilisateur.findUnique({
      where: { username },
      include: { role: true },
    });
  } finally {
    end();
  }
};

export const findUserById = async (userId: number): Promise<UserProfile | null> => {
  const end = dbQueryDuration.startTimer({ operation: 'user_find_by_id' });
  try {
    return await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: userProfileSelect,
    });
  } finally {
    end();
  }
};

export const findAllUsers = async (skip = 0, take = 20): Promise<UserProfile[]> => {
  const end = dbQueryDuration.startTimer({ operation: 'user_find_all' });
  try {
    return await prisma.utilisateur.findMany({
      skip,
      take,
      select: userProfileSelect,
      orderBy: { dateCreation: 'desc' },
    });
  } finally {
    end();
  }
};

export const countUsers = async (): Promise<number> => {
  const end = dbQueryDuration.startTimer({ operation: 'user_count' });
  try {
    return await prisma.utilisateur.count();
  } finally {
    end();
  }
};

export const createUser = async (data: UserCreateData): Promise<UserWithRole> => {
  const end = dbQueryDuration.startTimer({ operation: 'user_create' });
  try {
    return await prisma.utilisateur.create({
      data,
      include: { role: true },
    });
  } finally {
    end();
  }
};

export const updateUser = async (userId: number, data: UserUpdateData): Promise<UserWithRole> => {
  const end = dbQueryDuration.startTimer({ operation: 'user_update' });
  try {
    return await prisma.utilisateur.update({
      where: { id: userId },
      data,
      include: { role: true },
    });
  } finally {
    end();
  }
};

export const deleteUser = async (userId: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'user_delete' });
  try {
    return await prisma.utilisateur.delete({ where: { id: userId } });
  } finally {
    end();
  }
};

export const updateUserLastLogin = async (userId: number): Promise<UserWithRole> => {
  const end = dbQueryDuration.startTimer({ operation: 'user_update_last_login' });
  try {
    return await prisma.utilisateur.update({
      where: { id: userId },
      data: { derniereConnexion: new Date() },
      include: { role: true },
    });
  } finally {
    end();
  }
};

export const createAuditLog = async (
  userId: number | null,
  action: string,
  details: string,
  entite?: string,
  entiteId?: string,
) => {
  const end = dbQueryDuration.startTimer({ operation: 'audit_create' });
  try {
    return await prisma.journalAudit.create({
      data: {
        utilisateurId: userId,
        action,
        entite,
        entiteId,
        details,
      },
    });
  } catch (e) {
    logger.error(e, 'Failed to save audit log');
    throw e;
  } finally {
    end();
  }
};

export const getPrismaClient = () => prisma;
