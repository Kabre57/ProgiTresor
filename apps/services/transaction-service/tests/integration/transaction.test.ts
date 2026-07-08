process.env.INTERNAL_API_SECRET = 'test-secret';
import request from 'supertest';
jest.mock('../../src/utils/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
    scanIterator: jest.fn().mockReturnValue([]),
    isOpen: true,
    connect: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
  },
}));
import app from '../../src/app';
import { prisma } from '../../src/utils/prisma';

jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    transaction: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    }
  }
}));

describe('Transaction API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);

      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok', service: 'transaction-service' });
    });
  });

  describe('GET /metrics', () => {
    it('should return 200 and prometheus metrics', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      expect(response.text).toContain('transaction_');
    });
  });

  describe('POST /link-ot validation', () => {
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/link-ot')
        .set('x-internal-secret', process.env.INTERNAL_API_SECRET || '')
        .send({ transactionIds: [1, 2] });

      expect(response.status).toBe(400);
    });
  });
});
