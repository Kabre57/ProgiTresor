import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import * as userRepository from '../repositories/userRepository';
import type { UserUpdateData, UserWithRole } from '../repositories/userRepository';
import { UnauthorizedError, NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { prisma } from '../utils/prisma';
import { buildUserPermissionsPayload } from './authPermissionPayload';
import crypto from 'crypto';
import Redis from 'ioredis';

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!JWT_SECRET || !REFRESH_TOKEN_SECRET) {
  console.error(
    '[auth-service] FATAL: JWT_SECRET and REFRESH_TOKEN_SECRET must be set as environment variables. Refusing to start.',
  );
  process.exit(1);
}

// Connexion au cache Redis partagé
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

interface RefreshTokenPayload extends JwtPayload {
  userId: number;
  token_version: number;
}

type PublicUser = {
  id: number;
  username: string;
  nom: string;
  prenom: string;
  email: string;
  service: string | null;
  actif: boolean;
  photoUrl: string | null;
  role: {
    id: number;
    code: string;
    libelle: string;
    description: string | null;
  };
  dateCreation: Date;
  derniereConnexion: Date | null;
};

const isRefreshTokenPayload = (payload: string | JwtPayload): payload is RefreshTokenPayload => {
  return (
    typeof payload !== 'string' &&
    typeof payload.userId === 'number' &&
    typeof payload.token_version === 'number'
  );
};

const toPublicUser = (user: UserWithRole): PublicUser => ({
  id: user.id,
  username: user.username,
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  service: user.service,
  actif: user.actif,
  photoUrl: user.photoUrl,
  role: {
    id: user.role.id,
    code: user.role.code,
    libelle: user.role.libelle,
    description: user.role.description,
  },
  dateCreation: user.dateCreation,
  derniereConnexion: user.derniereConnexion,
});

export const loginUser = async (username: string, password: string) => {
  const user = await userRepository.findUserByUsername(username);
  if (!user || !user.actif) {
    throw new UnauthorizedError('Invalid username or password');
  }

  const match = await bcrypt.compare(password, user.motDePasseHash);
  if (!match) {
    throw new UnauthorizedError('Invalid username or password');
  }

  const updatedUser = await userRepository.updateUserLastLogin(user.id);

  // Construction du payload des permissions
  const permissionsPayload = await buildUserPermissionsPayload(user.id);

  const payload = {
    sub: user.id,
    userId: user.id,
    role: user.role.code,
    username: user.username,
    perms: permissionsPayload.perms,
    denies: permissionsPayload.denies,
    token_version: permissionsPayload.version,
    jti: crypto.randomUUID(),
  };

  // Signer l'access token (durée 1h)
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  // Stocker le JTI actif de l'utilisateur dans Redis avec un TTL de 1h
  await redis.set(`user:${user.id}:active_jti`, payload.jti, 'EX', 3600);

  // Signer le refresh token en y incluant la version actuelle du jeton de l'utilisateur
  const refreshToken = jwt.sign(
    { userId: user.id, token_version: permissionsPayload.version },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' },
  );

  // Enregistrer le refresh token en DB
  const expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      utilisateurId: user.id,
      expireAt,
    },
  });

  await userRepository.createAuditLog(
    user.id,
    'LOGIN',
    `User ${username} logged in successfully`,
    'Utilisateur',
    String(user.id)
  );

  return {
    token,
    refreshToken,
    user: toPublicUser(updatedUser),
  };
};

export const getUserProfile = async (userId: number) => {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};

