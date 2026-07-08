import { apiClient } from '@/lib/api/client';
import type {
  AnalyseFilters,
  AnalyseKpis,
  GenerateSynthesisResponse,
  ValidateSynthesisPayload,
  ValidateSynthesisResponse,
} from '@/types/analyse.types';

export const analyseApi = {
  generateSynthesis: async (filters?: AnalyseFilters) => {
    const response = await apiClient.post<GenerateSynthesisResponse>(
      '/analyse/generate-synthesis',
      filters ?? {},
    );
    return response.data;
  },

  validateSynthesis: async (payload: ValidateSynthesisPayload) => {
    const response = await apiClient.post<ValidateSynthesisResponse>(
      '/analyse/validate-synthesis',
      payload,
    );
    return response.data;
  },

  previewPdf: async (payload: unknown) => {
    const response = await apiClient.post<Blob>(
      '/analyse/preview-pdf',
      payload,
      { responseType: 'blob' }
    );
    return response.data;
  },


  getKpis: async (dateDebut?: string, dateFin?: string, antenneId?: number) => {
    const response = await apiClient.get<AnalyseKpis>('/analyse/kpis', {
      params: { dateDebut, dateFin, antenneId },
    });
    return response.data;
  },
};
