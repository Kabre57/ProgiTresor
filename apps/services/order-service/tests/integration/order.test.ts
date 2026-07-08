process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';
import request from 'supertest';
import app from '../../src/app';
import * as orderRepository from '../../src/repositories/orderRepository';
import { prisma } from '../../src/utils/prisma';

jest.mock('../../src/repositories/orderRepository');
jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));
jest.mock('../../src/utils/redis', () => ({
  __esModule: true,
  default: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    ping: jest.fn().mockResolvedValue('PONG'),
    connect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  }
}));
jest.mock('../../src/utils/httpClient', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
  TRANSACTION_SERVICE_URL: 'http://mock-transaction:5003',
  ETUDIANT_SERVICE_URL: 'http://mock-etudiant:5002',
}));

describe('Order API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);

      const response = await request(app).get('/health');
      console.log('HEALTH RESPONSE:', response.status, response.body);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('order-service');
    });
  });

  describe('GET /metrics', () => {
    it('should return 200 and prometheus metrics', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      expect(response.text).toContain('order_');
    });
  });

  describe('GET /', () => {
    it('should return list of orders', async () => {
      const mockOrders = [
        { codeOt: 'OT-001', statut: 'Brouillon' },
        { codeOt: 'OT-002', statut: 'Validé' },
      ];
      (orderRepository.findAllOts as jest.Mock).mockResolvedValue(mockOrders);

      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('PUT /:code/status validation', () => {
    it('should return 400 if statut is invalid', async () => {
      const response = await request(app)
        .put('/OT-001/status')
        .send({ statut: 'InvalidStatus' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /generate authorization', () => {
    it('should return 403 if no role header', async () => {
      const response = await request(app).post('/generate');
      expect(response.status).toBe(403);
    });

    it('should return 403 if role is not authorized', async () => {
      const response = await request(app)
        .post('/generate')
        .set('x-user-role', 'Consultant');

      expect(response.status).toBe(403);
    });
  });
});
