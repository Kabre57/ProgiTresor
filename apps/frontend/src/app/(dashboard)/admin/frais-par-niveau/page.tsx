'use client';

import { useMemo, useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { 
  useReferential, 
  useCreateReferential, 
  useUpdateReferential, 
  useDeleteReferential 
} from '@/lib/hooks/useEtudiantQueries';
import { formatCurrency } from '@/lib/utils/format';
import { Check, X, Save, Edit3 } from 'lucide-react';
import type { 
  NomenclatureProduit, 
  ConfigurationFraisNiveau,
  Niveau,
  StatutEtudiant
} from '@/types/etudiant.types';

type RowState = {
  estObligatoire: boolean;
  montantSpecifique: string;
  dateDebutValidite: string;
  dateFinValidite: string;
  isModified: boolean;
  isPending: boolean;
};

export default function FraisParNiveauPage() {
  const toast = useToast();

  // Selected profile state
  const [selectedNiveauId, setSelectedNiveauId] = useState('');
  const [selectedStatutId, setSelectedStatutId] = useState('');

  // Fetch standard referentials
  const niveauxQuery = useReferential('niveaux');
  const statutsQuery = useReferential('statuts-etudiants');
  const nomenclaturesQuery = useReferential('nomenclatures');

  // Fetch current configurations
  const configsQuery = useReferential('configuration-frais-niveau');

  // Mutations
  const createMutation = useCreateReferential('configuration-frais-niveau');
  const updateMutation = useUpdateReferential('configuration-frais-niveau');
  const deleteMutation = useDeleteReferential('configuration-frais-niveau');

  // State to track current edits per nomenclature row
  const [rowsState, setRowsState] = useState<Record<number, RowState>>({});

  // Filter configurations applicable for the selected profile
  const activeConfigs = useMemo(() => {
    if (!selectedNiveauId || !selectedStatutId) return [];
    return (configsQuery.data ?? []).filter(
      (c) => c.niveauId === Number(selectedNiveauId) && c.statutEtudiantId === Number(selectedStatutId)
    );
  }, [configsQuery.data, selectedNiveauId, selectedStatutId]);

  // Sync database configurations with local row edits state
  useEffect(() => {
    if (!selectedNiveauId || !selectedStatutId || !nomenclaturesQuery.data) return;

    const newState: Record<number, RowState> = {};
    (nomenclaturesQuery.data ?? []).forEach((nom) => {
      const config = activeConfigs.find((c) => c.nomenclatureProduitId === nom.id);
      
      const formatIsoDateOnly = (dateStr?: string | null) => {
        if (!dateStr) return '';
        try {
          return new Date(dateStr).toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      newState[nom.id] = {
        estObligatoire: config ? config.estObligatoire : false,
        montantSpecifique: config?.montantSpecifique !== null && config?.montantSpecifique !== undefined ? String(config.montantSpecifique) : '',
        dateDebutValidite: config ? formatIsoDateOnly(config.dateDebutValidite) : new Date().toISOString().split('T')[0],
        dateFinValidite: config ? formatIsoDateOnly(config.dateFinValidite) : '',
        isModified: false,
        isPending: false,
      };
    });
    setRowsState(newState);
  }, [selectedNiveauId, selectedStatutId, nomenclaturesQuery.data, activeConfigs]);

  const handleRowChange = (nomId: number, fields: Partial<RowState>) => {
    setRowsState((prev) => {
      const current = prev[nomId];
      if (!current) return prev;
      const updated = { ...current, ...fields };
      
      // Determine if there is actual modification from the DB config
      const dbConfig = activeConfigs.find((c) => c.nomenclatureProduitId === nomId);
      const dbEstObligatoire = dbConfig ? dbConfig.estObligatoire : false;
      const dbMontantSpecifique = dbConfig?.montantSpecifique !== null && dbConfig?.montantSpecifique !== undefined ? String(dbConfig.montantSpecifique) : '';
      const formatIsoDateOnly = (dateStr?: string | null) => {
        if (!dateStr) return '';
        try { return new Date(dateStr).toISOString().split('T')[0]; } catch { return ''; }
      };
      const dbDateDebut = dbConfig ? formatIsoDateOnly(dbConfig.dateDebutValidite) : new Date().toISOString().split('T')[0];
      const dbDateFin = dbConfig ? formatIsoDateOnly(dbConfig.dateFinValidite) : '';

      const isModified = 
        updated.estObligatoire !== dbEstObligatoire ||
        updated.montantSpecifique !== dbMontantSpecifique ||
        updated.dateDebutValidite !== dbDateDebut ||
        updated.dateFinValidite !== dbDateFin;

      return {
        ...prev,
        [nomId]: { ...updated, isModified },
      };
    });
  };

  const handleSaveRow = async (nom: NomenclatureProduit) => {
    const state = rowsState[nom.id];
    if (!state) return;

    setRowsState((prev) => ({
      ...prev,
      [nom.id]: { ...prev[nom.id], isPending: true },
    }));

    try {
      const dbConfig = activeConfigs.find((c) => c.nomenclatureProduitId === nom.id);
      
      // If unchecked and config exists in db, delete it
      if (!state.estObligatoire) {
        if (dbConfig) {
          await deleteMutation.mutateAsync(dbConfig.id);
          toast.success(`Frais retiré pour "${nom.libelleStandard}"`);
        }
      } else {
        const payload = {
          nomenclatureProduitId: nom.id,
          niveauId: Number(selectedNiveauId),
          statutEtudiantId: Number(selectedStatutId),
          montantSpecifique: state.montantSpecifique.trim() ? Number(state.montantSpecifique) : null,
          estObligatoire: true,
          dateDebutValidite: state.dateDebutValidite ? new Date(state.dateDebutValidite).toISOString() : new Date().toISOString(),
          dateFinValidite: state.dateFinValidite ? new Date(state.dateFinValidite).toISOString() : null,
        };

        if (dbConfig) {
          await updateMutation.mutateAsync({ id: dbConfig.id, payload });
          toast.success(`Configuration mise à jour pour "${nom.libelleStandard}"`);
        } else {
          await createMutation.mutateAsync(payload);
          toast.success(`Frais configuré comme obligatoire pour "${nom.libelleStandard}"`);
        }
      }
      configsQuery.refetch();
    } catch (err: any) {
      toast.error(err?.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setRowsState((prev) => ({
        ...prev,
        [nom.id]: { ...prev[nom.id], isPending: false },
      }));
    }
  };

  const columns: DataTableColumn<NomenclatureProduit>[] = [
    { 
      key: 'obligatoire', 
      header: 'Obligatoire', 
      render: (row) => {
        const state = rowsState[row.id] || { estObligatoire: false, isPending: false };
        return (
          <div className="flex justify-center">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={state.estObligatoire}
              disabled={state.isPending}
              onChange={(e) => handleRowChange(row.id, { estObligatoire: e.target.checked })}
            />
          </div>
        );
      }
    },
    { 
      key: 'nomenclature', 
      header: 'Nomenclature', 
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">{row.libelleStandard}</div>
          <div className="text-xs text-slate-400">{row.libelleBrut}</div>
        </div>
      ) 
    },
    { 
      key: 'montantDefaut', 
      header: 'Tarif par défaut', 
      render: (row) => formatCurrency(row.montant) 
    },
    {
      key: 'montantSpecifique',
      header: 'Surcharge Tarif (FCFA)',
      render: (row) => {
        const state = rowsState[row.id] || { estObligatoire: false, montantSpecifique: '', isPending: false };
        return (
          <Input
            type="number"
            className="w-32 py-1 text-sm"
            placeholder={formatCurrency(row.montant)}
            value={state.montantSpecifique}
            disabled={!state.estObligatoire || state.isPending}
            onChange={(e) => handleRowChange(row.id, { montantSpecifique: e.target.value })}
          />
        );
      }
    },
    {
      key: 'debutValidite',
      header: 'Début validité',
      render: (row) => {
        const state = rowsState[row.id] || { estObligatoire: false, dateDebutValidite: '', isPending: false };
        return (
          <Input
            type="date"
            className="w-40 py-1 text-sm"
            value={state.dateDebutValidite}
            disabled={!state.estObligatoire || state.isPending}
            onChange={(e) => handleRowChange(row.id, { dateDebutValidite: e.target.value })}
          />
        );
      }
    },
    {
      key: 'finValidite',
      header: 'Fin validité',
      render: (row) => {
        const state = rowsState[row.id] || { estObligatoire: false, dateFinValidite: '', isPending: false };
        return (
          <Input
            type="date"
            className="w-40 py-1 text-sm"
            value={state.dateFinValidite}
            disabled={!state.estObligatoire || state.isPending}
            onChange={(e) => handleRowChange(row.id, { dateFinValidite: e.target.value })}
          />
        );
      }
    },
    {
      key: 'actions',
      header: '',
      render: (row) => {
        const state = rowsState[row.id] || { isModified: false, isPending: false };
        return (
          <Button
            size="sm"
            variant="solid"
            type="button"
            disabled={!state.isModified}
            loading={state.isPending}
            onClick={() => handleSaveRow(row)}
            icon={<Save className="h-4 w-4" />}
          >
            Enregistrer
          </Button>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuration des Frais par Niveau"
        description="Associez des nomenclatures de produits à des niveaux et statuts d'étudiants pour rendre le quitus financier dynamique."
      />

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
        <Select
          label="Niveau d'étude"
          placeholder="Sélectionner un niveau"
          options={(niveauxQuery.data ?? []).map((n) => ({
            label: `${n.code} - ${n.libelle} (${n.filiere?.code ?? '-'})`,
            value: n.id,
          }))}
          value={selectedNiveauId}
          searchable
          onChange={(e) => setSelectedNiveauId(e.target.value)}
        />
        <Select
          label="Statut de l'étudiant"
          placeholder="Sélectionner un statut"
          options={(statutsQuery.data ?? []).map((s) => ({
            label: `${s.code} - ${s.libelle}`,
            value: s.id,
          }))}
          value={selectedStatutId}
          searchable
          onChange={(e) => setSelectedStatutId(e.target.value)}
        />
      </div>

      {!selectedNiveauId || !selectedStatutId ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
          <Edit3 className="h-10 w-10 text-slate-400" />
          <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">Sélection requise</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">
            Veuillez sélectionner un niveau d'étude et un statut d'étudiant ci-dessus pour configurer leurs frais de scolarité obligatoires.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Liste des frais de scolarité obligatoires
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Cochez les frais requis. Modifiez le montant si celui par défaut de la nomenclature doit être surchargé.
            </p>
          </div>
          <div className="p-4">
            <DataTable<NomenclatureProduit>
              data={nomenclaturesQuery.data ?? []}
              loading={nomenclaturesQuery.isLoading || configsQuery.isLoading}
              getRowKey={(row) => row.id}
              columns={columns}
            />
          </div>
        </div>
      )}
    </div>
  );
}
