'use client';

import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { 
  useReferential, 
  useCreateReferential, 
  useUpdateReferential 
} from '@/lib/hooks/useEtudiantQueries';
import { getErrorMessage } from '@/lib/api/client';
import type { NomenclatureProduit } from '@/types/etudiant.types';

type NomenclatureModalProps = {
  open: boolean;
  onClose: () => void;
  editing: NomenclatureProduit | null;
  onSuccess: () => void;
};

export default function NomenclatureModal({ open, onClose, editing, onSuccess }: NomenclatureModalProps) {
  const toast = useToast();

  // Queries
  const typeRecettesQuery = useReferential('types-recettes');

  // Mutations
  const createMutation = useCreateReferential('nomenclatures');
  const updateMutation = useUpdateReferential('nomenclatures');

  // Form State
  const [libelle, setLibelle] = useState('');
  const [typeRecetteId, setTypeRecetteId] = useState('');
  const [montant, setMontant] = useState('');
  const [regexPattern, setRegexPattern] = useState('');
  const [actif, setActif] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronize when editing changes or modal opens
  useEffect(() => {
    if (editing) {
      setLibelle(editing.libelle);
      setTypeRecetteId(String(editing.typeRecetteId ?? ''));
      setMontant(String(editing.montant ?? ''));
      setRegexPattern(editing.regexPattern ?? '');
      setActif(editing.actif ?? true);
    } else {
      setLibelle('');
      setTypeRecetteId('');
      setMontant('');
      setRegexPattern('');
      setActif(true);
    }
    setError(null);
  }, [editing, open]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const getSlug = (source: string) => {
      return source
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .toUpperCase();
    };

    try {
      const payload = {
        libelle: libelle.trim(),
        codeProduit: editing?.codeProduit || getSlug(libelle),
        typeRecetteId: Number(typeRecetteId),
        montant: Number(montant),
        regexPattern: regexPattern.trim() || null,
        actif,
      };

      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        toast.success('Nomenclature modifiée avec succès');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Nomenclature créée avec succès');
      }

      onSuccess();
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <Modal 
      open={open} 
      title={editing ? "Modifier la nomenclature" : "Ajouter une nomenclature"} 
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2 max-h-[60vh] overflow-y-auto pr-2 py-1">
          <div className="sm:col-span-2">
            <Input
              label="Libellé"
              value={libelle}
              required
              onChange={(e) => setLibelle(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <Select
              label="Type recette"
              placeholder="Sélectionner"
              options={(typeRecettesQuery.data ?? []).map((item) => ({
                label: `${item.code} - ${item.libelle}`,
                value: item.id,
              }))}
              value={typeRecetteId}
              required
              searchable
              onChange={(e) => setTypeRecetteId(e.target.value)}
            />
          </div>



          <div className="flex flex-col">
            <Input
              label="Montant annuel (FCFA)"
              type="number"
              value={montant}
              required
              onChange={(e) => setMontant(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <Input
              label="Regex de reconnaissance"
              value={regexPattern}
              onChange={(e) => setRegexPattern(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:col-span-2">
            <label className="flex items-center gap-2 pt-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--border)]"
                checked={actif}
                onChange={(e) => setActif(e.target.checked)}
              />
              Actif
            </label>
          </div>
        </div>

        {error && (
          <div className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 mt-4">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4 mt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
