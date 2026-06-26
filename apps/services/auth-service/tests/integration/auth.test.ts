import request from 'supertest';
import app from '../../src/app';
import * as userRepository from '../../src/repositories/userRepository';

jest.mock('../../src/repositories/userRepository');

describe('Auth API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const prismaMock = {
        $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }])
      };
      (userRepository.getPrismaClient as jest.Mock).mockReturnValue(prismaMock);

      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok', service: 'auth-service' });
    });
  });

  describe('GET /metrics', () => {
    it('should return 200 and prometheus metrics', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      expect(response.text).toContain('auth_db_query_duration_seconds');
    });
  });

  describe('POST /login validation', () => {
    it('should return 400 if username is missing', async () => {
      const response = await request(app)
        .post('/login')
        .send({ password: 'password123' });
      
      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('username');
    });
  });
});
