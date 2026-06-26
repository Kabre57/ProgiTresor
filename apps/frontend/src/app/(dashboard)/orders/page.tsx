'use client';

import { Play, RotateCcw } from 'lucide-react';
import { PiPlayDuotone } from 'react-icons/pi';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/lib/api/client';
import { useGenerateOrders, useOrders, useUpdateOrderStatus } from '@/lib/hooks/useOperationsQueries';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { PaymentOrder } from '@/types/order.types';

const statusOptions = [
  { label: 'Brouillon', value: 'Brouillon' },
  { label: 'Transmis', value: 'Transmis' },
  { label: 'Validé', value: 'Validé' },
  { label: 'Approuvé', value: 'Approuvé' },
  { label: 'Payé', value: 'Payé' },
  { label: 'Rejeté', value: 'Rejeté' },
];

const readNumber = (row: PaymentOrder, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  }
  return 0;
};

export default function OrdersPage() {
  const ordersQuery = useOrders();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const generateOrders = useGenerateOrders();
  const updateStatus = useUpdateOrderStatus();
  const [selected, setSelected] = useState<PaymentOrder | null>(null);
  const [statut, setStatut] = useState('VALIDE_CHEF');
  const [motif, setMotif] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allOrders = ordersQuery.data ?? [];
  const paginatedOrders = allOrders.slice((page - 1) * limit, page * limit);

  const runGeneration = async () => {
    setMessage(null);
    setError(null);
    try {
      const result = await generateOrders.mutateAsync();
      setMessage(`${result.message} · OP générés: ${result.generated_ops_count ?? 0}`);
    } catch (generationError) {
      setError(getErrorMessage(generationError));
    }
  };

  const submitStatus = async () => {
    if (!selected?.code) return;
    setError(null);
    setMessage(null);
    try {
      await updateStatus.mutateAsync({ code: selected.code, statut, motif: motif || undefined });
      setSelected(null);
      setMessage('Statut mis à jour.');
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordres de paiement"
        description="Génération Saga et suivi du workflow de validation."
        actions={
          <Button 
            variant="solid"
            type="button" 
            onClick={runGeneration} 
            loading={generateOrders.isPending}
            icon={<PiPlayDuotone className="text-xl" />}
          >
            Générer les OP
          </Button>
        }
      />

      {message ? <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div> : null}
      {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>Liste des ordres</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<PaymentOrder>
            data={paginatedOrders}
            loading={ordersQuery.isLoading}
            getRowKey={(row, index) => String(row.id ?? row.code ?? index)}
            columns={[
              { key: 'code', header: 'Code', render: (row) => <Badge tone="info">{String(row.code ?? row.reference ?? '-')}</Badge> },
              { key: 'antenne', header: 'Antenne', render: (row) => String(row.antenne ?? row.antenneCode ?? '-') },
              { key: 'filiere', header: 'Filières', render: (row) => String(row.filiere ?? row.filiereCode ?? '-') },
              { key: 'montant', header: 'Montant', render: (row) => formatCurrency(readNumber(row, ['montant', 'montantTotal', 'amount'])) },
              { key: 'statut', header: 'Statut', render: (row) => <Badge tone={String(row.statut ?? '').includes('VAL') ? 'success' : 'neutral'}>{String(row.statut ?? '-')}</Badge> },
              { key: 'date', header: 'Date', render: (row) => formatDate(String(row.dateCreation ?? row.createdAt ?? '')) },
              {
                key: 'actions',
                header: '',
                render: (row) => (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSelected(row)} aria-label="Changer statut">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ),
              },
            ]}
            pagination={{
              currentPage: page,
              totalCount: allOrders.length,
              pageSize: limit,
              onPageChange: (p) => setPage(p),
              onPageSizeChange: (l) => { setLimit(l); setPage(1); },
            }}
          />
        </CardContent>
      </Card>

      <Modal open={Boolean(selected)} title="Changer le statut" onClose={() => setSelected(null)}>
        <div className="space-y-4">
          <Input label="Ordre" value={String(selected?.code ?? '-')} readOnly />
          <Select label="Statut" options={statusOptions} value={statut} onChange={(event) => setStatut(event.target.value)} />
          <Textarea label="Motif" value={motif} onChange={(event) => setMotif(event.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
              Annuler
            </Button>
            <Button type="button" onClick={submitStatus} loading={updateStatus.isPending}>
              Valider
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
