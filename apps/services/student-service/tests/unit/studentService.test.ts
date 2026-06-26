import * as studentService from '../../src/services/studentService';
import * as studentRepository from '../../src/repositories/studentRepository';
import { NotFoundError, ConflictError } from '../../src/utils/errors';

jest.mock('../../src/repositories/studentRepository');
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

describe('StudentService', () => {
  const mockStudent = {
    id: 1,
    matricule: 'ETU-2024-001',
    nom: 'KOUASSI',
    prenom: 'Jean-Pierre',
    prefixeMatricule: 'ETU',
    antenneId: 1,
    antenne: { id: 1, code: 'ABJ', nom: 'INFAS ABIDJAN', ville: 'Abidjan', actif: true },
    filiereId: 1,
    filiere: { id: 1, code: 'L1', libelle: 'Licence 1', cycle: 'Licence', anneeEtude: 1 },
    statutId: 1,
    statut: { id: 1, code: 'PUBLIC', libelle: 'Etudiant Public' },
    dateCreation: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStudentByMatricule', () => {
    it('should return student from DB when not cached', async () => {
      const redis = require('../../src/utils/redis').default;
      (redis.get as jest.Mock).mockResolvedValue(null);
      (studentRepository.findByMatricule as jest.Mock).mockResolvedValue(mockStudent);
      (redis.setEx as jest.Mock).mockResolvedValue('OK');

      const result = await studentService.getStudentByMatricule('ETU-2024-001');

      expect(result).toEqual(mockStudent);
      expect(studentRepository.findByMatricule).toHaveBeenCalledWith('ETU-2024-001');
    });

    it('should return cached student when available', async () => {
      const redis = require('../../src/utils/redis').default;
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockStudent));

      const result = await studentService.getStudentByMatricule('ETU-2024-001');

      expect(result).toEqual(mockStudent);
      expect(studentRepository.findByMatricule).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if student does not exist', async () => {
      const redis = require('../../src/utils/redis').default;
      (redis.get as jest.Mock).mockResolvedValue(null);
      (studentRepository.findByMatricule as jest.Mock).mockResolvedValue(null);

      await expect(studentService.getStudentByMatricule('UNKNOWN')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createStudent', () => {
    it('should create a student successfully', async () => {
      (studentRepository.createStudent as jest.Mock).mockResolvedValue(mockStudent);

      const result = await studentService.createStudent({
        matricule: 'ETU-2024-001',
        nom: 'KOUASSI',
        prenom: 'Jean-Pierre',
        antenneId: 1,
        filiereId: 1,
        statutId: 1,
      });

      expect(result).toEqual(mockStudent);
      expect(studentRepository.createStudent).toHaveBeenCalled();
    });

    it('should throw ConflictError on duplicate matricule', async () => {
      const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      (studentRepository.createStudent as jest.Mock).mockRejectedValue(prismaError);

      await expect(studentService.createStudent({
        matricule: 'ETU-2024-001',
        nom: 'KOUASSI',
        prenom: 'Jean-Pierre',
        antenneId: 1,
        filiereId: 1,
        statutId: 1,
      })).rejects.toThrow(ConflictError);
    });
  });

  describe('updateStudent', () => {
    it('should update student and invalidate cache', async () => {
      const redis = require('../../src/utils/redis').default;
      (studentRepository.updateStudent as jest.Mock).mockResolvedValue({ ...mockStudent, nom: 'UPDATED' });
      (redis.del as jest.Mock).mockResolvedValue(1);

      const result = await studentService.updateStudent('ETU-2024-001', { nom: 'UPDATED' });

      expect(result.nom).toBe('UPDATED');
      expect(redis.del).toHaveBeenCalledWith('student:ETU-2024-001');
    });
  });

  describe('batchLookupStudents', () => {
    it('should combine cached and DB results', async () => {
      const redis = require('../../src/utils/redis').default;
      (redis.mGet as jest.Mock).mockResolvedValue([
        JSON.stringify(mockStudent),
        null
      ]);
      
      const student2 = { ...mockStudent, id: 2, matricule: 'ETU-2024-002' };
      (studentRepository.findManyByMatriculesOrTresorPay as jest.Mock).mockResolvedValue([student2]);

      const result = await studentService.batchLookupStudents(['ETU-2024-001', 'ETU-2024-002']);

      expect(result).toHaveLength(2);
    });
  });
});
