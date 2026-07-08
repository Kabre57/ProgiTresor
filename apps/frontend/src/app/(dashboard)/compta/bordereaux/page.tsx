'use client';

import { useMemo, useState } from 'react';
import { Eye, PackagePlus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import {
  MetricTile,
  WorkflowStatus,
  formatAmount,
  toAmount,
} from '@/components/compta-budget/WorkflowUi';
import { getErrorMessage } from '@/lib/api/client';
import {
  useBordereauEcritures,
  useBordereaux,
  useCreateLotTraitement,
} from '@/lib/hooks/useOperationsQueries';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { formatDate } from '@/lib/utils/format';
import type { Bordereau, EcritureBudgetaire } from '@/types/compta-budget.types';

const statusOptions = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'En attente', value: 'EN_ATTENTE' },
  { label: 'Partiellement traité', value: 'PARTIELLEMENT_TRAITE' },
  { label: 'Traité', value: 'TRAITE' },
  { label: 'Rejeté', value: 'REJETE' },
];

export default function BordereauxPage() {
  const toast = useToast();
  const { hasAccess } = usePermissions();
  const canCreateLot = hasAccess('BUDGET', 2);
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState('all');
  const [selected, setSelected] = useState<Bordereau | null>(null);
  const [lotSource, setLotSource] = useState<Bordereau | null>(null);
  const [lotDates, setLotDates] = useState({ dateDebutFlux: '', dateFinFlux: '' });
  const bordereauxQuery = useBordereaux({
    page,
    limit: 12,
    statut: statut === 'all' ? undefined : statut,
  });
  const ecrituresQuery = useBordereauEcritures(selected?.id ?? null, Boolean(selected));
  const createLot = useCreateLotTraitement();

  const bordereaux = bordereauxQuery.data?.items ?? [];
  const totalMontant = useMemo(
    () => bordereaux.reduce((sum, item) => sum + toAmount(item.montantTotal), 0),
    [bordereaux],
  );
  const totalEcritures = useMemo(
    () => bordereaux.reduce((sum, item) => sum + item.nombreEcritures, 0),
    [bordereaux],
  );

  const submitLot = async () => {
    if (!lotSource) return;
    try {
      await createLot.mutateAsync({
        bordereauId: lotSource.id,
        dateDebutFlux: lotDates.dateDebutFlux || undefined,
        dateFinFlux: lotDates.dateFinFlux || undefined,
      });
      toast.success('Lot de traitement créé.');
      setLotSource(null);
      setLotDates({ dateDebutFlux: '', dateFinFlux: '' });
    } catch (error) {
      toast.error(getErrorMessage(error), 'Création du lot impossible');
    }
  };

  const columns: DataTableColumn<Bordereau>[] = [
    { key: 'reference', header: 'Bordereau', render: (row) => row.reference, sortable: true },
    { key: 'dateReception', header: 'Réception', render: (row) => formatDate(row.dateReception) },
    { key: 'statut', header: 'Statut', render: (row) => <WorkflowStatus status={row.statut} /> },
    { key: 'montantTotal', header: 'Montant', render: (row) => formatAmount(row.montantTotal) },
    { key: 'nombreOt', header: 'OT', render: (row) => row.nombreOt },
    { key: 'nombreEcritures', header: 'Écritures', render: (row) => row.nombreEcritures },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button type="button" size="icon" variant="ghost" onClick={() => setSelected(row)} aria-label="Voir">
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={!canCreateLot || row.statut === 'TRAITE'}
            onClick={() => setLotSource(row)}
            aria-label="Créer un lot"
          >
            <PackagePlus className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const ecritureColumns: DataTableColumn<EcritureBudgetaire>[] = [
    { key: 'codeOt', header: 'Code OT', render: (row) => row.codeOt },
    { key: 'dateFlux', header: 'Date flux', render: (row) => formatDate(row.dateFlux) },
    { key: 'produitLibelleBrut', header: 'Produit', render: (row) => row.produitLibelleBrut },
    { key: 'typeRecetteLibelle', header: 'Recette', render: (row) => row.typeRecetteLibelle ?? '-' },
    { key: 'montant', header: 'Montant', render: (row) => formatAmount(row.montant) },
    { key: 'statut', header: 'Statut', render: (row) => <WorkflowStatus status={row.statut} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bordereaux Compta"
        description="Lots d’OT hors budget reçus pour filtrage, synthèse et traitement budgétaire."
        actions={
          <Button
            type="button"
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => bordereauxQuery.refetch()}
          >
            Actualiser
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Bordereaux visibles" value={bordereaux.length} />
        <MetricTile label="Écritures" value={totalEcritures} />
        <MetricTile label="Montant visible" value={formatAmount(totalMontant)} />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex max-w-xs flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="bordereau-statut">
              Statut
            </label>
            <select
              id="bordereau-statut"
              value={statut}
              onChange={(event) => {
                setPage(1);
                setStatut(event.target.value);
              }}
              className="input input-md h-11"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <DataTable<Bordereau>
            data={bordereaux}
            columns={columns}
            loading={bordereauxQuery.isLoading || bordereauxQuery.isFetching}
            getRowKey={(row) => row.id}
            emptyLabel="Aucun bordereau reçu."
            pagination={{
              currentPage: page,
              totalCount: bordereauxQuery.data?.total ?? 0,
              pageSize: bordereauxQuery.data?.limit ?? 12,
              onPageChange: setPage,
            }}
          />
        </CardContent>
      </Card>

      <Dialog isOpen={Boolean(selected)} onClose={() => setSelected(null)} width={980}>
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-950 dark:text-white">
              Détail du bordereau {selected?.reference}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Écritures reçues depuis les OT transmis.
            </p>
          </div>
          <DataTable<EcritureBudgetaire>
            data={ecrituresQuery.data ?? []}
            columns={ecritureColumns}
            loading={ecrituresQuery.isLoading}
            getRowKey={(row) => row.id}
            emptyLabel="Aucune écriture disponible."
          />
        </div>
      </Dialog>

      <Dialog isOpen={Boolean(lotSource)} onClose={() => setLotSource(null)} width={520}>
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-950 dark:text-white">Créer un lot de traitement</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Les dates sont optionnelles. Sans filtre, toutes les écritures en attente du bordereau seront reprises.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              type="date"
              value={lotDates.dateDebutFlux}
              onChange={(event) => setLotDates((current) => ({ ...current, dateDebutFlux: event.target.value }))}
            />
            <Input
              type="date"
              value={lotDates.dateFinFlux}
              onChange={(event) => setLotDates((current) => ({ ...current, dateFinFlux: event.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setLotSource(null)}>
              Annuler
            </Button>
            <Button type="button" variant="primary" loading={createLot.isPending} onClick={submitLot}>
              Créer le lot
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
