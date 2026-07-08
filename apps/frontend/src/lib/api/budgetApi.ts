import { apiClient } from '@/lib/api/client';
import type {
  OrdrePaiement,
  OrdrePaiementListParams,
  PaginatedResult,
} from '@/types/compta-budget.types';

export const budgetApi = {
  listOrdresPaiement: async (params?: OrdrePaiementListParams) => {
    const response = await apiClient.get<PaginatedResult<OrdrePaiement>>(
      '/budget/ordres-paiement',
      { params },
    );
    return response.data;
  },

  getOrdrePaiement: async (id: string) => {
    const response = await apiClient.get<OrdrePaiement>(`/budget/ordres-paiement/${id}`);
    return response.data;
  },

  transmettreCompta: async (id: string, utilisateurTransmission?: string) => {
    const response = await apiClient.post<OrdrePaiement>(
      `/budget/ordres-paiement/${id}/transmettre-compta`,
      { utilisateurTransmission },
    );
    return response.data;
  },
};
