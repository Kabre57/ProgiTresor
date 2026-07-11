'use client';

import { PiCloudArrowDownDuotone } from 'react-icons/pi';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useOrdersState } from './hooks/useOrdersState';
import { useOrderActions } from './hooks/useOrderActions';
import { OrdersMetrics } from './components/OrdersMetrics';
import { OrdersFilters } from './components/OrdersFilters';
import { OrdersTable } from './components/OrdersTable';
import { OrdersDialogs } from './components/OrdersDialogs';
import { OrdersPrintTemplate } from './components/OrdersPrintTemplate';

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const { hasAccess } = usePermissions();
  const user = useAuthStore((state) => state.user);
  
  const normalizedRole = user?.role?.code?.toUpperCase()?.replace(/\s+/g, '_') || '';
  const isChefComptableOrDf = normalizedRole === 'CHEF_COMPTABLE' || normalizedRole === 'DF' || normalizedRole === 'ADMIN';
  const canCorrectOp = hasAccess('OT', 4, 'CORRECT') || hasAccess('OT', 4);

  // States, filters, referentials, pagination and selectors
  const state = useOrdersState();

  // Invalidating cache function helper
  const refreshWorkflowQueries = () => {
    state.ordersQuery.refetch();
    queryClient.invalidateQueries({ queryKey: ['compta', 'bordereaux'] });
    queryClient.invalidateQueries({ queryKey: ['compta', 'ecritures', 'pending'] });
    queryClient.invalidateQueries({ queryKey: ['compta', 'lots'] });
  };

  // Actions transitions and transmissions
  const actions = useOrderActions({
    refetchOrders: state.ordersQuery.refetch,
    refreshWorkflowQueries,
    canCorrectOp,
  });

  return (
    <>
      {/* NORMAL BROWSER VIEW (HIDDEN ON PRINT) */}
      <div className="space-y-6 print:hidden">
        <PageHeader
          title="Ordres de traitement"
          description="Filtrage et consultation de la synthèse des flux Hors Budget."
          actions={
            <Button
              variant="default"
              type="button"
              onClick={() => window.print()}
              disabled={state.filteredOrders.length === 0}
              icon={<PiCloudArrowDownDuotone className="text-xl" />}
            >
              Imprimer la synthèse (PDF)
            </Button>
          }
        />

        {actions.message && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{actions.message}</div>}
        {actions.error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{actions.error}</div>}
        {state.isOrdersPayloadInvalid && (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Le format de la réponse des ordres est inattendu. La liste a été sécurisée pour éviter un blocage de l&apos;écran.
          </div>
        )}

        {/* Metrics summary */}
        <OrdersMetrics
          filteredOrdersCount={state.filteredOrders.length}
          totalTransactions={state.totalTransactions}
          totalMontant={state.totalMontant}
        />

        {/* Filters Selectors Card */}
        <OrdersFilters
          antenneSelectOptions={state.antenneSelectOptions}
          niveauSelectOptions={state.niveauSelectOptions}
          typeRecetteSelectOptions={state.typeRecetteSelectOptions}
          periodSelectOptions={state.periodSelectOptions}
          statutSelectOptions={state.statutSelectOptions}
          selectedAntenneId={state.selectedAntenneId}
          setSelectedAntenneId={state.setSelectedAntenneId}
          selectedNiveauId={state.selectedNiveauId}
          setSelectedNiveauId={state.setSelectedNiveauId}
          selectedTypeRecetteId={state.selectedTypeRecetteId}
          setSelectedTypeRecetteId={state.setSelectedTypeRecetteId}
          selectedPeriod={state.selectedPeriod}
          setSelectedPeriod={state.setSelectedPeriod}
          selectedStatut={state.selectedStatut}
          setSelectedStatut={state.setSelectedStatut}
          setPage={state.setPage}
        />

        {/* Orders List Table Card */}
        <OrdersTable
          paginatedOrders={state.paginatedOrders}
          ordersQueryLoading={state.ordersQuery.isLoading}
          antennesQueryLoading={state.antennesQuery.isLoading}
          niveauxQueryLoading={state.niveauxQuery.isLoading}
          typeRecettesQueryLoading={state.typeRecettesQuery.isLoading}
          selectedOtCodes={state.selectedOtCodes}
          setSelectedOtCodes={state.setSelectedOtCodes}
          isTransmissionEligible={state.isTransmissionEligible}
          getAntenneLabel={state.getAntenneLabel}
          getNiveauLabel={state.getNiveauLabel}
          getTypeRecetteLabel={state.getTypeRecetteLabel}
          isChefComptableOrDf={isChefComptableOrDf}
          handleSingleValidateAndTransmit={actions.handleSingleValidateAndTransmit}
          setSelected={actions.setSelected}
          page={state.page}
          filteredOrdersCount={state.filteredOrders.length}
          limit={state.limit}
          setPage={state.setPage}
          setLimit={state.setLimit}
        />

        {/* Dialogs and modals handling */}
        <OrdersDialogs
          selected={actions.selected}
          setSelected={actions.setSelected}
          motif={actions.motif}
          setMotif={actions.setMotif}
          isChefComptableOrDf={isChefComptableOrDf}
          canCorrectOp={canCorrectOp}
          createCorrectionPending={actions.createCorrection.isPending}
          updateStatusPending={actions.updateStatus.isPending}
          submitCorrection={actions.submitCorrection}
          handleStatusChange={actions.handleStatusChange}
          confirmTransmitOpen={actions.confirmTransmitOpen}
          setConfirmTransmitOpen={actions.setConfirmTransmitOpen}
          isTransmitting={actions.isTransmitting}
          handleTransmitBudget={actions.handleTransmitBudget}
          selectedOtCodes={state.selectedOtCodes}
          setSelectedOtCodes={state.setSelectedOtCodes}
          handleBulkValidateAndTransmit={async () => {
            const failed = await actions.handleBulkValidateAndTransmit(state.selectedOtCodes, () => state.setSelectedOtCodes([]));
            if (failed) {
              state.setSelectedOtCodes(failed);
            }
          }}
          isProcessingBulk={actions.isProcessingBulk}
        />
      </div>

      {/* PRINT-ONLY PDF TEMPLATE (HIDDEN ON SCREEN, VISIBLE ONLY IN window.print()) */}
      <OrdersPrintTemplate
        filteredOrders={state.filteredOrders}
        periodDisplayText={state.periodDisplayText}
        getAntenneLabel={state.getAntenneLabel}
        getNiveauLabel={state.getNiveauLabel}
        getTypeRecetteLabel={state.getTypeRecetteLabel}
        totalMontant={state.totalMontant}
        totalTransactions={state.totalTransactions}
      />
    </>
  );
}
