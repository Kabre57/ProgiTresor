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
    nonClassifie?: number;
    total: number;
  };
};

type QueryParamValue = string | number | boolean | null | undefined | string[] | number[];
type QueryParams = object;

const serializeParams = (params?: QueryParams) => {
  if (!params) return params;
  const serialized: Record<string, string | number | boolean | null | undefined> = {};
  const entries = Object.entries(params) as Array<[string, QueryParamValue]>;
  for (const [key, value] of entries) {
    serialized[key] = Array.isArray(value) ? value.join(',') : value;
  }
  return serialized;
};

export const transactionApi = {
  list: async (params?: QueryParams) => {
    const response = await apiClient.get<PaginatedTransactions>('/transactions', {
      params: serializeParams(params),
    });
    return response.data;
  },

  listByIds: async (ids: number[]) => {
    const response = await apiClient.post<PaginatedTransactions>('/transactions/by-ids', {
      ids,
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

  importFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ message: string; imported?: number; duplicates_skipped?: number }>(
      '/transactions/import-file',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
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

  export: async (params?: QueryParams) => {
    const response = await apiClient.get<Blob>('/transactions/export', {
      params: serializeParams(params),
      responseType: 'blob',
    });
    return response.data;
  },

  getGroupedByRecette: async (params?: QueryParams) => {
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

  exportSynthese: async (params?: QueryParams) => {
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

  update: async (id: number | string, payload: Record<string, unknown>) => {
    const response = await apiClient.put<{ message: string; data: Transaction }>(`/transactions/${id}`, payload);
    return response.data;
  },

  delete: async (id: number | string) => {
    const response = await apiClient.delete<{ message: string }>(`/transactions/${id}`);
    return response.data;
  },
};
