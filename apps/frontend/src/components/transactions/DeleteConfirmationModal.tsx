import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Trash2 } from 'lucide-react';
import { useDeleteTransaction } from '@/lib/hooks/useOperationsQueries';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';

interface DeleteConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  transactionId: string | null;
}

export function DeleteConfirmationModal({ open, onClose, transactionId }: DeleteConfirmationModalProps) {
  const deleteMutation = useDeleteTransaction();
  const toast = useToast();

  const handleConfirmDelete = async () => {
    if (!transactionId) return;
    try {
      await deleteMutation.mutateAsync(Number(transactionId));
      toast.success('Transaction supprimée avec succès.');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err), 'Échec de la suppression');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Supprimer la transaction" width={450}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Êtes-vous sûr de vouloir supprimer définitivement cette transaction ? Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={deleteMutation.isPending}>
            Annuler
          </Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={handleConfirmDelete}>
            <Trash2 className="h-4 w-4 mr-1.5" />
            Confirmer la suppression
          </Button>
        </div>
      </div>
    </Modal>
  );
}
