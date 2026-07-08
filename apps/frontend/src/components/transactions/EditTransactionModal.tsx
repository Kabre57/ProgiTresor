import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Save } from 'lucide-react';
import { useUpdateTransaction } from '@/lib/hooks/useOperationsQueries';
import { useEtudiants, useReferential } from '@/lib/hooks/useEtudiantQueries';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';

interface EditTransactionModalProps {
  open: boolean;
  onClose: () => void;
  transaction: any | null;
}

export function EditTransactionModal({ open, onClose, transaction }: EditTransactionModalProps) {
  const toast = useToast();
  const updateMutation = useUpdateTransaction();

  // Queries
  const etudiantListQuery = useEtudiants();
  const antennesQuery = useReferential('antennes');
  const typesFluxQuery = useReferential('types-flux');
  const nomenclaturesQuery = useReferential('nomenclatures');

  const [editForm, setEditForm] = useState({
    refTresor: '',
    montant: 0,
    etudiantId: undefined as number | undefined,
    antenneId: undefined as number | undefined,
    nomenclatureId: undefined as number | undefined,
    typeFluxId: undefined as number | undefined,
    nomPayeurBrut: '',
    contactPayeur: '',
    libelleProduitBrut: '',
    statutTraitement: 'IMPORTE',
    gele: false,
    dateHeure: '',
  });

  useEffect(() => {
    if (transaction) {
      let formattedDate = '';
      if (transaction.dateHeure) {
        const d = new Date(transaction.dateHeure);
        formattedDate = d.toISOString().slice(0, 16);
      }

      setEditForm({
        refTresor: transaction.refTresor ?? '',
        montant: Number(transaction.montant ?? 0),
        etudiantId: transaction.etudiantId || undefined,
        antenneId: transaction.antenneId || undefined,
        nomenclatureId: transaction.nomenclatureId || undefined,
        typeFluxId: transaction.typeFluxId || undefined,
        nomPayeurBrut: transaction.nomPayeurBrut ?? '',
        contactPayeur: transaction.contactPayeur ?? '',
        libelleProduitBrut: transaction.libelleProduitBrut ?? '',
        statutTraitement: transaction.statutTraitement ?? 'IMPORTE',
        gele: transaction.gele ?? false,
        dateHeure: formattedDate,
      });
    }
  }, [transaction]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    try {
      const payload = {
        ...editForm,
        dateHeure: editForm.dateHeure ? new Date(editForm.dateHeure).toISOString() : undefined,
      };
      await updateMutation.mutateAsync({ id: Number(transaction.id), payload });
      toast.success('Transaction mise à jour avec succès.');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err), "Échec de la mise à jour");
    }
  };

  const etudiantOptions = (etudiantListQuery.data ?? []).map((s: any) => ({
    value: String(s.id),
    label: `${s.matricule} - ${s.nom} ${s.prenom}`,
  }));

  const antenneOptions = (antennesQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.nom,
  }));

  const nomenclatureOptions = (nomenclaturesQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.libelleStandard || item.libelleBrut,
  }));

  const typeFluxOptions = (typesFluxQuery.data ?? []).map((item: any) => ({
    value: String(item.id),
    label: item.libelle || item.code,
  }));

  return (
    <Modal open={open} onClose={onClose} title="Modifier la transaction" width={650}>
      <form onSubmit={handleSaveEdit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Référence Trésor"
            required
            value={editForm.refTresor}
            onChange={(e) => setEditForm(f => ({ ...f, refTresor: e.target.value }))}
          />
          <Input
            type="number"
            label="Montant (F CFA)"
            required
            value={editForm.montant}
            onChange={(e) => setEditForm(f => ({ ...f, montant: Number(e.target.value) }))}
          />
          <Input
            type="datetime-local"
            label="Date / Heure"
            required
            value={editForm.dateHeure}
            onChange={(e) => setEditForm(f => ({ ...f, dateHeure: e.target.value }))}
          />
          <Select
            label="Étudiant"
            placeholder="Aucun étudiant"
            options={etudiantOptions}
            value={editForm.etudiantId !== undefined ? String(editForm.etudiantId) : ''}
            onChange={(e) => setEditForm(f => ({ ...f, etudiantId: e.target.value ? Number(e.target.value) : undefined }))}
            searchable
          />
          <Select
            label="Antenne"
            placeholder="Aucune antenne"
            options={antenneOptions}
            value={editForm.antenneId !== undefined ? String(editForm.antenneId) : ''}
            onChange={(e) => setEditForm(f => ({ ...f, antenneId: e.target.value ? Number(e.target.value) : undefined }))}
            searchable
          />
          <Select
            label="Nomenclature"
            placeholder="Aucune nomenclature"
            options={nomenclatureOptions}
            value={editForm.nomenclatureId !== undefined ? String(editForm.nomenclatureId) : ''}
            onChange={(e) => setEditForm(f => ({ ...f, nomenclatureId: e.target.value ? Number(e.target.value) : undefined }))}
            searchable
          />
          <Select
            label="Type de flux"
            placeholder="Aucun flux"
            options={typeFluxOptions}
            value={editForm.typeFluxId !== undefined ? String(editForm.typeFluxId) : ''}
            onChange={(e) => setEditForm(f => ({ ...f, typeFluxId: e.target.value ? Number(e.target.value) : undefined }))}
          />
          <Input
            label="Payeur"
            value={editForm.nomPayeurBrut}
            onChange={(e) => setEditForm(f => ({ ...f, nomPayeurBrut: e.target.value }))}
          />
          <Input
            label="Contact payeur"
            value={editForm.contactPayeur}
            onChange={(e) => setEditForm(f => ({ ...f, contactPayeur: e.target.value }))}
          />
          <div className="md:col-span-2">
            <Input
              label="Libellé Produit"
              value={editForm.libelleProduitBrut}
              onChange={(e) => setEditForm(f => ({ ...f, libelleProduitBrut: e.target.value }))}
            />
          </div>
          <Select
            label="Statut Traitement"
            options={[
              { value: 'NON_CLASSIFIE', label: 'NON_CLASSIFIE' },
              { value: 'IMPORTE', label: 'IMPORTE' },
              { value: 'AFFECTE', label: 'AFFECTE' }
            ]}
            value={editForm.statutTraitement}
            onChange={(e) => setEditForm(f => ({ ...f, statutTraitement: e.target.value || 'IMPORTE' }))}
          />
          <div className="flex items-center pt-8 pl-2">
            <label className="flex items-center space-x-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                className="rounded text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4 border-slate-300 dark:border-slate-700 bg-transparent"
                checked={editForm.gele}
                onChange={(e) => setEditForm(f => ({ ...f, gele: e.target.checked }))}
              />
              <span>Transaction gelée</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={updateMutation.isPending}>
            Annuler
          </Button>
          <Button type="submit" loading={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-1.5" />
            Enregistrer les modifications
          </Button>
        </div>
      </form>
    </Modal>
  );
}