export const refreshAccessToken = async (refreshToken: string) => {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    if (!isRefreshTokenPayload(decoded)) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // 1. Vérifier la validité et l'état de révocation explicite en DB
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!dbToken || dbToken.revoked || dbToken.expireAt < new Date()) {
      throw new UnauthorizedError('Invalid or revoked refresh token');
    }

    const user = await prisma.utilisateur.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });
    if (!user || !user.actif) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // 2. Vérifier la tokenVersion du refresh token par rapport à la version courante de l'utilisateur
    if (decoded.token_version < user.tokenVersion) {
      logger.warn(
        { userId: user.id, tokenVersion: decoded.token_version, userVersion: user.tokenVersion },
        'Tentative de refresh avec un token expiré (tokenVersion obsolète).'
      );
      throw new UnauthorizedError('REFRESH_TOKEN_REVOKED');
    }

    const permissionsPayload = await buildUserPermissionsPayload(user.id);

    const payload = {
      sub: user.id,
      userId: user.id,
      role: user.role.code,
      username: user.username,
      perms: permissionsPayload.perms,
      denies: permissionsPayload.denies,
      token_version: permissionsPayload.version,
      jti: crypto.randomUUID(),
    };

    // Générer le nouvel access token
    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    // Mettre à jour le JTI actif traqué dans Redis (TTL 1h)
    await redis.set(`user:${user.id}:active_jti`, payload.jti, 'EX', 3600);

    return { accessToken: newAccessToken };
  } catch (error: any) {
    logger.error(error, 'Failed to refresh access token');
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};

export const logoutUser = async (refreshToken: string) => {
  try {
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { revoked: true },
    });
  } catch (error) {
    logger.error(error, 'Failed to revoke token during logout');
  }
};

export const getAllUsers = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    userRepository.findAllUsers(skip, limit),
    userRepository.countUsers(),
  ]);
  return { data, total };
};

export const createNewUser = async (userData: {
  nom: string;
  prenom: string;
  username: string;
  email: string;
  password: string;
  roleCode: string;
  service?: string;
  photoUrl?: string | null;
}) => {
  const existingUser = await userRepository.findUserByUsername(userData.username);
  if (existingUser) {
    throw new ValidationError('Username already exists');
  }

  const role = await userRepository.findRoleByCode(userData.roleCode);
  if (!role) {
    throw new ValidationError(`Role "${userData.roleCode}" not found`);
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const newUser = await userRepository.createUser({
    nom: userData.nom,
    prenom: userData.prenom,
    username: userData.username,
    email: userData.email,
    motDePasseHash: hashedPassword,
    roleId: role.id,
    service: userData.service,
    photoUrl: userData.photoUrl,
  });

  await userRepository.createAuditLog(
    null,
    'USER_CREATE',
    `Created user ${userData.username}`,
    'Utilisateur',
    String(newUser.id)
  );

  return toPublicUser(newUser);
};

export const updateExistingUser = async (
  userId: number,
  userData: {
    nom?: string;
    prenom?: string;
    username?: string;
    email?: string;
    password?: string;
    roleCode?: string;
    service?: string | null;
    photoUrl?: string | null;
    actif?: boolean;
  }
) => {
  const existingUser = await userRepository.findUserById(userId);
  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  const updateData: UserUpdateData = {};
  if (userData.nom) updateData.nom = userData.nom;
  if (userData.prenom) updateData.prenom = userData.prenom;
  if (userData.username) updateData.username = userData.username;
  if (userData.email) updateData.email = userData.email;
  if (userData.password) {
    updateData.motDePasseHash = await bcrypt.hash(userData.password, 10);
  }
  if (userData.roleCode) {
    const role = await userRepository.findRoleByCode(userData.roleCode);
    if (!role) {
      throw new ValidationError(`Role "${userData.roleCode}" not found`);
    }
    updateData.role = { connect: { id: role.id } };
  }
  if (userData.service !== undefined) updateData.service = userData.service;
  if (userData.photoUrl !== undefined) updateData.photoUrl = userData.photoUrl;
  if (userData.actif !== undefined) updateData.actif = userData.actif;

  let updatedUser: UserWithRole;
  try {
    updatedUser = await userRepository.updateUser(userId, updateData);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const fields = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'username/email';
      throw new ConflictError(`Un utilisateur existe déjà avec ce ${fields}.`);
    }
    throw err;
  }
  await userRepository.createAuditLog(
    null,
    'USER_UPDATE',
    `Updated user ${updatedUser.username}`,
    'Utilisateur',
    String(updatedUser.id)
  );

  return toPublicUser(updatedUser);
};

export const deleteExistingUser = async (userId: number) => {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  await userRepository.deleteUser(userId);
  await userRepository.createAuditLog(
    null,
    'USER_DELETE',
    `Deleted user with ID ${userId}`,
    'Utilisateur',
    String(userId)
  );
  return { success: true };
};
