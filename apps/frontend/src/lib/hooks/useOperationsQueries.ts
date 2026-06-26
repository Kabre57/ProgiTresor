import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { orderApi } from '@/lib/api/orderApi';
import { transactionApi } from '@/lib/api/transactionApi';

export const useTransactions = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['transactions', params],
    queryFn: () => transactionApi.list(params),
  });

export const useUnassignedTransactions = () =>
  useQuery({
    queryKey: ['transactions', 'unassigned'],
    queryFn: transactionApi.unassigned,
  });

export const useImportTransactions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      nomFichier: string;
      typeFichier: string;
      auteurId: number;
      items: unknown[];
    }) => transactionApi.import(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
};

export const useOrders = () =>
  useQuery({
    queryKey: ['orders'],
    queryFn: orderApi.list,
  });

export const useGenerateOrders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orderApi.generate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, statut, motif }: { code: string; statut: string; motif?: string }) =>
      orderApi.updateStatus(code, { statut, motif }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useDashboardKpis = (dateDebut?: string, dateFin?: string, antenneId?: number) =>
  useQuery({
    queryKey: ['dashboard', 'kpis', dateDebut, dateFin, antenneId],
    queryFn: () => transactionApi.getKpis(dateDebut, dateFin, antenneId),
  });

export const useGroupedByRecette = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['dashboard', 'grouped-by-recette', params],
    queryFn: () => transactionApi.getGroupedByRecette(params),
  });

export const useFetchFromTresor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => transactionApi.fetchFromTresor(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: any }) => transactionApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => transactionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
