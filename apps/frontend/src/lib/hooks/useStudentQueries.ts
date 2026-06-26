import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studentApi, type ReferentialEndpoint, type StudentListParams } from '@/lib/api/studentApi';
import type { StudentFormInput } from '@/types/student.types';

export const studentQueryKeys = {
  referential: (endpoint: ReferentialEndpoint) => ['student', 'referential', endpoint] as const,
  student: (matricule: string) => ['student', matricule] as const,
};

export const useReferential = <TEndpoint extends ReferentialEndpoint>(endpoint: TEndpoint) =>
  useQuery({
    queryKey: studentQueryKeys.referential(endpoint),
    queryFn: () => studentApi.listReferential(endpoint),
  });

export const useCreateReferential = <TEndpoint extends ReferentialEndpoint>(endpoint: TEndpoint) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => studentApi.createReferential(endpoint, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentQueryKeys.referential(endpoint) }),
  });
};

export const useUpdateReferential = <TEndpoint extends ReferentialEndpoint>(endpoint: TEndpoint) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      studentApi.updateReferential(endpoint, id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentQueryKeys.referential(endpoint) }),
  });
};

export const useDeleteReferential = (endpoint: ReferentialEndpoint) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => studentApi.deleteReferential(endpoint, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentQueryKeys.referential(endpoint) }),
  });
};

const normalizeStudentListParams = (
  paramsOrSearch?: StudentListParams | string,
  antenneId?: number,
  filiereId?: number,
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
        promotion,
        statutId,
        promotionId,
      };

export const useStudents = (
  paramsOrSearch?: StudentListParams | string,
  antenneId?: number,
  filiereId?: number,
  promotion?: string,
  statutId?: number,
  promotionId?: number,
) => {
  const params = normalizeStudentListParams(paramsOrSearch, antenneId, filiereId, promotion, statutId, promotionId);
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => studentApi.list(params),
  });
};

export const useStudent = (matricule?: string) =>
  useQuery({
    queryKey: studentQueryKeys.student(matricule ?? ''),
    queryFn: () => studentApi.getStudent(matricule ?? ''),
    enabled: Boolean(matricule),
  });

export const usePromotions = () =>
  useQuery({
    queryKey: studentQueryKeys.referential('promotions'),
    queryFn: () => studentApi.getPromotions(),
  });

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StudentFormInput) => studentApi.createStudent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matricule, payload }: { matricule: string; payload: Partial<StudentFormInput> }) =>
      studentApi.updateStudent(matricule, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      if (data?.matricule) {
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.student(data.matricule) });
      }
    },
  });
};

export const useStudentMe = () =>
  useQuery({
    queryKey: ['students', 'me'],
    queryFn: () => studentApi.getMe(),
  });

export const useMapTresorPay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { matricule?: string; matriculeTresorPay: string }) =>
      studentApi.mapTresorPay(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['student-notifications'] });
    },
  });
};

export const useTemporaryStudentNotifications = () =>
  useQuery({
    queryKey: ['student-notifications'],
    queryFn: () => studentApi.getTemporaryStudentNotifications(),
  });

export const useMarkTemporaryStudentNotificationTreated = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => studentApi.markTemporaryStudentNotificationTreated(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-notifications'] });
    },
  });
};
