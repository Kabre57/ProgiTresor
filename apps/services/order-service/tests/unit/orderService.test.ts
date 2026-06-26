process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';
import * as orderService from '../../src/services/orderService';
import * as orderRepository from '../../src/repositories/orderRepository';
import { NotFoundError, AppError } from '../../src/utils/errors';

jest.mock('../../src/repositories/orderRepository');
jest.mock('../../src/utils/redis', () => ({
  __esModule: true,
  default: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    ping: jest.fn().mockResolvedValue('PONG'),
  }
}));
jest.mock('../../src/utils/httpClient', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
  TRANSACTION_SERVICE_URL: 'http://mock-transaction:5003',
  STUDENT_SERVICE_URL: 'http://mock-student:5002',
}));
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
      codeOp: 'OP-TEST-001',
      id: 1,
      antenneId: 1,
      filiereId: 1,
      typeRecetteId: 1,
      montantCumule: 150000n,
      nombreFlux: 3,
      statut: 'Brouillon',
      dateCreation: new Date(),
    };

    it('should update OP status when role is authorized', async () => {
      const { http } = require('../../src/utils/httpClient');
      (orderRepository.findOpByCode as jest.Mock).mockResolvedValue(mockOp);
      (orderRepository.updateOp as jest.Mock).mockResolvedValue({ ...mockOp, statut: 'Transmis' });
      (http.put as jest.Mock).mockResolvedValue({ data: {} });

      const result = await orderService.updateOrderStatus('OP-TEST-001', 'Transmis', 'COMPTABLE', 1);

      expect(result.statut).toBe('Transmis');
      const updatePayload = (orderRepository.updateOp as jest.Mock).mock.calls[0][1] as {
        statut?: string;
        dateTransmissionBudget?: unknown;
      };
      expect(orderRepository.updateOp).toHaveBeenCalledWith('OP-TEST-001', expect.objectContaining({
        statut: 'Transmis'
      }));
      expect(updatePayload.dateTransmissionBudget).toBeInstanceOf(Date);
    });

    it('should throw NotFoundError if OP does not exist', async () => {
      (orderRepository.findOpByCode as jest.Mock).mockResolvedValue(null);

      await expect(
        orderService.updateOrderStatus('OP-UNKNOWN', 'Validé', 'CHEF_COMPTABLE', 1)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw 403 if role is not authorized for transition', async () => {
      (orderRepository.findOpByCode as jest.Mock).mockResolvedValue(mockOp);

      await expect(
        orderService.updateOrderStatus('OP-TEST-001', 'Validé', 'COMPTABLE', 1)
      ).rejects.toThrow(AppError);
    });

    it('should unlink transactions on rejection', async () => {
      const { http } = require('../../src/utils/httpClient');
      (orderRepository.findOpByCode as jest.Mock).mockResolvedValue(mockOp);
      (orderRepository.updateOp as jest.Mock).mockResolvedValue({ ...mockOp, statut: 'Rejeté' });
      (http.post as jest.Mock).mockResolvedValue({ data: {} });
      (http.put as jest.Mock).mockResolvedValue({ data: {} });

      await orderService.updateOrderStatus('OP-TEST-001', 'Rejeté', 'ADMIN', 1);

      expect(http.post).toHaveBeenCalledWith(
        'http://mock-transaction:5003/unlink-op',
        { ordrePaiementId: 1 }
      );
    });
  });

  describe('getAllOrders', () => {
    it('should return all orders from repository', async () => {
      const mockOrders = [{ codeOp: 'OP-001' }, { codeOp: 'OP-002' }];
      (orderRepository.findAllOps as jest.Mock).mockResolvedValue(mockOrders);

      const result = await orderService.getAllOrders();
      expect(result).toEqual(mockOrders);
    });
  });
});
