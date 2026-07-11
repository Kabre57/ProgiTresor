import * as etudiantService from '../../src/services/etudiantService';
import * as etudiantRepository from '../../src/repositories/etudiantRepository';
import { NotFoundError, ConflictError } from '../../src/utils/errors';

jest.mock('../../src/repositories/etudiantRepository');
jest.mock('../../src/utils/redis', () => {
  const setExMock = jest.fn();
  const execMock = jest.fn().mockResolvedValue([]);
  const multiMock = jest.fn().mockReturnValue({
    setEx: setExMock,
    exec: execMock
  });
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      mGet: jest.fn(),
      multi: multiMock
    }
  };
});
jest.mock('../../src/utils/metrics', () => ({
  redisCacheHits: { inc: jest.fn() },
  redisCacheMisses: { inc: jest.fn() },
  dbQueryDuration: { startTimer: jest.fn(() => jest.fn()) },
  default: { register: { contentType: 'text/plain', metrics: jest.fn() } }
}));

describe('EtudiantService', () => {
  const mockEtudiant = {
    id: 1,
    matricule: 'ETU-2024-001',
    nom: 'KOUASSI',
    prenom: 'Jean-Pierre',
    prefixeMatricule: 'ETU',
    antenneId: 1,
    antenne: { id: 1, code: 'ABJ', nom: 'INFAS ABIDJAN', ville: 'Abidjan', actif: true },
    niveauId: 1,
    niveau: { id: 1, code: 'L1', libelle: 'Licence 1 (L1)', anneeEtude: 1, filiereId: 1, filiere: { id: 1, code: 'INF', libelle: 'Informatique' } },
    statutId: 1,
    statut: { id: 1, code: 'PUBLIC', libelle: 'Etudiant Public' },
    dateCreation: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEtudiantByMatricule', () => {
    it('should return etudiant from DB when not cached', async () => {
      const redis = require('../../src/utils/redis').default;
      (redis.get as jest.Mock).mockResolvedValue(null);
      (etudiantRepository.findByMatricule as jest.Mock).mockResolvedValue(mockEtudiant);
      (redis.setEx as jest.Mock).mockResolvedValue('OK');

      const result = await etudiantService.getEtudiantByMatricule('ETU-2024-001');

      expect(result).toEqual(mockEtudiant);
      expect(etudiantRepository.findByMatricule).toHaveBeenCalledWith('ETU-2024-001');
    });

    it('should return cached etudiant when available', async () => {
      const redis = require('../../src/utils/redis').default;
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockEtudiant));

      const result = await etudiantService.getEtudiantByMatricule('ETU-2024-001');

      expect(result).toEqual(mockEtudiant);
      expect(etudiantRepository.findByMatricule).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if etudiant does not exist', async () => {
      const redis = require('../../src/utils/redis').default;
      (redis.get as jest.Mock).mockResolvedValue(null);
      (etudiantRepository.findByMatricule as jest.Mock).mockResolvedValue(null);

      await expect(etudiantService.getEtudiantByMatricule('UNKNOWN')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createEtudiant', () => {
    it('should create a etudiant successfully', async () => {
      (etudiantRepository.createEtudiant as jest.Mock).mockResolvedValue(mockEtudiant);

      const result = await etudiantService.createEtudiant({
        matricule: 'ETU-2024-001',
        nom: 'KOUASSI',
        prenom: 'Jean-Pierre',
        antenneId: 1,
        niveauId: 1,
        statutId: 1,
      });

      expect(result).toEqual(mockEtudiant);
      expect(etudiantRepository.createEtudiant).toHaveBeenCalled();
    });

    it('should throw ConflictError on duplicate matricule', async () => {
      const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      (etudiantRepository.createEtudiant as jest.Mock).mockRejectedValue(prismaError);

      await expect(etudiantService.createEtudiant({
        matricule: 'ETU-2024-001',
        nom: 'KOUASSI',
        prenom: 'Jean-Pierre',
        antenneId: 1,
        niveauId: 1,
        statutId: 1,
      })).rejects.toThrow(ConflictError);
    });
  });

  describe('updateEtudiant', () => {
    it('should update etudiant and invalidate cache', async () => {
      const redis = require('../../src/utils/redis').default;
      (etudiantRepository.updateEtudiant as jest.Mock).mockResolvedValue({ ...mockEtudiant, nom: 'UPDATED' });
      (redis.del as jest.Mock).mockResolvedValue(1);

      const result = await etudiantService.updateEtudiant('ETU-2024-001', { nom: 'UPDATED' });

      expect(result.nom).toBe('UPDATED');
      expect(redis.del).toHaveBeenCalledWith('etudiant:ETU-2024-001');
    });
  });

  describe('batchLookupEtudiants', () => {
    it('should combine cached and DB results', async () => {
      const redis = require('../../src/utils/redis').default;
      (redis.mGet as jest.Mock).mockResolvedValue([
        JSON.stringify(mockEtudiant),
        null
      ]);
      
      const etudiant2 = { ...mockEtudiant, id: 2, matricule: 'ETU-2024-002' };
      (etudiantRepository.findManyByMatriculesOrTresorPay as jest.Mock).mockResolvedValue([etudiant2]);

      const result = await etudiantService.batchLookupEtudiants(['ETU-2024-001', 'ETU-2024-002']);

      expect(result).toHaveLength(2);
    });
  });
});
