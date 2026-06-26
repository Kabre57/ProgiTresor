import { apiClient } from '@/lib/api/client';
import type {
  Antenne,
  Etudiant,
  Filiere,
  NomenclatureProduit,
  Promotion,
  StatutEtudiant,
  StudentFormInput,
  TypeFlux,
  TypeRecette,
} from '@/types/student.types';

export type ReferentialEndpoint =
  | 'antennes'
  | 'filieres'
  | 'statuts-etudiants'
  | 'types-flux'
  | 'types-recettes'
  | 'nomenclatures'
  | 'promotions';

export type ReferentialMap = {
  antennes: Antenne;
  filieres: Filiere;
  'statuts-etudiants': StatutEtudiant;
  'types-flux': TypeFlux;
  'types-recettes': TypeRecette;
  nomenclatures: NomenclatureProduit;
  promotions: Promotion;
};

export type BatchLookupResponse = Record<string, Etudiant | null> | Etudiant[];

export type StudentListParams = {
  search?: string;
  antenneId?: number;
  filiereId?: number;
  statutId?: number;
  promotion?: string;
  promotionId?: number;
};

const cleanStudentListParams = (params: StudentListParams) => {
  const cleaned: Record<string, string | number> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 0) return;
    cleaned[key] = value;
  });
  return cleaned;
};

export const studentApi = {
  list: async (
    paramsOrSearch?: StudentListParams | string,
    antenneId?: number,
    filiereId?: number,
    promotion?: string,
    statutId?: number,
    promotionId?: number,
  ) => {
    const params =
      typeof paramsOrSearch === 'object'
        ? cleanStudentListParams(paramsOrSearch)
        : cleanStudentListParams({
            search: paramsOrSearch,
            antenneId,
            filiereId,
            promotion,
            statutId,
            promotionId,
          });
    const response = await apiClient.get<Etudiant[]>('/students', { params });
    return response.data;
  },

  getPromotions: async (): Promise<Promotion[]> => {
    const response = await apiClient.get<Promotion[]>('/students/promotions');
    return response.data;
  },

  getStudent: async (matricule: string) => {
    const response = await apiClient.get<Etudiant>(`/students/${matricule}`);
    return response.data;
  },

  createStudent: async (payload: StudentFormInput) => {
    const response = await apiClient.post<Etudiant>('/students', payload);
    return response.data;
  },

  updateStudent: async (matricule: string, payload: Partial<StudentFormInput>) => {
    const response = await apiClient.put<Etudiant>(`/students/${matricule}`, payload);
    return response.data;
  },

  batchLookup: async (matricules: string[]) => {
    const response = await apiClient.post<BatchLookupResponse>('/students/batch', { matricules });
    return response.data;
  },

  listReferential: async <TEndpoint extends ReferentialEndpoint>(endpoint: TEndpoint) => {
    const response = await apiClient.get<ReferentialMap[TEndpoint][]>(`/students/${endpoint}`);
    return response.data;
  },

  createReferential: async <TEndpoint extends ReferentialEndpoint>(
    endpoint: TEndpoint,
    payload: Record<string, unknown>,
  ) => {
    const response = await apiClient.post<ReferentialMap[TEndpoint]>(`/students/${endpoint}`, payload);
    return response.data;
  },

  updateReferential: async <TEndpoint extends ReferentialEndpoint>(
    endpoint: TEndpoint,
    id: number,
    payload: Record<string, unknown>,
  ) => {
    const response = await apiClient.put<ReferentialMap[TEndpoint]>(`/students/${endpoint}/${id}`, payload);
    return response.data;
  },

  deleteReferential: async (endpoint: ReferentialEndpoint, id: number) => {
    const response = await apiClient.delete(`/students/${endpoint}/${id}`);
    return response.data;
  },

  importStudents: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{
      message: string;
      created: number;
      duplicates_skipped: number;
      errors: string[] | null;
    }>('/students/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get<Etudiant>('/students/me');
    return response.data;
  },

  mapTresorPay: async (payload: { matricule?: string; matriculeTresorPay: string }) => {
    const response = await apiClient.post<Etudiant>('/students/tresor-pay/map', payload);
    return response.data;
  },

  getTemporaryStudentNotifications: async () => {
    const response = await apiClient.get<any[]>('/students/notifications/etudiant-temporaire');
    return response.data;
  },

  markTemporaryStudentNotificationTreated: async (id: number) => {
    const response = await apiClient.post<any>(`/students/notifications/etudiant-temporaire/${id}/traiter`);
    return response.data;
  },

  /** Uploader une photo de profil étudiant */
  uploadStudentPhoto: async (matricule: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await apiClient.post<{ message: string; etudiant: Etudiant }>(
      `/students/${matricule}/photo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  /** Supprimer la photo de profil étudiant */
  deleteStudentPhoto: async (matricule: string) => {
    const response = await apiClient.delete<{ message: string; etudiant: Etudiant }>(
      `/students/${matricule}/photo`,
    );
    return response.data;
  },
};
