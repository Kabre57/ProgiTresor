'use client';

import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  MetricTile,
  WorkflowStatus,
  formatAmount,
  toAmount,
} from '@/components/compta-budget/WorkflowUi';
import { useControlesOp } from '@/lib/hooks/useOperationsQueries';
import { formatDate } from '@/lib/utils/format';
import type { ControleOpOt } from '@/types/compta-budget.types';

export default function ControleOpPage() {
  const controlesQuery = useControlesOp();
  const controles = controlesQuery.data ?? [];

  const stats = useMemo(() => {
    const conformes = controles.filter((item) => item.statutControle === 'CONFORME').length;
    const ecarts = controles.filter((item) => item.statutControle === 'ECART').length;
    const montantEcart = controles.reduce((sum, item) => sum + Math.abs(toAmount(item.ecart)), 0);
    return { conformes, ecarts, montantEcart };
  }, [controles]);

  const columns: DataTableColumn<ControleOpOt>[] = [
    { key: 'referenceOp', header: 'OP', render: (row) => row.referenceOp },
    { key: 'bordereau', header: 'Bordereau', render: (row) => row.bordereau?.reference ?? row.bordereauId },
    { key: 'lot', header: 'Lot', render: (row) => row.lotTraitement?.reference ?? row.lotTraitementId },
    { key: 'montantOt', header: 'Montant OT', render: (row) => formatAmount(row.montantOt) },
    { key: 'montantOp', header: 'Montant OP', render: (row) => formatAmount(row.montantOp) },
    { key: 'ecart', header: 'Écart', render: (row) => formatAmount(row.ecart) },
    {
      key: 'lignes',
      header: 'Lignes',
      render: (row) => `${row.nombreLignesOp}/${row.nombreLignesOt}`,
    },
    { key: 'statutControle', header: 'Contrôle', render: (row) => <WorkflowStatus status={row.statutControle} /> },
    { key: 'dateControle', header: 'Date', render: (row) => formatDate(row.dateControle) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrôle OP / OT"
        description="Contrôle de conformité entre les lots d’OT transmis et les OP retournés par le Budget."
        actions={
          <Button
            type="button"
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => controlesQuery.refetch()}
          >
            Actualiser
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Conformes" value={stats.conformes} />
        <MetricTile label="Avec écart" value={stats.ecarts} />
        <MetricTile label="Montant des écarts" value={formatAmount(stats.montantEcart)} />
      </div>

      <Card>
        <CardContent>
          <DataTable<ControleOpOt>
            data={controles}
            columns={columns}
            loading={controlesQuery.isLoading || controlesQuery.isFetching}
            getRowKey={(row) => row.id}
            emptyLabel="Aucun contrôle OP/OT enregistré."
          />
        </CardContent>
      </Card>
    </div>
  );
}
