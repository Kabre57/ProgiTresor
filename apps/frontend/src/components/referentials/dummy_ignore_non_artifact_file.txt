import { MetricTile } from '@/components/compta-budget/WorkflowUi';
import { formatCurrency } from '@/lib/utils/format';

type OrdersMetricsProps = {
  filteredOrdersCount: number;
  totalTransactions: number;
  totalMontant: number;
};

export function OrdersMetrics({ filteredOrdersCount, totalTransactions, totalMontant }: OrdersMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricTile label="Ordres de traitement" value={filteredOrdersCount} />
      <MetricTile label="Total des flux" value={totalTransactions} />
      <MetricTile label="Montant cumulé" value={formatCurrency(totalMontant)} />
    </div>
  );
}
