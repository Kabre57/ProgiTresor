import React from 'react';
import { Clock, Bell, ReceiptText, CheckCircle2, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { MetricCard, getTransactionReference, getTransactionProduct, getTransactionDate, StatusPill } from './PortalComponents';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { Etudiant, NomenclatureProduit } from '@/types/etudiant.types';
import type { Transaction } from '@/types/transaction.types';

export type DashboardTabProps = {
  etudiant: Etudiant;
  totalFees: number;
  totalPaid: number;
  restToPay: number;
  paymentProgress: number;
  transactions: Transaction[];
  validatedTransactions: Transaction[];
  applicableNomenclatures: NomenclatureProduit[];
  isTxLoading: boolean;
  isNomenclatureLoading: boolean;
  lastPayment: Transaction | undefined;
};

export function DashboardTab({
  etudiant,
  totalFees,
  totalPaid,
  restToPay,
  paymentProgress,
  transactions,
  validatedTransactions,
  isTxLoading,
  isNomenclatureLoading,
  lastPayment,
}: DashboardTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Frais annuels"
          value={isNomenclatureLoading ? 'Chargement...' : formatCurrency(totalFees)}
          helper="Calcule depuis la nomenclature"
          tone="amber"
          icon={<ReceiptText className="h-5 w-5" />}
        />
        <MetricCard
          title="Deja regle"
          value={formatCurrency(totalPaid)}
          helper={`${validatedTransactions.length} paiement(s) valide(s)`}
          tone="emerald"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Reste a payer"
          value={formatCurrency(restToPay)}
          helper={restToPay === 0 ? 'Solde a jour' : 'Solde restant'}
          tone={restToPay === 0 ? 'emerald' : 'rose'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Progression"
          value={`${paymentProgress}%`}
          helper="Avancement financier"
          tone="blue"
          icon={<Award className="h-5 w-5" />}
        />
      </div>

      {/* Barre de Progression de l'Année */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800/80 shadow-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center text-sm font-bold text-slate-700 dark:text-slate-200">
            <span>Progression globale des frais de l'année en cours</span>
            <span className="text-[var(--primary)] text-base font-extrabold">{paymentProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden relative shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 to-emerald-500 h-4 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${paymentProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Déjà réglé : {formatCurrency(totalPaid)}</span>
            <span>Total attendu : {formatCurrency(totalFees)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Activite recente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isTxLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner className="h-8 w-8 text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                Aucune transaction rattachee a votre matricule.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Produit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Montant
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.slice(0, 5).map((tx) => (
                      <tr key={String(tx.id ?? getTransactionReference(tx))} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-50">
                          {getTransactionReference(tx)}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{getTransactionProduct(tx)}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {formatDate(getTransactionDate(tx))}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-50">
                          {formatCurrency(Number(tx.montant ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Alertes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {restToPay > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                Il reste {formatCurrency(restToPay)} a regler sur les frais annuels.
              </div>
            )}
            {restToPay === 0 && totalFees > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                Votre solde annuel est a jour.
              </div>
            )}
            {!etudiant.matriculeTresorPay && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                Liez votre matricule Tresor Pay pour automatiser le rapprochement.
              </div>
            )}
            {lastPayment && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                Dernier paiement detecte le {formatDate(getTransactionDate(lastPayment))}.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
