import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { etudiantApi, type ReferentialEndpoint, type EtudiantListParams } from '@/lib/api/etudiantApi';
import { isStudentUser } from '@/lib/auth/roles';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { EtudiantFormInput } from '@/types/etudiant.types';

export const etudiantQueryKeys = {
  referential: (endpoint: ReferentialEndpoint) => ['etudiant', 'referential', endpoint] as const,
  etudiant: (matricule: string) => ['etudiant', matricule] as const,
};

export const useReferential = <TEndpoint extends ReferentialEndpoint>(endpoint: TEndpoint) =>
  useQuery({
    queryKey: etudiantQueryKeys.referential(endpoint),
    queryFn: () => etudiantApi.listReferential(endpoint),
  });

export const useCreateReferential = <TEndpoint extends ReferentialEndpoint>(endpoint: TEndpoint) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => etudiantApi.createReferential(endpoint, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: etudiantQueryKeys.referential(endpoint) }),
  });
};

export const useUpdateReferential = <TEndpoint extends ReferentialEndpoint>(endpoint: TEndpoint) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      etudiantApi.updateReferential(endpoint, id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: etudiantQueryKeys.referential(endpoint) }),
  });
};

export const useDeleteReferential = (endpoint: ReferentialEndpoint) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etudiantApi.deleteReferential(endpoint, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: etudiantQueryKeys.referential(endpoint) }),
  });
};

const normalizeEtudiantListParams = (
  paramsOrSearch?: EtudiantListParams | string,
  antenneId?: number,
  filiereId?: number,
  niveauId?: number,
  promotion?: string,
  statutId?: number,
  promotionId?: number,
) =>
  typeof paramsOrSearch === 'object'
    ? paramsOrSearch
    : {
        search: paramsOrSearch,
        antenneId,
        filiereId,
        niveauId,
        promotion,
        statutId,
        promotionId,
      };

export const useEtudiants = (
  paramsOrSearch?: EtudiantListParams | string,
  antenneId?: number,
  filiereId?: number,
  niveauId?: number,
  promotion?: string,
  statutId?: number,
  promotionId?: number,
) => {
  const params = normalizeEtudiantListParams(paramsOrSearch, antenneId, filiereId, niveauId, promotion, statutId, promotionId);
  return useQuery({
    queryKey: ['etudiant', params],
    queryFn: () => etudiantApi.list(params),
  });
};

export const useEtudiant = (matricule?: string) =>
  useQuery({
    queryKey: etudiantQueryKeys.etudiant(matricule ?? ''),
    queryFn: () => etudiantApi.getEtudiant(matricule ?? ''),
    enabled: Boolean(matricule),
  });

export const usePromotions = () =>
  useQuery({
    queryKey: etudiantQueryKeys.referential('promotions'),
    queryFn: () => etudiantApi.getPromotions(),
  });

export const useCreateEtudiant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EtudiantFormInput) => etudiantApi.createEtudiant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etudiant'] });
    },
  });
};

export const useUpdateEtudiant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matricule, payload }: { matricule: string; payload: Partial<EtudiantFormInput> }) =>
      etudiantApi.updateEtudiant(matricule, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['etudiant'] });
      if (data?.matricule) {
        queryClient.invalidateQueries({ queryKey: etudiantQueryKeys.etudiant(data.matricule) });
      }
    },
  });
};

export const useEtudiantMe = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['etudiant', 'me', user?.id],
    queryFn: () => etudiantApi.getMe(),
    enabled: isAuthenticated && isStudentUser(user),
    retry: (failureCount, error) =>
      failureCount < 3 && !(isAxiosError(error) && error.response?.status === 404),
  });
};

export const useMapTresorPay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { matricule?: string; matriculeTresorPay: string }) =>
      etudiantApi.mapTresorPay(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etudiant'] });
      queryClient.invalidateQueries({ queryKey: ['etudiant', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['etudiant-notifications'] });
    },
  });
};

export const useTemporaryEtudiantNotifications = () =>
  useQuery({
    queryKey: ['etudiant-notifications'],
    queryFn: () => etudiantApi.getTemporaryEtudiantNotifications(),
  });

export const useMarkTemporaryEtudiantNotificationTreated = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => etudiantApi.markTemporaryEtudiantNotificationTreated(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etudiant-notifications'] });
    },
  });
};

export const useStudentFinancialSummary = (matricule?: string) =>
  useQuery({
    queryKey: ['etudiant', 'financial-summary', matricule ?? ''],
    queryFn: () => etudiantApi.getFinancialSummary(matricule ?? ''),
    enabled: Boolean(matricule),
  });

export const useDownloadAttestation = () => {
  return useMutation({
    mutationFn: (matricule: string) => etudiantApi.downloadAttestation(matricule),
  });
};
