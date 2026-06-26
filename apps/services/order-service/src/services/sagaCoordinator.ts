import * as orderRepository from '../repositories/orderRepository';
import * as syntheseRepository from '../repositories/syntheseRepository';
import redisClient from '../utils/redis';
import { http, TRANSACTION_SERVICE_URL } from '../utils/httpClient';
import { fetchStudentJson } from '../utils/studentServiceClient';
import { sagaSuccessCounter, sagaRollbackCounter } from '../utils/metrics';
import logger from '../utils/logger';

const SAGA_TTL_SECONDS = 300;

interface TransactionData {
  id: number;
  montant: string | number;
  antenneId: number | null;
  etudiantId: number | null;
  nomenclatureId: number | null;
  typeFluxId: number | null;
  libelleProduitBrut: string | null;
}

interface StudentInfo {
  id: number;
  filiereId: number;
  antenneId: number;
}

interface NomenclatureInfo {
  id: number;
  typeRecetteId: number;
  libelleStandard: string;
}

interface OpGroup {
  antenneId: number;
  filiereId: number;
  typeRecetteId: number;
  libelle: string;
  montantCumule: number;
  txIds: number[];
}

interface SagaState {
  status: string;
  createdOpCodes: string[];
}

export class SagaCoordinator {
  private sagaId: string;
  private createdOpCodes: string[] = [];
  private linkedTransactions: { ordrePaiementId: number; txIds: number[] }[] = [];

  // Caches for resolved student and nomenclature data
  private studentCache: Map<number, StudentInfo> = new Map();
  private nomenclatureCache: Map<number, NomenclatureInfo> = new Map();

