import * as orderRepository from '../repositories/orderRepository';
import * as syntheseRepository from '../repositories/syntheseRepository';
import redisClient from '../utils/redis';
import { http, TRANSACTION_SERVICE_URL, ETUDIANT_SERVICE_URL } from '../utils/httpClient';
import { sagaSuccessCounter, sagaRollbackCounter } from '../utils/metrics';
import logger from '../utils/logger';

interface TransactionData {
  id: number;
  montant: string | number;
  antenneId: number | null;
  etudiantId: number | null;
  nomenclatureId: number | null;
  typeFluxId: number | null;
  libelleProduitBrut: string | null;
}

interface EtudiantInfo {
  id: number;
  niveauId: number;
  antenneId: number;
}

interface NomenclatureInfo {
  id: number;
  typeRecetteId: number;
  libelleStandard: string;
}

interface OtGroup {
  antenneId: number;
  niveauId: number;
  typeRecetteId: number;
  libelle: string;
  montantCumule: number;
  txIds: number[];
}

interface SagaState {
  status: string;
  createdOtCodes: string[];
}

const SAGA_STATE_TTL_SECONDS = Number(process.env.SAGA_STATE_TTL_SECONDS ?? 300);

export class SagaCoordinator {
  private sagaId: string;
  private createdOtCodes: string[] = [];
  private linkedTransactions: { ordreTraitementId: number; txIds: number[] }[] = [];

  // Caches for resolved etudiant and nomenclature data
  private etudiantCache: Map<number, EtudiantInfo> = new Map();
  private nomenclatureCache: Map<number, NomenclatureInfo> = new Map();

