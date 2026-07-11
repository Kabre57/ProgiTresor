import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import type { Transaction } from '@/types/transaction.types';

export type MetricCardProps = {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone?: 'amber' | 'emerald' | 'rose' | 'blue';
};

const toneClasses = {
  amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  emerald:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
};

export function MetricCard({ title, value, helper, icon, tone = 'amber' }: MetricCardProps) {
  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
            <p className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helper}</p>
          </div>
          <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ring-1 ${toneClasses[tone]}`}>
            {icon}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function InfoItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-50">{value || '-'}</div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const isPaid = normalized.includes('AFFECTE') || normalized.includes('PAYE') || normalized.includes('PAID');

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isPaid
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
      }`}
    >
      {isPaid ? 'Valide' : 'En attente'}
    </span>
  );
}

export const getTransactionReference = (tx: Transaction) =>
  String(tx.refTresor ?? tx.reference ?? tx.id ?? '-');

export const getTransactionProduct = (tx: Transaction) =>
  String(tx.libelleProduitBrut ?? tx.libelle ?? tx.typeRecette ?? 'Scolarite');

export const getTransactionStatus = (tx: Transaction) =>
  String(tx.statutTraitement ?? tx.statut ?? 'EN_ATTENTE');

export const getTransactionDate = (tx: Transaction) => {
  const rawDate = tx.dateHeure ?? tx.dateTransaction ?? tx.createdAt;
  return typeof rawDate === 'string' || rawDate instanceof Date ? rawDate : null;
};

export const isValidatedTransaction = (tx: Transaction) => {
  const status = getTransactionStatus(tx).toUpperCase();
  return status.includes('AFFECTE') || status.includes('PAYE') || status.includes('PAID') || status.includes('VALID');
};