  constructor(private readonly auteurId: number) {
    this.sagaId = `SAGA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /**
   * Resolve the filiereId for a given etudiantId by querying student-service.
   * Results are cached to avoid redundant calls.
   */
  private async resolveStudentFiliereId(etudiantId: number): Promise<number> {
    if (this.studentCache.has(etudiantId)) {
      return this.studentCache.get(etudiantId)!.filiereId;
    }

    try {
      const students = await fetchStudentJson<StudentInfo[]>('/batch-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [etudiantId] }),
      }, []);
      if (Array.isArray(students) && students.length > 0) {
        const student = students[0];
        this.studentCache.set(etudiantId, student);
        return student.filiereId ?? 1;
      }
    } catch (err) {
      logger.warn({ etudiantId, err }, 'Failed to resolve student filiereId, using default');
    }
    return 1; // default fallback
  }

  /**
   * Resolve the typeRecetteId for a given nomenclatureId by querying student-service.
   * Results are cached to avoid redundant calls.
   */
  private async resolveNomenclatureTypeRecetteId(nomenclatureId: number): Promise<{ typeRecetteId: number; libelle: string }> {
    if (this.nomenclatureCache.has(nomenclatureId)) {
      const cached = this.nomenclatureCache.get(nomenclatureId)!;
      return { typeRecetteId: cached.typeRecetteId, libelle: cached.libelleStandard };
    }

    try {
      const nomenclature = await fetchStudentJson<NomenclatureInfo | null>(`/nomenclatures/${nomenclatureId}`, undefined, null);
      if (nomenclature && nomenclature.typeRecetteId) {
        this.nomenclatureCache.set(nomenclatureId, nomenclature);
        return { typeRecetteId: nomenclature.typeRecetteId, libelle: nomenclature.libelleStandard ?? 'FRAIS ANNEXES' };
      }
    } catch (err) {
      logger.warn({ nomenclatureId, err }, 'Failed to resolve nomenclature typeRecetteId, using default');
    }
    return { typeRecetteId: 1, libelle: 'FRAIS ANNEXES' };
  }

  /**
   * Pre-fetch all unique student and nomenclature data in bulk to minimize API calls.
   */
  private async prefetchResolutionData(transactions: TransactionData[]): Promise<void> {
    // Collect unique etudiantIds and nomenclatureIds
    const etudiantIds = [...new Set(transactions.map(tx => tx.etudiantId).filter((id): id is number => id !== null))];
    const nomenclatureIds = [...new Set(transactions.map(tx => tx.nomenclatureId).filter((id): id is number => id !== null))];

    // Prefetch students in parallel (using list endpoint with IDs)
    const studentPromises = etudiantIds.map(async (id) => {
      try {
        await this.resolveStudentFiliereId(id);
      } catch {
        // Errors already logged in resolveStudentFiliereId
      }
    });

    // Prefetch nomenclatures in parallel
    const nomenclaturePromises = nomenclatureIds.map(async (id) => {
      try {
        await this.resolveNomenclatureTypeRecetteId(id);
      } catch {
        // Errors already logged in resolveNomenclatureTypeRecetteId
      }
    });

    await Promise.allSettled([...studentPromises, ...nomenclaturePromises]);
    logger.info({
      sagaId: this.sagaId,
      studentsResolved: this.studentCache.size,
      nomenclaturesResolved: this.nomenclatureCache.size,
    }, 'Prefetch resolution data completed');
  }

  async execute(): Promise<{ message: string; generatedOpsCount?: number }> {
    logger.info({ sagaId: this.sagaId }, 'Saga Execution Started');
    await this.setSagaState({ status: 'STARTED', createdOpCodes: [] });

    try {
      const txRes = await http.get<TransactionData[]>(`${TRANSACTION_SERVICE_URL}/unassigned`);
      const transactions = txRes.data;

      if (!transactions || transactions.length === 0) {
        await this.setSagaState({ status: 'COMPLETED_EMPTY', createdOpCodes: [] });
        return { message: 'No unassigned Hors Budget transactions found.' };
      }

      // Pre-fetch resolution data for all transactions
      await this.prefetchResolutionData(transactions);

      const groups: Record<string, OpGroup> = {};

      for (const tx of transactions) {
        const antenneId = tx.antenneId ?? 1;

        // Resolve actual filiereId from student data instead of using etudiantId
        const filiereId = tx.etudiantId
          ? await this.resolveStudentFiliereId(tx.etudiantId)
          : 1;

        // Resolve actual typeRecetteId from nomenclature data instead of using nomenclatureId
        const { typeRecetteId, libelle: resolvedLibelle } = tx.nomenclatureId
          ? await this.resolveNomenclatureTypeRecetteId(tx.nomenclatureId)
          : { typeRecetteId: 1, libelle: tx.libelleProduitBrut ?? 'FRAIS ANNEXES' };

        const libelle = resolvedLibelle || tx.libelleProduitBrut || 'FRAIS ANNEXES';
        const key = `${antenneId}_${filiereId}_${typeRecetteId}`;

        if (!groups[key]) {
          groups[key] = {
            antenneId,
            filiereId,
            typeRecetteId,
            libelle,
            montantCumule: 0,
            txIds: [],
          };
        }

        groups[key].montantCumule += Number(tx.montant);
        groups[key].txIds.push(tx.id);
      }

      const now = new Date();
      const synthese = await syntheseRepository.createSynthese({
        reference: `SYN-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${this.sagaId}`,
        periodeDebut: new Date(now.getFullYear(), now.getMonth(), 1),
        periodeFin: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        typeFluxId: 2,
        statut: 'Brouillon',
        auteurId: this.auteurId,
        montantTotal: BigInt(Object.values(groups).reduce((sum, group) => sum + group.montantCumule, 0)),
        nbTransactions: transactions.length,
      });

      for (const [, group] of Object.entries(groups)) {
        if (group.txIds.length === 0) continue;

        const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const codeOp = `OP-${now.getFullYear()}-${String(group.antenneId).padStart(3, '0')}-${randStr}`;

        const op = await orderRepository.createOp({
          codeOp,
          syntheseId: synthese.id,
          antenneId: group.antenneId,
          filiereId: group.filiereId,
          typeRecetteId: group.typeRecetteId,
          montantCumule: BigInt(group.montantCumule),
          nombreFlux: group.txIds.length,
          statut: 'Brouillon',
          creeParId: this.auteurId,
        });

        this.createdOpCodes.push(codeOp);
        await this.setSagaState({ status: 'CREATING_OPS', createdOpCodes: this.createdOpCodes });

        await http.post(`${TRANSACTION_SERVICE_URL}/link-op`, {
          ordrePaiementId: op.id,
          codeOp: op.codeOp,
          transactionIds: group.txIds,
        });
        this.linkedTransactions.push({ ordrePaiementId: op.id, txIds: group.txIds });
      }

      await this.setSagaState({ status: 'COMPLETED', createdOpCodes: this.createdOpCodes });
      sagaSuccessCounter.inc();
      return { message: 'OP generation completed', generatedOpsCount: this.createdOpCodes.length };
    } catch (sagaError) {
      sagaRollbackCounter.inc();
      await this.rollback();
      throw sagaError;
    }
  }

  private async rollback(): Promise<void> {
    await this.setSagaState({ status: 'FAILING_ROLLBACK', createdOpCodes: this.createdOpCodes });

    for (const link of this.linkedTransactions) {
      try {
        await http.post(`${TRANSACTION_SERVICE_URL}/unlink-op`, { ordrePaiementId: link.ordrePaiementId });
      } catch (e) {
        logger.error({ e, ordrePaiementId: link.ordrePaiementId }, 'Rollback warning: Failed to unlink transactions');
      }
    }

    for (const code of this.createdOpCodes) {
      try {
        await orderRepository.deleteOp(code);
      } catch (e) {
        logger.error({ e, codeOp: code }, 'Rollback warning: Failed to delete local OP record');
      }
    }

    await this.setSagaState({ status: 'ROLLED_BACK', createdOpCodes: this.createdOpCodes });
  }

  private async setSagaState(state: SagaState): Promise<void> {
    try {
      await redisClient.setEx(`saga:${this.sagaId}`, SAGA_TTL_SECONDS, JSON.stringify(state));
    } catch (e) {
      logger.warn({ e, sagaId: this.sagaId }, 'Failed to persist saga state to Redis');
    }
  }
}
