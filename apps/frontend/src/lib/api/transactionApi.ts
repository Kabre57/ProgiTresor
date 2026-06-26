import { apiClient } from '@/lib/api/client';
import type { Transaction } from '@/types/transaction.types';

export type PaginatedTransactions = {
  list: Transaction[];
  total: number;
  limit: number;
  offset: number;
  totals?: {
    budget: number;
    horsBudget: number;
    total: number;
  };
};

const serializeParams = (params?: Record<string, any>) => {
  if (!params) return params;
  const serialized = { ...params };
  for (const key in serialized) {
    if (Array.isArray(serialized[key])) {
      serialized[key] = serialized[key].join(',');
    }
  }
  return serialized;
};

export const transactionApi = {
  list: async (params?: Record<string, any>) => {
    const response = await apiClient.get<PaginatedTransactions>('/transactions', {
      params: serializeParams(params),
    });
    return response.data;
  },

  unassigned: async () => {
    const response = await apiClient.get<Transaction[]>('/transactions/unassigned');
    return response.data;
  },

  import: async (payload: {
    nomFichier: string;
    typeFichier: string;
    auteurId: number;
    items: unknown[];
  }) => {
    const response = await apiClient.post<{ message: string; imported?: number; duplicates_skipped?: number }>(
      '/transactions/import',
      payload,
    );
    return response.data;
  },

  getKpis: async (dateDebut?: string, dateFin?: string, antenneId?: number) => {
    const response = await apiClient.get<{
      totalBudget: number;
      totalHorsBudget: number;
      byLibelle: { libelle: string; type: string; montant: number }[];
    }>('/dashboard/kpis', {
      params: { dateDebut, dateFin, antenneId },
    });
    return response.data;
  },

  export: async (params?: Record<string, any>) => {
    const response = await apiClient.get<Blob>('/transactions/export', {
      params: serializeParams(params),
      responseType: 'blob',
    });
    return response.data;
  },

  getGroupedByRecette: async (params?: Record<string, any>) => {
    const response = await apiClient.get<{
      nomenclatureId: number | null;
      libelleStandard: string;
      typeRecette: string;
      montantBudget: number;
      montantHorsBudget: number;
      montantTotal: number;
    }[]>('/dashboard/grouped-by-recette', {
      params: serializeParams(params),
    });
    return response.data;
  },

  exportSynthese: async (params?: Record<string, any>) => {
    const response = await apiClient.get<Blob>('/dashboard/export-synthese', {
      params: serializeParams(params),
      responseType: 'blob',
    });
    return response.data;
  },

  fetchFromTresor: async () => {
    const response = await apiClient.post<{ message: string; imported: number; duplicatesSkipped: number }>('/transactions/fetch-from-tresor');
    return response.data;
  },

  update: async (id: number | string, payload: any) => {
    const response = await apiClient.put<{ message: string; data: any }>(`/transactions/${id}`, payload);
    return response.data;
  },

  delete: async (id: number | string) => {
    const response = await apiClient.delete<{ message: string }>(`/transactions/${id}`);
    return response.data;
  },
};
