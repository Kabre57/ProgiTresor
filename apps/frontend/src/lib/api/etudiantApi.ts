import { apiClient } from '@/lib/api/client';
import type {
  Antenne,
  Etudiant,
  Filiere,
  Niveau,
  NomenclatureProduit,
  Promotion,
  StatutEtudiant,
  EtudiantFormInput,
  TypeFlux,
  TypeRecette,
  ConfigurationFraisNiveau,
} from '@/types/etudiant.types';

export type ReferentialEndpoint =
  | 'antennes'
  | 'filieres'
  | 'niveaux'
  | 'statuts-etudiants'
  | 'types-flux'
  | 'types-recettes'
  | 'nomenclatures'
  | 'configuration-frais-niveau'
  | 'promotions';

export type ReferentialMap = {
  antennes: Antenne;
  filieres: Filiere;
  niveaux: Niveau;
  'statuts-etudiants': StatutEtudiant;
  'types-flux': TypeFlux;
  'types-recettes': TypeRecette;
  nomenclatures: NomenclatureProduit;
  'configuration-frais-niveau': ConfigurationFraisNiveau;
  promotions: Promotion;
};

export type BatchLookupResponse = Record<string, Etudiant | null> | Etudiant[];

export type EtudiantListParams = {
  search?: string;
  antenneId?: number;
  filiereId?: number;
  niveauId?: number;
  statutId?: number;
  promotion?: string;
  promotionId?: number;
};

const cleanEtudiantListParams = (params: EtudiantListParams) => {
  const cleaned: Record<string, string | number> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 0) return;
    cleaned[key] = value;
  });
  return cleaned;
};

export const etudiantApi = {
  list: async (
    paramsOrSearch?: EtudiantListParams | string,
    antenneId?: number,
    filiereId?: number,
    niveauId?: number,
    promotion?: string,
    statutId?: number,
    promotionId?: number,
  ) => {
    const params =
      typeof paramsOrSearch === 'object'
        ? cleanEtudiantListParams(paramsOrSearch)
        : cleanEtudiantListParams({
            search: paramsOrSearch,
            antenneId,
            filiereId,
            niveauId,
            promotion,
            statutId,
            promotionId,
          });
    const response = await apiClient.get<Etudiant[]>('/etudiant', { params });
    return response.data;
  },

  getPromotions: async (): Promise<Promotion[]> => {
    const response = await apiClient.get<Promotion[]>('/etudiant/promotions');
    return response.data;
  },

  getEtudiant: async (matricule: string) => {
    const response = await apiClient.get<Etudiant>(`/etudiant/${matricule}`);
    return response.data;
  },

  createEtudiant: async (payload: EtudiantFormInput) => {
    const response = await apiClient.post<Etudiant>('/etudiant', payload);
    return response.data;
  },

  updateEtudiant: async (matricule: string, payload: Partial<EtudiantFormInput>) => {
    const response = await apiClient.put<Etudiant>(`/etudiant/${matricule}`, payload);
    return response.data;
  },

  batchLookup: async (matricules: string[]) => {
    const response = await apiClient.post<BatchLookupResponse>('/etudiant/batch', { matricules });
    return response.data;
  },

  listReferential: async <TEndpoint extends ReferentialEndpoint>(endpoint: TEndpoint) => {
    const response = await apiClient.get<ReferentialMap[TEndpoint][]>(`/etudiant/${endpoint}`);
    return response.data;
  },

  createReferential: async <TEndpoint extends ReferentialEndpoint>(
    endpoint: TEndpoint,
    payload: Record<string, unknown>,
  ) => {
    const response = await apiClient.post<ReferentialMap[TEndpoint]>(`/etudiant/${endpoint}`, payload);
    return response.data;
  },

  updateReferential: async <TEndpoint extends ReferentialEndpoint>(
    endpoint: TEndpoint,
    id: number,
    payload: Record<string, unknown>,
  ) => {
    const response = await apiClient.put<ReferentialMap[TEndpoint]>(`/etudiant/${endpoint}/${id}`, payload);
    return response.data;
  },

  deleteReferential: async (endpoint: ReferentialEndpoint, id: number) => {
    const response = await apiClient.delete(`/etudiant/${endpoint}/${id}`);
    return response.data;
  },

  importEtudiants: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{
      message: string;
      created: number;
      duplicates_skipped: number;
      errors: string[] | null;
    }>('/etudiant/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  importReferential: async (entity: ReferentialEndpoint, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{
      message: string;
      created: number;
      duplicates_skipped: number;
      errors: string[] | null;
    }>(`/etudiant/import-referential/${entity}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get<Etudiant>('/etudiant/me');
    return response.data;
  },

  mapTresorPay: async (payload: { matricule?: string; matriculeTresorPay: string }) => {
    const response = await apiClient.post<Etudiant>('/etudiant/tresor-pay/map', payload);
    return response.data;
  },

  getTemporaryEtudiantNotifications: async () => {
    const response = await apiClient.get<any[]>('/etudiant/notifications/etudiant-temporaire');
    return response.data;
  },

  markTemporaryEtudiantNotificationTreated: async (id: number) => {
    const response = await apiClient.post<any>(`/etudiant/notifications/etudiant-temporaire/${id}/traiter`);
    return response.data;
  },

  /** Uploader une photo de profil étudiant */
  uploadEtudiantPhoto: async (matricule: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await apiClient.post<{ message: string; etudiant: Etudiant }>(
      `/etudiant/${matricule}/photo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  /** Supprimer la photo de profil étudiant */
  deleteEtudiantPhoto: async (matricule: string) => {
    const response = await apiClient.delete<{ message: string; etudiant: Etudiant }>(
      `/etudiant/${matricule}/photo`,
    );
    return response.data;
  },

  getFinancialSummary: async (matricule: string) => {
    const response = await apiClient.get<any>(`/etudiant/${matricule}/financial-summary`);
    return response.data;
  },

  downloadAttestation: async (matricule: string): Promise<Blob> => {
    const response = await apiClient.post(`/etudiant/${matricule}/generate-attestation`, null, {
      responseType: 'blob',
    });
    return response.data as any;
  },
};
