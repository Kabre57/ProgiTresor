process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';

import { SagaCoordinator } from '../../src/services/sagaCoordinator';
import * as orderRepository from '../../src/repositories/orderRepository';
import * as syntheseRepository from '../../src/repositories/syntheseRepository';

jest.mock('../../src/repositories/orderRepository');
jest.mock('../../src/repositories/syntheseRepository');
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
  ETUDIANT_SERVICE_URL: 'http://mock-etudiant:5002',
}));

jest.mock('../../src/utils/metrics', () => ({
  sagaSuccessCounter: { inc: jest.fn() },
  sagaRollbackCounter: { inc: jest.fn() },
  dbQueryDuration: { startTimer: jest.fn(() => jest.fn()) },
  httpRequestDurationMs: { startTimer: jest.fn(() => jest.fn()) },
  default: { register: { contentType: 'text/plain', metrics: jest.fn() } }
}));

describe('SagaCoordinator', () => {
  let coordinator: SagaCoordinator;
  const mockAuteurId = 42;

  beforeEach(() => {
    jest.clearAllMocks();
    coordinator = new SagaCoordinator(mockAuteurId);
  });

  it('should group transactions by antenneId, levelId, and typeRecetteId, and link them correctly', async () => {
    const { http } = require('../../src/utils/httpClient');

    // Mock unassigned transactions:
    // tx1: antenne 1, etudiant 101, nomenclature 201, amount 1000
    // tx2: antenne 1, etudiant 101, nomenclature 201, amount 2000 (same group)
    // tx3: antenne 1, etudiant 102 (different level), nomenclature 201, amount 3000 (different group)
    // tx4: antenne 2, etudiant 101, nomenclature 202 (different recipe), amount 4000 (different group)
    const mockTransactions = [
      { id: 1, montant: '1000', antenneId: 1, etudiantId: 101, nomenclatureId: 201, typeFluxId: 2, libelleProduitBrut: 'PROD-A' },
      { id: 2, montant: '2000', antenneId: 1, etudiantId: 101, nomenclatureId: 201, typeFluxId: 2, libelleProduitBrut: 'PROD-A' },
      { id: 3, montant: '3000', antenneId: 1, etudiantId: 102, nomenclatureId: 201, typeFluxId: 2, libelleProduitBrut: 'PROD-A' },
      { id: 4, montant: '4000', antenneId: 2, etudiantId: 101, nomenclatureId: 202, typeFluxId: 2, libelleProduitBrut: 'PROD-B' },
    ];

    (http.get as jest.Mock).mockImplementation((url: string, config?: any) => {
      if (url.endsWith('/unassigned')) {
        return Promise.resolve({ data: mockTransactions });
      }
      if (url.includes('/nomenclatures/201')) {
        return Promise.resolve({ data: { id: 201, typeRecetteId: 10, libelleStandard: 'Recette Standard A' } });
      }
      if (url.includes('/nomenclatures/202')) {
        return Promise.resolve({ data: { id: 202, typeRecetteId: 20, libelleStandard: 'Recette Standard B' } });
      }
      if (url.endsWith('/')) {
        // etudiant query
        const ids = config?.params?.ids;
        if (ids === '101') {
          return Promise.resolve({ data: [{ id: 101, niveauId: 5, antenneId: 1 }] });
        }
        if (ids === '102') {
          return Promise.resolve({ data: [{ id: 102, niveauId: 6, antenneId: 1 }] });
        }
      }
      return Promise.reject(new Error('Unknown url: ' + url));
    });

    (http.post as jest.Mock).mockImplementation((url: string, postData?: { ids?: number[] }) => {
      if (url.endsWith('/batch-ids')) {
        const ids = postData?.ids;
        if (ids && ids.includes(101)) {
          return Promise.resolve({ data: [{ id: 101, niveauId: 5, antenneId: 1 }] });
        }
        if (ids && ids.includes(102)) {
          return Promise.resolve({ data: [{ id: 102, niveauId: 6, antenneId: 1 }] });
        }
      }
      return Promise.resolve({ data: {} });
    });

    // Mock DB operations
    const mockSynthese = { id: 77, reference: 'SYN-MOCK' };
    (syntheseRepository.createSynthese as jest.Mock).mockResolvedValue(mockSynthese);

    let mockOpId = 1000;
    (orderRepository.createOt as jest.Mock).mockImplementation((opData) => {
      mockOpId++;
      return Promise.resolve({
        id: mockOpId,
        codeOt: opData.codeOt,
        syntheseId: opData.syntheseId,
        antenneId: opData.antenneId,
        filiereId: opData.filiereId,
        typeRecetteId: opData.typeRecetteId,
        montantCumule: opData.montantCumule,
        nombreFlux: opData.nombreFlux,
        statut: 'Brouillon',
      });
    });

    // Run coordinator
    const result = await coordinator.execute();

    // Verification
    expect(result.generatedOtsCount).toBe(3); // 3 unique groups
    expect(syntheseRepository.createSynthese).toHaveBeenCalled();

    // Let's verify grouping keys:
    // Group 1: key "1_5_10" (antenne 1, level 5, typeRecette 10) - tx1 (1) & tx2 (2) -> amount sum = 3000
    // Group 2: key "1_6_10" (antenne 1, level 6, typeRecette 10) - tx3 (3) -> amount sum = 3000
    // Group 3: key "2_5_20" (antenne 2, level 5, typeRecette 20) - tx4 (4) -> amount sum = 4000
    expect(orderRepository.createOt).toHaveBeenCalledTimes(3);
    expect(orderRepository.createOt).toHaveBeenCalledWith(expect.objectContaining({
      antenneId: 1,
      niveauId: 5,
      typeRecetteId: 10,
      montantCumule: 3000n,
      nombreFlux: 2,
    }));
    expect(orderRepository.createOt).toHaveBeenCalledWith(expect.objectContaining({
      antenneId: 1,
      niveauId: 6,
      typeRecetteId: 10,
      montantCumule: 3000n,
      nombreFlux: 1,
    }));
    expect(orderRepository.createOt).toHaveBeenCalledWith(expect.objectContaining({
      antenneId: 2,
      niveauId: 5,
      typeRecetteId: 20,
      montantCumule: 4000n,
      nombreFlux: 1,
    }));

    // Verify link-ot calls
    const linkOtCalls = (http.post as jest.Mock).mock.calls.filter((call: [string]) => call[0].includes('link-ot'));
    expect(linkOtCalls).toHaveLength(3);
    expect(http.post).toHaveBeenCalledWith('http://mock-transaction:5003/link-ot', expect.objectContaining({
      transactionIds: expect.arrayContaining([1, 2]),
    }));
  });

  it('should trigger rollback and cleanup when order creation or linking fails', async () => {
    const { http } = require('../../src/utils/httpClient');

    const mockTransactions = [
      { id: 1, montant: '1000', antenneId: 1, etudiantId: 101, nomenclatureId: 201, typeFluxId: 2, libelleProduitBrut: 'PROD-A' },
    ];

    (http.get as jest.Mock).mockImplementation((url: string) => {
      if (url.endsWith('/unassigned')) {
        return Promise.resolve({ data: mockTransactions });
      }
      return Promise.reject(new Error('Mock network error'));
    });

    // Make linking post throw an error
    (http.post as jest.Mock).mockRejectedValue(new Error('Link failed'));

    (syntheseRepository.createSynthese as jest.Mock).mockResolvedValue({ id: 88 });
    (orderRepository.createOt as jest.Mock).mockResolvedValue({ id: 501, codeOt: 'OT-ROLLBACK-001' });

    // Run coordinator & expect throw
    await expect(coordinator.execute()).rejects.toThrow('Link failed');

    // Verify rollback called deleteOt and NOT unlink-ot (since it wasn't successfully linked)
    expect(orderRepository.deleteOt).toHaveBeenCalledWith(expect.stringMatching(/^(TEMP-)?OT-\d{4}-\d{3}-[A-Z0-9]+/));
    expect(http.post).not.toHaveBeenCalledWith(expect.stringContaining('unlink-ot'), expect.any(Object));
  });
});
