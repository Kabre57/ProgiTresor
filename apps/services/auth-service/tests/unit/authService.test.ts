import * as authService from '../../src/services/authService';
import * as userRepository from '../../src/repositories/userRepository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../src/utils/errors';

jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    utilisateur: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        perimeterLevels: [],
        exclusions: [],
        tokenVersion: 1
      }),
    },
  },
}));
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
}));
jest.mock('../../src/utils/metrics', () => ({
  dbQueryDuration: { startTimer: () => jest.fn() },
  httpRequestDurationMs: { startTimer: () => jest.fn() },
  default: { register: { contentType: 'text/plain', metrics: jest.fn() } },
}));
jest.mock('../../src/repositories/userRepository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  const mockUser = {
    id: 1,
    username: 'testuser',
    nom: 'Doe',
    prenom: 'Jane',
    email: 'testuser@progitresor.local',
    motDePasseHash: 'hashed_password',
    roleId: 1,
    role: {
      id: 1,
      code: 'ADMIN',
      libelle: 'Administrateur',
      description: 'Acces complet au systeme',
    },
    service: 'Administration',
    actif: true,
    dateCreation: new Date(),
    derniereConnexion: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginUser', () => {
    it('should return tokens and user info on successful login', async () => {
      (userRepository.findUserByUsername as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (userRepository.updateUserLastLogin as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock).mockReturnValue('mock_token');

      const result = await authService.loginUser('testuser', 'password');

      expect(result).toHaveProperty('token', 'mock_token');
      expect(result).toHaveProperty('refreshToken', 'mock_token');
      expect(result.user.username).toBe('testuser');
      expect(userRepository.createAuditLog).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError if user not found', async () => {
      (userRepository.findUserByUsername as jest.Mock).mockResolvedValue(null);

      await expect(authService.loginUser('wronguser', 'password')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if password does not match', async () => {
      (userRepository.findUserByUsername as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.loginUser('testuser', 'wrongpassword')).rejects.toThrow(UnauthorizedError);
    });
  });
});
