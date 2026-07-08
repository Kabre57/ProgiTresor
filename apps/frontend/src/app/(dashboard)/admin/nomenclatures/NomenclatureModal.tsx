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
  const filieresQuery = useReferential('filieres');
  const niveauxQuery = useReferential('niveaux');
  const statutsQuery = useReferential('statuts-etudiants');

  // Mutations
  const createMutation = useCreateReferential('nomenclatures');
  const updateMutation = useUpdateReferential('nomenclatures');

  // Form State
  const [libelleBrut, setLibelleBrut] = useState('');
  const [libelleStandard, setLibelleStandard] = useState('');
  const [typeRecetteId, setTypeRecetteId] = useState('');
  const [selectedFiliereId, setSelectedFiliereId] = useState('');
  const [niveauId, setNiveauId] = useState('');
  const [statutId, setStatutId] = useState('');
  const [montant, setMontant] = useState('');
  const [regexPattern, setRegexPattern] = useState('');
  const [numVersement, setNumVersement] = useState('');
  const [actif, setActif] = useState(true);
  
  // Multi-status creation
  const [differentiateByStatut, setDifferentiateByStatut] = useState(false);
  const [statutMontants, setStatutMontants] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Filter levels based on selected filiere
  const filteredNiveaux = useMemo(() => {
    if (!selectedFiliereId) return [];
    return (niveauxQuery.data ?? []).filter(
      (n) => n.filiereId === Number(selectedFiliereId)
    );
  }, [selectedFiliereId, niveauxQuery.data]);

  // Synchronize when editing changes or modal opens
  useEffect(() => {
    if (editing) {
      setLibelleBrut(editing.libelleBrut);
      setLibelleStandard(editing.libelleStandard);
      setTypeRecetteId(String(editing.typeRecetteId ?? ''));
      const level = (niveauxQuery.data ?? []).find((n) => n.id === editing.niveauId);
      if (level?.filiereId) {
        setSelectedFiliereId(String(level.filiereId));
      } else {
        setSelectedFiliereId('');
      }
      setNiveauId(String(editing.niveauId ?? ''));
      setStatutId(String(editing.statutId ?? ''));
      setMontant(String(editing.montant ?? ''));
      setRegexPattern(editing.regexPattern ?? '');
      setNumVersement(editing.numVersement !== null && editing.numVersement !== undefined ? String(editing.numVersement) : '');
      setActif(editing.actif ?? true);
      setDifferentiateByStatut(false);
    } else {
      setLibelleBrut('');
      setLibelleStandard('');
      setTypeRecetteId('');
      setSelectedFiliereId('');
      setNiveauId('');
      setStatutId('');
      setMontant('');
      setRegexPattern('');
      setNumVersement('');
      setActif(true);
      setDifferentiateByStatut(false);
      setStatutMontants({});
    }
    setError(null);
  }, [editing, open, niveauxQuery.data]);

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
      if (differentiateByStatut && !editing) {
        const activeStatuts = (statutsQuery.data ?? []);
        const promises = activeStatuts.map((statut) => {
          const amt = statutMontants[statut.id];
          if (!amt || Number(amt) <= 0) return null;

          const suffix = statut.libelle.split(' - ').pop() || '';
          const payload = {
            libelleBrut: `${libelleBrut} ${suffix}`.toUpperCase(),
            libelleStandard,
            codeProduit: `${libelleStandard || libelleBrut}`.normalize('NFD').replace(/\s+/g, '-').toUpperCase() + `-${statut.id}`,
            typeRecetteId: Number(typeRecetteId),
            niveauId: niveauId ? Number(niveauId) : null,
            statutId: statut.id,
            montant: Number(amt),
            regexPattern,
            numVersement: numVersement ? Number(numVersement) : null,
            actif,
          };
          return createMutation.mutateAsync(payload);
        }).filter(Boolean);

        if (promises.length === 0) {
          setError('Veuillez saisir un montant pour au moins un statut.');
          return;
        }

        await Promise.all(promises);
        toast.success('Nomenclatures créées avec succès');
        onSuccess();
        onClose();
      } else {
        const payload = {
          libelleBrut: libelleBrut.trim(),
          libelleStandard: libelleStandard.trim(),
          codeProduit: editing?.codeProduit || getSlug(libelleStandard || libelleBrut),
          typeRecetteId: Number(typeRecetteId),
          niveauId: niveauId ? Number(niveauId) : null,
          statutId: statutId ? Number(statutId) : null,
          montant: Number(montant),
          regexPattern: regexPattern.trim() || null,
          numVersement: numVersement ? Number(numVersement) : null,
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
      }
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
              label="Libellé brut"
              value={libelleBrut}
              required
              onChange={(e) => setLibelleBrut(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              label="Libellé standard"
              value={libelleStandard}
              required
              onChange={(e) => setLibelleStandard(e.target.value)}
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
            <Select
              label="Filière"
              placeholder="Sélectionner"
              options={(filieresQuery.data ?? []).map((item) => ({
                label: `${item.code} - ${item.libelle}`,
                value: item.id,
              }))}
              value={selectedFiliereId}
              searchable
              onChange={(e) => {
                setSelectedFiliereId(e.target.value);
                setNiveauId('');
              }}
            />
          </div>

          <div className="flex flex-col">
            <Select
              label="Niveau"
              placeholder={selectedFiliereId ? "Sélectionner" : "Sélectionnez d'abord une filière"}
              options={filteredNiveaux.map((item) => ({
                label: `${item.code} - ${item.libelle}`,
                value: item.id,
              }))}
              value={niveauId}
              isDisabled={!selectedFiliereId}
              searchable
              onChange={(e) => setNiveauId(e.target.value)}
            />
          </div>

          {editing ? (
            <>
              <div className="flex flex-col">
                <Select
                  label="Statut"
                  placeholder="Tous"
                  options={(statutsQuery.data ?? []).map((item) => ({
                    label: `${item.code} - ${item.libelle}`,
                    value: item.id,
                  }))}
                  value={statutId}
                  searchable
                  onChange={(e) => setStatutId(e.target.value)}
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
            </>
          ) : (
            <div className="sm:col-span-2 grid gap-4">
              <label className="flex items-center gap-2 pt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--border)]"
                  checked={differentiateByStatut}
                  onChange={(e) => setDifferentiateByStatut(e.target.checked)}
                />
                Définir des montants différents par statut (National / Non-National)
              </label>

              {differentiateByStatut ? (
                <div className="border-t pt-4 grid gap-4 sm:grid-cols-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 sm:col-span-2">
                    Montants par statut de l'étudiant
                  </h4>
                  {(statutsQuery.data ?? []).map((item) => (
                    <Input
                      key={item.id}
                      label={`Montant pour ${item.libelle}`}
                      type="number"
                      value={statutMontants[item.id] || ''}
                      onChange={(e) =>
                        setStatutMontants((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Statut"
                    placeholder="Tous"
                    options={(statutsQuery.data ?? []).map((item) => ({
                      label: `${item.code} - ${item.libelle}`,
                      value: item.id,
                    }))}
                    value={statutId}
                    searchable
                    onChange={(e) => setStatutId(e.target.value)}
                  />
                  <Input
                    label="Montant annuel (FCFA)"
                    type="number"
                    value={montant}
                    required
                    onChange={(e) => setMontant(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col">
            <Input
              label="Regex de reconnaissance"
              value={regexPattern}
              onChange={(e) => setRegexPattern(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <Input
              label="N° versement"
              type="number"
              value={numVersement}
              onChange={(e) => setNumVersement(e.target.value)}
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
