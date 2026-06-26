import request from 'supertest';
import app from '../../src/app';
import * as studentRepository from '../../src/repositories/studentRepository';

jest.mock('../../src/repositories/studentRepository');
jest.mock('../../src/utils/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
  }
}));

describe('Student API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const prismaMock = {
        $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }])
      };
      (studentRepository.getPrismaClient as jest.Mock).mockReturnValue(prismaMock);

      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('student-service');
    });
  });

  describe('GET /metrics', () => {
    it('should return 200 and prometheus metrics', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      expect(response.text).toContain('student_');
    });
  });

  describe('POST / validation', () => {
    it('should return 400 if matricule is missing', async () => {
      const response = await request(app)
        .post('/')
        .send({ nom_complet: 'Test Student' });

      expect(response.status).toBe(400);
    });

    it('should return 400 if nom_complet is missing', async () => {
      const response = await request(app)
        .post('/')
        .send({ matricule_etudiant: 'ETU-001' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /batch validation', () => {
    it('should return 400 if matricules array is empty', async () => {
      const response = await request(app)
        .post('/batch')
        .send({ matricules: [] });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /:matricule', () => {
    it('should return 404 if student not found', async () => {
      const redis = require('../../src/utils/redis').default;
      (redis.get as jest.Mock).mockResolvedValue(null);
      (studentRepository.findByMatricule as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/ETU-UNKNOWN');
      expect(response.status).toBe(404);
    });
  });
});
