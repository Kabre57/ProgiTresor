'use client';

import { useMemo, useState } from 'react';
import { Eye, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Dialog } from '@/components/ui/Dialog';
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
  useOrdresPaiementBudget,
  useTransmettreOpCompta,
} from '@/lib/hooks/useOperationsQueries';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { formatDate } from '@/lib/utils/format';
import type { OpStatut, OrdrePaiement, OrdrePaiementLigne } from '@/types/compta-budget.types';

const statusOptions: { label: string; value: 'all' | OpStatut }[] = [
  { label: 'Tous les statuts', value: 'all' },
  { label: 'Brouillon', value: 'BROUILLON' },
  { label: 'Transmis Compta', value: 'TRANSMIS_COMPTA' },
  { label: 'Contrôle', value: 'CONTROLE' },
  { label: 'À payer', value: 'A_PAYER' },
  { label: 'Payé', value: 'PAYE' },
  { label: 'Rejeté', value: 'REJETE' },
];

export default function OrdresPaiementBudgetPage() {
  const toast = useToast();
  const { hasAccess } = usePermissions();
  const user = useAuthStore((state) => state.user);
  const actor = user?.username ?? user?.email ?? undefined;
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState<'all' | OpStatut>('all');
  const [selected, setSelected] = useState<OrdrePaiement | null>(null);
  const opQuery = useOrdresPaiementBudget({
    page,
    limit: 12,
    statut: statut === 'all' ? undefined : statut,
  });
  const transmettreCompta = useTransmettreOpCompta();
  const ordres = opQuery.data?.items ?? [];

  const stats = useMemo(() => {
    const montant = ordres.reduce((sum, op) => sum + toAmount(op.montantTotal), 0);
    const transmis = ordres.filter((op) => op.statut === 'TRANSMIS_COMPTA').length;
    return { montant, transmis };
  }, [ordres]);

  const submitTransmission = async (op: OrdrePaiement) => {
    try {
      await transmettreCompta.mutateAsync({ id: op.id, utilisateurTransmission: actor });
      toast.success(`L’OP ${op.referenceOp} a été transmis à la Compta pour contrôle.`);
      setSelected(null);
    } catch (error) {
      toast.error(getErrorMessage(error), 'Transmission impossible');
    }
  };

  const columns: DataTableColumn<OrdrePaiement>[] = [
    { key: 'referenceOp', header: 'OP', render: (row) => row.referenceOp },
    { key: 'sourceBordereauId', header: 'Bordereau', render: (row) => row.sourceBordereauId },
    { key: 'sourceLotTraitementId', header: 'Lot', render: (row) => row.sourceLotTraitementId },
    { key: 'dateCreation', header: 'Créé le', render: (row) => formatDate(row.dateCreation) },
    { key: 'statut', header: 'Statut', render: (row) => <WorkflowStatus status={row.statut} /> },
    { key: 'nombreLignes', header: 'Lignes', render: (row) => row.nombreLignes },
    { key: 'montantTotal', header: 'Montant', render: (row) => formatAmount(row.montantTotal) },
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
            size="sm"
            variant="primary"
            icon={<Send className="h-4 w-4" />}
            disabled={!hasAccess('BUDGET', 3) || row.statut === 'TRANSMIS_COMPTA'}
            loading={transmettreCompta.isPending}
            onClick={() => submitTransmission(row)}
          >
            Transmettre
          </Button>
        </div>
      ),
    },
  ];

  const lineColumns: DataTableColumn<OrdrePaiementLigne>[] = [
    { key: 'codeOt', header: 'Code OT', render: (row) => row.codeOt },
    { key: 'dateFlux', header: 'Date flux', render: (row) => formatDate(row.dateFlux) },
    { key: 'produitLibelleBrut', header: 'Produit', render: (row) => row.produitLibelleBrut },
    { key: 'typeRecetteLibelle', header: 'Recette', render: (row) => row.typeRecetteLibelle ?? '-' },
    { key: 'montant', header: 'Montant', render: (row) => formatAmount(row.montant) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordres de paiement Budget"
        description="OP générés depuis les lots de traitement et transmis à la Compta pour contrôle avant paiement."
        actions={
          <Button
            type="button"
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => opQuery.refetch()}
          >
            Actualiser
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="OP visibles" value={ordres.length} />
        <MetricTile label="Transmis Compta" value={stats.transmis} />
        <MetricTile label="Montant visible" value={formatAmount(stats.montant)} />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex max-w-xs flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="op-statut">
              Statut
            </label>
            <select
              id="op-statut"
              value={statut}
              onChange={(event) => {
                setPage(1);
                setStatut(event.target.value as 'all' | OpStatut);
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
          <DataTable<OrdrePaiement>
            data={ordres}
            columns={columns}
            loading={opQuery.isLoading || opQuery.isFetching}
            getRowKey={(row) => row.id}
            emptyLabel="Aucun ordre de paiement."
            pagination={{
              currentPage: page,
              totalCount: opQuery.data?.total ?? 0,
              pageSize: opQuery.data?.limit ?? 12,
              onPageChange: setPage,
            }}
          />
        </CardContent>
      </Card>

      <Dialog isOpen={Boolean(selected)} onClose={() => setSelected(null)} width={920}>
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                Détail de l’OP {selected?.referenceOp}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Lignes issues du lot de traitement {selected?.sourceLotTraitementId}.
              </p>
            </div>
            {selected ? <WorkflowStatus status={selected.statut} /> : null}
          </div>
          <DataTable<OrdrePaiementLigne>
            data={selected?.lignes ?? []}
            columns={lineColumns}
            loading={false}
            getRowKey={(row) => row.id}
            emptyLabel="Aucune ligne OP."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
              Fermer
            </Button>
            <Button
              type="button"
              variant="primary"
              icon={<Send className="h-4 w-4" />}
              disabled={!selected || !hasAccess('BUDGET', 3) || selected.statut === 'TRANSMIS_COMPTA'}
              loading={transmettreCompta.isPending}
              onClick={() => selected && submitTransmission(selected)}
            >
              Transmettre à la Compta
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
