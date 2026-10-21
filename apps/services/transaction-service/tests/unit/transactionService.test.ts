import * as transactionService from '../../src/services/transactionService';
import * as transactionRepository from '../../src/repositories/transactionRepository';
import * as importFichierRepository from '../../src/repositories/importFichierRepository';
import * as ordreTraitementMiroirRepository from '../../src/repositories/ordreTraitementMiroirRepository';
import { prisma } from '../../src/utils/prisma';

jest.mock('../../src/repositories/transactionRepository');
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
jest.mock('../../src/repositories/importFichierRepository', () => ({
  createImportFichier: jest.fn().mockResolvedValue({ id: 1 }),
  updateImportFichier: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../src/repositories/ordreTraitementMiroirRepository', () => ({
  upsertOrdreTraitementMiroir: jest.fn().mockResolvedValue({}),
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

const mockNomenclatures = [
  {
    id: 7,
    libelleBrut: 'FRAIS ENCADREMENT L1 VERS2 AUXILIAIRE',
    codeProduit: 'ENC-L1-V2',
    libelleStandard: 'Encadrement L1 versement 2',
    typeRecetteId: 9,
    numVersement: 2,
    montant: 30000,
    regexPattern: 'FRAIS\\s+ENCADREMENT.*L1.*VERS2',
    typeRecette: {
      id: 9,
      code: 'ENCADREMENT',
      libelle: 'Encadrement',
      typeFluxId: 2,
      typeFlux: { id: 2, code: 'HORS_BUDGET', libelle: 'Recettes Hors Budget' },
    },
    niveau: {
      id: 3,
      code: 'L1',
      libelle: 'Licence 1',
      filiere: { id: 4, code: 'AUXILIAIRE', libelle: 'Auxiliaire' },
    },
  },
];

// Mock fetch globally
const globalFetch = global.fetch;
beforeAll(() => {
  global.fetch = jest.fn().mockImplementation((input: any) => {
    const url = String(input);
    const data = url.includes('/nomenclatures?actif=true') ? mockNomenclatures : [];
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(JSON.stringify(data)),
      json: () => Promise.resolve(data),
    } as any);
  });
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
        nomFichier: 'test.xlsx',
        typeFichier: 'XLSX' as const,
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
        nomFichier: 'test.xlsx',
        typeFichier: 'XLSX' as const,
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

    it('should persist dynamic nomenclature resolution during import', async () => {
      (prisma.transaction.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const payload = {
        nomFichier: 'semantic.xlsx',
        typeFichier: 'XLSX' as const,
        auteurId: 1,
        items: [{
          refTresor: 'REF-SEM-001',
          montant: 30000,
          dateHeure: new Date(),
          nomPayeurBrut: 'TRAORE',
          etudiantMatricule: null,
          libelleProduitBrut: 'FRAIS ENCADREMENT L1 VERS2 AUXILIAIRE',
        }]
      };

      await transactionService.importTransactions(payload);

      const createManyArg = (prisma.transaction.createMany as jest.Mock).mock.calls[0][0];
      expect(createManyArg.data[0]).toMatchObject({
        nomenclatureId: 7,
        typeFluxId: 2,
        typeFrais: 'ENCADREMENT',
        niveau: 'L1',
        filiere: 'AUXILIAIRE',
        versement: 'VERSEMENT_2',
        statutTraitement: 'IMPORTE',
      });
      expect(createManyArg.data[0].montantAttendu).toBe(30000n);
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

  describe('linkTransactionsToOt', () => {
    it('should link transactions to an OT', async () => {
      (transactionRepository.findAlreadyLinkedTransaction as jest.Mock).mockResolvedValue(null);
      (transactionRepository.linkTransactionsToOt as jest.Mock).mockResolvedValue(3);

      const result = await transactionService.linkTransactionsToOt(1, 'OT-001', [1, 2, 3]);

      expect(result.updatedCount).toBe(3);
    });

    it('should throw if a transaction is already linked', async () => {
      (transactionRepository.findAlreadyLinkedTransaction as jest.Mock).mockResolvedValue({
        id: 1n,
        ordreTraitementId: 10
      });

      await expect(
        transactionService.linkTransactionsToOt(2, 'OT-NEW', [1, 2])
      ).rejects.toThrow('already assigned');
    });
  });

  describe('unlinkTransactionsFromOt', () => {
    it('should unlink transactions from an OT', async () => {
      (transactionRepository.unlinkTransactionsFromOt as jest.Mock).mockResolvedValue(5);

      const result = await transactionService.unlinkTransactionsFromOt(1);
      expect(result.count).toBe(5);
    });
  });
});