  constructor(private readonly auteurId: number) {
    this.sagaId = `SAGA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /**
   * Resolve the niveauId for a given etudiantId by querying etudiant-service.
   * Results are cached to avoid redundant calls.
   */
  private async resolveEtudiantNiveauId(etudiantId: number): Promise<number> {
    if (this.etudiantCache.has(etudiantId)) {
      return this.etudiantCache.get(etudiantId)!.niveauId;
    }

    try {
      const response = await http.post(`${ETUDIANT_SERVICE_URL}/batch-ids`, { ids: [etudiantId] });
      const etudiants = response.data;
      if (Array.isArray(etudiants) && etudiants.length > 0) {
        const etudiant = etudiants[0];
        this.etudiantCache.set(etudiantId, {
          id: etudiant.id,
          niveauId: etudiant.niveauId,
          antenneId: etudiant.antenneId
        });
        return etudiant.niveauId ?? 1;
      }
    } catch (err) {
      logger.warn({ etudiantId, err }, 'Failed to resolve etudiant niveauId, using default');
    }
    return 1; // default fallback
  }

  /**
   * Resolve the typeRecetteId for a given nomenclatureId by querying etudiant-service.
   * Results are cached to avoid redundant calls.
   */
  private async resolveNomenclatureTypeRecetteId(nomenclatureId: number): Promise<{ typeRecetteId: number; libelle: string }> {
    if (this.nomenclatureCache.has(nomenclatureId)) {
      const cached = this.nomenclatureCache.get(nomenclatureId)!;
      return { typeRecetteId: cached.typeRecetteId, libelle: cached.libelleStandard };
    }

    try {
      const response = await http.get(`${ETUDIANT_SERVICE_URL}/nomenclatures/${nomenclatureId}`);
      const nomenclature = response.data;
      if (nomenclature && nomenclature.typeRecetteId) {
        this.nomenclatureCache.set(nomenclatureId, {
          id: nomenclature.id,
          typeRecetteId: nomenclature.typeRecetteId,
          libelleStandard: nomenclature.libelleStandard ?? 'FRAIS ANNEXES'
        });
        return { typeRecetteId: nomenclature.typeRecetteId, libelle: nomenclature.libelleStandard ?? 'FRAIS ANNEXES' };
      }
    } catch (err) {
      logger.warn({ nomenclatureId, err }, 'Failed to resolve nomenclature typeRecetteId, using default');
    }
    return { typeRecetteId: 1, libelle: 'FRAIS ANNEXES' };
  }

  /**
   * Pre-fetch all unique etudiant and nomenclature data in bulk to minimize API calls.
   */
  private async prefetchResolutionData(transactions: TransactionData[]): Promise<void> {
    const etudiantIds = [...new Set(transactions.map(tx => tx.etudiantId).filter((id): id is number => id !== null))];
    const nomenclatureIds = [...new Set(transactions.map(tx => tx.nomenclatureId).filter((id): id is number => id !== null))];

    if (etudiantIds.length > 0) {
      try {
        const response = await http.post(`${ETUDIANT_SERVICE_URL}/batch-ids`, { ids: etudiantIds });
        const etudiants = response.data;
        if (Array.isArray(etudiants)) {
          for (const etudiant of etudiants) {
            this.etudiantCache.set(etudiant.id, {
              id: etudiant.id,
              niveauId: etudiant.niveauId,
              antenneId: etudiant.antenneId
            });
          }
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to prefetch etudiants');
      }
    }

    if (nomenclatureIds.length > 0) {
      await Promise.allSettled(
        nomenclatureIds.map(async (id) => {
          try {
            await this.resolveNomenclatureTypeRecetteId(id);
          } catch {
            // Already logged
          }
        })
      );
    }

    logger.info({
      sagaId: this.sagaId,
      etudiantResolved: this.etudiantCache.size,
      nomenclaturesResolved: this.nomenclatureCache.size,
    }, 'Prefetch resolution data completed');
  }

  async execute(): Promise<{ message: string; generatedOtsCount?: number }> {
    logger.info({ sagaId: this.sagaId }, 'Saga Execution Started');
    await this.setSagaState({ status: 'STARTED', createdOtCodes: [] });

    try {
      const txRes = await http.get<TransactionData[]>(`${TRANSACTION_SERVICE_URL}/unassigned`);
      const transactions = txRes.data;

      if (!transactions || transactions.length === 0) {
        await this.setSagaState({ status: 'COMPLETED_EMPTY', createdOtCodes: [] });
        return { message: 'No unassigned Hors Budget transactions found.' };
      }

      await this.prefetchResolutionData(transactions);

      const groups: Record<string, OtGroup> = {};

      for (const tx of transactions) {
        const antenneId = tx.antenneId ?? 1;
        const niveauId = tx.etudiantId
          ? await this.resolveEtudiantNiveauId(tx.etudiantId)
          : 1;
        const { typeRecetteId, libelle: resolvedLibelle } = tx.nomenclatureId
          ? await this.resolveNomenclatureTypeRecetteId(tx.nomenclatureId)
          : { typeRecetteId: 1, libelle: tx.libelleProduitBrut ?? 'FRAIS ANNEXES' };

        const libelle = resolvedLibelle || tx.libelleProduitBrut || 'FRAIS ANNEXES';
        const key = `${antenneId}_${niveauId}_${typeRecetteId}`;

        if (!groups[key]) {
          groups[key] = {
            antenneId,
            niveauId,
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
        const codeOt = `TEMP-OT-${now.getFullYear()}-${String(group.antenneId).padStart(3, '0')}-${randStr}`;

        const op = await orderRepository.createOt({
          codeOt,
          syntheseId: synthese.id,
          antenneId: group.antenneId,
          niveauId: group.niveauId,
          typeRecetteId: group.typeRecetteId,
          montantCumule: BigInt(group.montantCumule),
          nombreFlux: group.txIds.length,
          statut: 'Brouillon',
          creeParId: this.auteurId,
        });

        this.createdOtCodes.push(codeOt);
        await this.setSagaState({ status: 'CREATING_OPS', createdOtCodes: this.createdOtCodes });

        await http.post(`${TRANSACTION_SERVICE_URL}/link-ot`, {
          ordreTraitementId: op.id,
          codeOt: op.codeOt,
          transactionIds: group.txIds,
        });
        this.linkedTransactions.push({ ordreTraitementId: op.id, txIds: group.txIds });
      }

      await this.setSagaState({ status: 'COMPLETED', createdOtCodes: this.createdOtCodes });
      sagaSuccessCounter.inc();
      return { message: 'OT generation completed', generatedOtsCount: this.createdOtCodes.length };
    } catch (sagaError) {
      sagaRollbackCounter.inc();
      await this.rollback();
      throw sagaError;
    }
  }

  private async rollback(): Promise<void> {
    await this.setSagaState({ status: 'FAILING_ROLLBACK', createdOtCodes: this.createdOtCodes });

    for (const link of this.linkedTransactions) {
      try {
        await http.post(`${TRANSACTION_SERVICE_URL}/unlink-ot`, { ordreTraitementId: link.ordreTraitementId });
      } catch (e) {
        logger.error({ e, ordreTraitementId: link.ordreTraitementId }, 'Rollback warning: Failed to unlink transactions');
      }
    }

    for (const code of this.createdOtCodes) {
      try {
        await orderRepository.deleteOt(code);
      } catch (e) {
        logger.error({ e, codeOt: code }, 'Rollback warning: Failed to delete local OT record');
      }
    }

    await this.setSagaState({ status: 'ROLLED_BACK', createdOtCodes: this.createdOtCodes });
  }

  private async setSagaState(state: SagaState): Promise<void> {
    try {
      await redisClient.setEx(`saga:${this.sagaId}`, SAGA_STATE_TTL_SECONDS, JSON.stringify(state));
    } catch (e) {
      logger.warn({ e, sagaId: this.sagaId }, 'Failed to persist saga state to Redis');
    }
  }
}
