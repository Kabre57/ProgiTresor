process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';
import * as orderService from '../../src/services/orderService';
import * as orderRepository from '../../src/repositories/orderRepository';
import { NotFoundError, AppError } from '../../src/utils/errors';
import { prisma } from '../../src/utils/prisma';

jest.mock('../../src/repositories/orderRepository');
jest.mock('../../src/utils/redis', () => ({
  __esModule: true,
  default: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    ping: jest.fn().mockResolvedValue('PONG'),
  }
}));
jest.mock('../../src/utils/prisma', () => {
  const mockPrisma: {
    ordreTraitement: { findMany: jest.Mock; update: jest.Mock };
    otCounter: { upsert: jest.Mock };
    outboxMessage: { create: jest.Mock };
    $transaction: jest.Mock;
  } = {
    ordreTraitement: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    otCounter: {
      upsert: jest.fn().mockResolvedValue({ sequence: 1 }),
    },
    outboxMessage: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(),
  };
  mockPrisma.$transaction.mockImplementation(async <T>(cb: (tx: typeof mockPrisma) => Promise<T>): Promise<T> => {
    return cb(mockPrisma);
  });
  return { prisma: mockPrisma };
});
jest.mock('../../src/utils/httpClient', () => {
  const mockHttp = {
    get: jest.fn().mockImplementation((url: string) => {
      if (url.includes('/antennes/')) {
        return Promise.resolve({ data: { id: 1, code: 'BKE', nom: 'Bouake' } });
      }
      return Promise.resolve({ data: [] });
    }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
  };
  return {
    http: mockHttp,
    TRANSACTION_SERVICE_URL: 'http://mock-transaction:5003',
    ETUDIANT_SERVICE_URL: 'http://mock-etudiant:5002',
  };
});
jest.mock('../../src/utils/metrics', () => ({
  sagaSuccessCounter: { inc: jest.fn() },
  sagaRollbackCounter: { inc: jest.fn() },
  dbQueryDuration: { startTimer: jest.fn(() => jest.fn()) },
  httpRequestDurationMs: { startTimer: jest.fn(() => jest.fn()) },
  default: { register: { contentType: 'text/plain', metrics: jest.fn() } }
}));

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateOrderStatus', () => {
    const mockOp = {
      codeOt: 'OT-TEST-001',
      id: 1,
      antenneId: 1,
      filiereId: 1,
      typeRecetteId: 1,
      montantCumule: 150000n,
      nombreFlux: 3,
      statut: 'Brouillon',
      pdfUrl: '/api/analyse/uploads/pdfs/test.pdf',
      pdfPath: '/uploads/pdfs/test.pdf',
      dateCreation: new Date(),
      syntheseId: 1,
      synthese: {
        id: 1,
        reference: 'SYN-TEST-001',
        periodeDebut: new Date(),
        periodeFin: new Date(),
        nbTransactions: 3,
        montantTotal: 150000n,
      }
    };

    it('should update OT status when role is authorized', async () => {
      const { http } = require('../../src/utils/httpClient');
      (orderRepository.findOtByCode as jest.Mock).mockResolvedValue(mockOp);
      (orderRepository.updateOt as jest.Mock).mockResolvedValue({ ...mockOp, statut: 'Transmis' });
      (http.put as jest.Mock).mockResolvedValue({ data: {} });
      (prisma.ordreTraitement.update as jest.Mock).mockResolvedValue({ ...mockOp, statut: 'Transmis' });

      const result = await orderService.updateOrderStatus('OT-TEST-001', 'Transmis', 'COMPTABLE', 1);

      expect(result.statut).toBe('Transmis');
      const updatePayload = (prisma.ordreTraitement.update as jest.Mock).mock.calls[0][0].data as {
        statut?: string;
        dateTransmissionBudget?: unknown;
      };
      expect(prisma.ordreTraitement.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { codeOt: 'OT-TEST-001' },
        data: expect.objectContaining({ statut: 'Transmis' }),
      }));
      expect(updatePayload.dateTransmissionBudget).toBeInstanceOf(Date);
    });

    it('should throw NotFoundError if OT does not exist', async () => {
      (orderRepository.findOtByCode as jest.Mock).mockResolvedValue(null);

      await expect(
        orderService.updateOrderStatus('OT-UNKNOWN', 'Validé', 'CHEF_COMPTABLE', 1)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw 403 if role is not authorized for transition', async () => {
      (orderRepository.findOtByCode as jest.Mock).mockResolvedValue(mockOp);

      await expect(
        orderService.updateOrderStatus('OT-TEST-001', 'Validé', 'COMPTABLE', 1)
      ).rejects.toThrow(AppError);
    });

    it('should unlink transactions on rejection', async () => {
      const { http } = require('../../src/utils/httpClient');
      (orderRepository.findOtByCode as jest.Mock).mockResolvedValue(mockOp);
      (orderRepository.updateOt as jest.Mock).mockResolvedValue({ ...mockOp, statut: 'Rejeté' });
      (http.post as jest.Mock).mockResolvedValue({ data: {} });
      (http.put as jest.Mock).mockResolvedValue({ data: {} });

      await orderService.updateOrderStatus('OT-TEST-001', 'Rejeté', 'ADMIN', 1);

      expect(http.post).toHaveBeenCalledWith(
        'http://mock-transaction:5003/unlink-ot',
        { ordreTraitementId: 1 }
      );
    });
  });

  describe('getAllOrders', () => {
    it('should return all orders from repository', async () => {
      const mockOrders = [{ codeOt: 'OT-001' }, { codeOt: 'OT-002' }];
      (orderRepository.findAllOts as jest.Mock).mockResolvedValue(mockOrders);

      const result = await orderService.getAllOrders();
      expect(result).toEqual(mockOrders);
    });
  });
});
