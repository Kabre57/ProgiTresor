import { apiClient } from '@/lib/api/client';
import type {
  Bordereau,
  BordereauListParams,
  ControleOpOt,
  EcritureBudgetaire,
  LigneBudgetaire,
  LigneBudgetairePayload,
  LotTraitement,
  LotTraitementCreatePayload,
  LotTraitementListParams,
  LotTraitementProcessPayload,
  OrdrePaiement,
  PaginatedResult,
} from '@/types/compta-budget.types';

export const comptaWorkflowApi = {
  listBordereaux: async (params?: BordereauListParams) => {
    const response = await apiClient.get<PaginatedResult<Bordereau>>('/compta/bordereaux', {
      params,
    });
    return response.data;
  },

  getBordereau: async (id: number) => {
    const response = await apiClient.get<Bordereau>(`/compta/bordereaux/${id}`);
    return response.data;
  },

  listEcritures: async (bordereauId: number) => {
    const response = await apiClient.get<EcritureBudgetaire[]>(
      `/compta/bordereaux/${bordereauId}/ecritures`,
    );
    return response.data;
  },

  listLignesBudgetaires: async () => {
    const response = await apiClient.get<LigneBudgetaire[]>('/compta/lignes-budgetaires');
    return response.data;
  },

  saveLigneBudgetaire: async (payload: LigneBudgetairePayload) => {
    const response = await apiClient.post<LigneBudgetaire>('/compta/lignes-budgetaires', payload);
    return response.data;
  },

  listLots: async (params?: LotTraitementListParams) => {
    const response = await apiClient.get<PaginatedResult<LotTraitement>>('/compta/lots', { params });
    return response.data;
  },

  createLot: async (payload: LotTraitementCreatePayload & { ecritureIds?: number[]; remarques?: string }) => {
    const response = await apiClient.post<LotTraitement>('/compta/lots', payload);
    return response.data;
  },

  listPendingEcritures: async (params?: {
    antenneId?: number;
    typeRecetteId?: number;
    dateDebut?: string;
    dateFin?: string;
  }) => {
    const response = await apiClient.get<any[]>('/compta/ecritures/pending', { params });
    return response.data;
  },

  getLot: async (id: number) => {
    const response = await apiClient.get<LotTraitement>(`/compta/lots/${id}`);
    return response.data;
  },

  traiterLot: async (id: number, payload: LotTraitementProcessPayload) => {
    const response = await apiClient.post<LotTraitement>(`/compta/lots/${id}/traiter`, payload);
    return response.data;
  },

  transmettreLotBudget: async (id: number, utilisateurTransmission?: string) => {
    const response = await apiClient.post<OrdrePaiement>(`/compta/lots/${id}/transmettre-budget`, {
      utilisateurTransmission,
    });
    return response.data;
  },

  listControlesOp: async () => {
    const response = await apiClient.get<ControleOpOt[]>('/compta/controles/op');
    return response.data;
  },
};
