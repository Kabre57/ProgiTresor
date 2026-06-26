import * as transactionService from '../../src/services/transactionService';
import * as transactionRepository from '../../src/repositories/transactionRepository';
import * as importFichierRepository from '../../src/repositories/importFichierRepository';
import * as ordrePaiementMiroirRepository from '../../src/repositories/ordrePaiementMiroirRepository';
import { prisma } from '../../src/utils/prisma';

jest.mock('../../src/repositories/transactionRepository');
jest.mock('../../src/repositories/importFichierRepository', () => ({
  createImportFichier: jest.fn().mockResolvedValue({ id: 1 }),
  updateImportFichier: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../src/repositories/ordrePaiementMiroirRepository', () => ({
  upsertOrdrePaiementMiroir: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    transaction: {
      createMany: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
    }
  }
}));
jest.mock('../../src/utils/metrics', () => ({
  importCounter: { inc: jest.fn() },
  dbQueryDuration: { startTimer: jest.fn(() => jest.fn()) },
  httpRequestDurationMs: { startTimer: jest.fn(() => jest.fn()) },
  default: { register: { contentType: 'text/plain', metrics: jest.fn() } }
}));

// Mock fetch globally
const globalFetch = global.fetch;
beforeAll(() => {
  global.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    } as any)
  );
});

afterAll(() => {
  global.fetch = globalFetch;
});

describe('TransactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('importTransactions', () => {
    it('should import transactions and return counts', async () => {
      (prisma.transaction.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const payload = {
        nomFichier: 'test.csv',
        typeFichier: 'CSV' as const,
        auteurId: 1,
        items: [{
          refTresor: 'REF-001',
          montant: 150000,
          dateHeure: new Date(),
          nomPayeurBrut: 'KOUASSI',
          etudiantMatricule: 'ETU-001',
          libelleProduitBrut: '1ER VERSEMENT FRAIS DE SCOLARITE',
        }]
      };

      const result = await transactionService.importTransactions(payload);

      expect(result.imported).toBe(1);
      expect(result.duplicatesSkipped).toBe(0);
      expect(prisma.transaction.createMany).toHaveBeenCalledTimes(1);
    });

    it('should skip duplicate transactions', async () => {
      (prisma.transaction.createMany as jest.Mock).mockResolvedValue({ count: 0 });

      const payload = {
        nomFichier: 'test.csv',
        typeFichier: 'CSV' as const,
        auteurId: 1,
        items: [{
          refTresor: 'REF-DUP',
          montant: 50000,
          dateHeure: new Date(),
          nomPayeurBrut: null,
          etudiantMatricule: null,
          libelleProduitBrut: 'DROIT D INSCRIPTION',
        }]
      };

      const result = await transactionService.importTransactions(payload);
      expect(result.duplicatesSkipped).toBe(1);
      expect(result.imported).toBe(0);
    });
  });

  describe('getTransactions', () => {
    it('should return paginated results', async () => {
      const mockList = [{ id: 1n, refTresor: 'REF-001', etudiantId: null, nomenclatureId: null, typeFluxId: null, montant: 100n }];
      (transactionRepository.findTransactions as jest.Mock).mockResolvedValue(mockList);
      (transactionRepository.countTransactions as jest.Mock).mockResolvedValue(1);

      const result = await transactionService.getTransactions({ limit: '50', offset: '0' });

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });
  });

  describe('linkTransactionsToOp', () => {
    it('should link transactions to an OP', async () => {
      (transactionRepository.findAlreadyLinkedTransaction as jest.Mock).mockResolvedValue(null);
      (transactionRepository.linkTransactionsToOp as jest.Mock).mockResolvedValue(3);

      const result = await transactionService.linkTransactionsToOp(1, 'OP-001', [1, 2, 3]);

      expect(result.updatedCount).toBe(3);
    });

    it('should throw if a transaction is already linked', async () => {
      (transactionRepository.findAlreadyLinkedTransaction as jest.Mock).mockResolvedValue({
        id: 1n,
        ordrePaiementId: 10
      });

      await expect(
        transactionService.linkTransactionsToOp(2, 'OP-NEW', [1, 2])
      ).rejects.toThrow('already assigned');
    });
  });

  describe('unlinkTransactionsFromOp', () => {
    it('should unlink transactions from an OP', async () => {
      (transactionRepository.unlinkTransactionsFromOp as jest.Mock).mockResolvedValue(5);

      const result = await transactionService.unlinkTransactionsFromOp(1);
      expect(result.count).toBe(5);
    });
  });
});
