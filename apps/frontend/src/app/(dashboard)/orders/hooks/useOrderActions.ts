import { useState } from 'react';
import { useCreateOrderCorrection, useUpdateOrderStatus } from '@/lib/hooks/useOperationsQueries';
import { orderApi } from '@/lib/api/orderApi';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import type { PaymentOrder } from '@/types/order.types';

type UseOrderActionsProps = {
  refetchOrders: () => void;
  refreshWorkflowQueries: () => void;
  canCorrectOp: boolean;
};

export function useOrderActions({ refetchOrders, refreshWorkflowQueries, canCorrectOp }: UseOrderActionsProps) {
  const toast = useToast();
  const updateStatus = useUpdateOrderStatus();
  const createCorrection = useCreateOrderCorrection();

  const [selected, setSelected] = useState<PaymentOrder | null>(null);
  const [motif, setMotif] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [confirmTransmitOpen, setConfirmTransmitOpen] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const handleStatusChange = async (targetStatus: string) => {
    const code = selected?.codeOt ?? selected?.code;
    if (!code) return;
    setError(null);
    setMessage(null);
    try {
      await updateStatus.mutateAsync({ code, statut: targetStatus, motif: motif || undefined });
      setSelected(null);
      setMotif('');
      setMessage('Statut mis à jour avec succès.');
      refetchOrders();
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    }
  };

  const handleTransmitBudget = async () => {
    const code = selected?.codeOt ?? selected?.code;
    if (!code) return;
    setIsTransmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await orderApi.transmettreBudget(code);
      setMessage(result.message);
      toast.success(result.message);
      setConfirmTransmitOpen(false);
      setSelected(null);
      refreshWorkflowQueries();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsTransmitting(false);
    }
  };

  const submitCorrection = async () => {
    const code = selected?.codeOt ?? selected?.code;
    if (!code || !canCorrectOp) return;
    setError(null);
    setMessage(null);
    try {
      const corrected = await createCorrection.mutateAsync({ code });
      setSelected(corrected);
      setMessage('Nouvelle version d’OT créée.');
    } catch (correctionError) {
      setError(getErrorMessage(correctionError));
    }
  };

  const handleSingleValidateAndTransmit = async (code: string, clearFromBulkSelection?: (code: string) => void) => {
    setError(null);
    setMessage(null);
    try {
      const results = await orderApi.validateAndTransmit([code]);
      const targetResult = results[0];
      if (targetResult && targetResult.success) {
        const msg = targetResult.message || `L'ordre de traitement ${code} a été transmis vers Compta/Budget avec succès.`;
        setMessage(msg);
        toast.success(msg);
        
        if (clearFromBulkSelection) {
          clearFromBulkSelection(code);
        }
        
        refreshWorkflowQueries();
      } else {
        const errMsg = targetResult?.message || "Une erreur est survenue.";
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      const errMsg = getErrorMessage(err);
      setError(errMsg);
      toast.error(errMsg);
    }
  };

  const handleBulkValidateAndTransmit = async (selectedOtCodes: string[], clearBulkSelection: () => void) => {
    if (selectedOtCodes.length === 0) return;

    setIsProcessingBulk(true);
    setError(null);
    setMessage(null);
    try {
      const results = await orderApi.validateAndTransmit(selectedOtCodes);
      
      const failed = results.filter((result: any) => !result.success);
      const succeeded = results.filter((result: any) => result.success);

      if (failed.length === 0) {
        const msg = `${succeeded.length} Ordre(s) de traitement transmis vers Compta/Budget avec succès.`;
        setMessage(msg);
        toast.success(msg);
        clearBulkSelection();
        refreshWorkflowQueries();
      } else {
        const errMsg = `Traitement partiel : ${succeeded.length} succès, ${failed.length} échecs.`;
        setError(errMsg);
        toast.error(errMsg);
        refreshWorkflowQueries();
        return failed.map((result: any) => result.code);
      }
    } catch (err) {
      const errMsg = getErrorMessage(err);
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  return {
    selected,
    setSelected,
    motif,
    setMotif,
    error,
    setError,
    message,
    setMessage,
    confirmTransmitOpen,
    setConfirmTransmitOpen,
    isTransmitting,
    isProcessingBulk,
    handleStatusChange,
    handleTransmitBudget,
    submitCorrection,
    handleSingleValidateAndTransmit,
    handleBulkValidateAndTransmit,
    updateStatus,
    createCorrection,
  };
}
