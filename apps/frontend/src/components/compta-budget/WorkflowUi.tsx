'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/format';
import type { AmountValue } from '@/types/compta-budget.types';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const statusTone = (status?: string): Tone => {
  if (!status) return 'neutral';
  if (['TRAITE', 'TRANSMIS_BUDGET', 'TRANSMIS_COMPTA', 'CONFORME', 'PAYE'].includes(status)) {
    return 'success';
  }
  if (['EN_ATTENTE', 'BROUILLON', 'PARTIELLEMENT_TRAITE', 'A_PAYER'].includes(status)) {
    return 'warning';
  }
  if (['ECART', 'REJETE'].includes(status)) {
    return 'danger';
  }
  return 'info';
};

export const toAmount = (value: AmountValue | null | undefined) => Number(value ?? 0);

export const formatAmount = (value: AmountValue | null | undefined) => formatCurrency(toAmount(value));

export const humanStatus = (status?: string | null) =>
  (status ?? '-').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

export function WorkflowStatus({ status }: { status?: string | null }) {
  return <Badge tone={statusTone(status ?? undefined)}>{humanStatus(status)}</Badge>;
}

export function MetricTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
        {helper ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}
