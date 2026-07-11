import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { analyseApi } from '@/lib/api/analyseApi';
import { budgetApi } from '@/lib/api/budgetApi';
import { comptaWorkflowApi } from '@/lib/api/comptaWorkflowApi';
import { orderApi } from '@/lib/api/orderApi';
import { transactionApi } from '@/lib/api/transactionApi';
import type { AnalyseFilters, SynthesisLine, ValidateSynthesisPayload } from '@/types/analyse.types';
import type {
  BordereauListParams,
  LigneBudgetairePayload,
  LotTraitementCreatePayload,
  LotTraitementListParams,
  LotTraitementProcessPayload,
  OrdrePaiementListParams,
} from '@/types/compta-budget.types';

export type OperationQueryParams = object;
type TransactionListParams = Record<string, unknown> & { etudiantMatricule?: string };

export const useTransactions = (params?: TransactionListParams, enabled = true) =>
  useQuery({
    queryKey: ['transactions', params],
    queryFn: () => transactionApi.list(params),
    enabled: enabled && params?.etudiantMatricule !== '__pending__',
  });

export const useTransactionsByIds = (ids: number[], enabled = true) =>
  useQuery({
    queryKey: ['transactions', 'by-ids', ids],
    queryFn: () => transactionApi.listByIds(ids),
    enabled: enabled && ids.length > 0,
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

export const useImportTransactionFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => transactionApi.importFile(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useOrders = () =>
  useQuery({
    queryKey: ['orders'],
    queryFn: orderApi.list,
  });

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, statut, motif }: { code: string; statut: string; motif?: string }) =>
      orderApi.updateStatus(code, { statut, motif }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useCreateOrderCorrection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload?: Record<string, unknown> }) =>
      orderApi.createCorrection(code, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDashboardKpis = (
  dateDebut?: string,
  dateFin?: string,
  antenneId?: number,
  enabled = true,
) =>
  useQuery({
    queryKey: ['dashboard', 'kpis', dateDebut, dateFin, antenneId],
    queryFn: () => analyseApi.getKpis(dateDebut, dateFin, antenneId),
    enabled,
  });

export const useGenerateSynthesis = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filters?: AnalyseFilters) => analyseApi.generateSynthesis(filters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyse'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useValidateSynthesis = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ValidateSynthesisPayload & { lines?: SynthesisLine[] }) =>
      analyseApi.validateSynthesis(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['analyse'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useAnalyseArchives = () =>
  useQuery({
    queryKey: ['analyse', 'archives'],
    queryFn: () => analyseApi.getArchives(),
  });

export const useGroupedByRecette = (params?: OperationQueryParams, enabled = true) =>
  useQuery({
    queryKey: ['dashboard', 'grouped-by-recette', params],
    queryFn: () => transactionApi.getGroupedByRecette(params),
    enabled,
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
    mutationFn: ({ id, payload }: { id: number | string; payload: Record<string, unknown> }) =>
      transactionApi.update(id, payload),
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

export const useBordereaux = (params?: BordereauListParams) =>
  useQuery({
    queryKey: ['compta', 'bordereaux', params],
    queryFn: () => comptaWorkflowApi.listBordereaux(params),
  });

export const useBordereauEcritures = (bordereauId: number | null, enabled = true) =>
  useQuery({
    queryKey: ['compta', 'bordereaux', bordereauId, 'ecritures'],
    queryFn: () => comptaWorkflowApi.listEcritures(Number(bordereauId)),
    enabled: enabled && Number.isInteger(bordereauId) && Number(bordereauId) > 0,
  });

export const useLignesBudgetaires = () =>
  useQuery({
    queryKey: ['compta', 'lignes-budgetaires'],
    queryFn: comptaWorkflowApi.listLignesBudgetaires,
  });

export const useSaveLigneBudgetaire = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LigneBudgetairePayload) => comptaWorkflowApi.saveLigneBudgetaire(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compta', 'lignes-budgetaires'] }),
  });
};

export const useLotsTraitement = (params?: LotTraitementListParams) =>
  useQuery({
    queryKey: ['compta', 'lots', params],
    queryFn: () => comptaWorkflowApi.listLots(params),
  });

export const useCreateLotTraitement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LotTraitementCreatePayload & { ecritureIds?: number[]; remarques?: string }) =>
      comptaWorkflowApi.createLot(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compta', 'lots'] });
      queryClient.invalidateQueries({ queryKey: ['compta', 'bordereaux'] });
      queryClient.invalidateQueries({ queryKey: ['compta', 'ecritures', 'pending'] });
    },
  });
};

export const usePendingEcritures = (params?: {
  antenneId?: number;
  typeRecetteId?: number;
  dateDebut?: string;
  dateFin?: string;
}) =>
  useQuery({
    queryKey: ['compta', 'ecritures', 'pending', params],
    queryFn: () => comptaWorkflowApi.listPendingEcritures(params),
  });

export const useTraiterLot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: LotTraitementProcessPayload }) =>
      comptaWorkflowApi.traiterLot(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compta', 'lots'] });
      queryClient.invalidateQueries({ queryKey: ['compta', 'bordereaux'] });
      queryClient.invalidateQueries({ queryKey: ['compta', 'lignes-budgetaires'] });
    },
  });
};

export const useTransmettreLotBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, utilisateurTransmission }: { id: number; utilisateurTransmission?: string }) =>
      comptaWorkflowApi.transmettreLotBudget(id, utilisateurTransmission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compta', 'lots'] });
      queryClient.invalidateQueries({ queryKey: ['budget', 'ordres-paiement'] });
    },
  });
};

export const useControlesOp = () =>
  useQuery({
    queryKey: ['compta', 'controles-op'],
    queryFn: comptaWorkflowApi.listControlesOp,
  });

export const useOrdresPaiementBudget = (params?: OrdrePaiementListParams) =>
  useQuery({
    queryKey: ['budget', 'ordres-paiement', params],
    queryFn: () => budgetApi.listOrdresPaiement(params),
  });

export const useTransmettreOpCompta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, utilisateurTransmission }: { id: string; utilisateurTransmission?: string }) =>
      budgetApi.transmettreCompta(id, utilisateurTransmission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', 'ordres-paiement'] });
      queryClient.invalidateQueries({ queryKey: ['compta', 'controles-op'] });
    },
  });
};
