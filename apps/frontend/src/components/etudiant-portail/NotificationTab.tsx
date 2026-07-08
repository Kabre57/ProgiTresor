import React from 'react';
import { Bell, ReceiptText, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { getTransactionDate } from './PortalComponents';
import type { Etudiant, NomenclatureProduit } from '@/types/etudiant.types';
import type { Transaction } from '@/types/transaction.types';

export type NotificationTabProps = {
  etudiant: Etudiant;
  applicableNomenclatures: NomenclatureProduit[];
  validatedTransactions: Transaction[];
  totalPaid: number;
  restToPay: number;
  totalFees: number;
  lastPayment: Transaction | undefined;
};

export function NotificationTab({
  etudiant,
  applicableNomenclatures,
  validatedTransactions,
  totalPaid,
  restToPay,
  totalFees,
  lastPayment,
}: NotificationTabProps) {
  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <ReceiptText className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Facturation annuelle</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Frais calcules a partir de {applicableNomenclatures.length} nomenclature(s) active(s).
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Paiements rapprochees</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {validatedTransactions.length} transaction(s) validee(s) pour un total de {formatCurrency(totalPaid)}.
              </p>
            </div>
          </div>
        </div>
        {restToPay > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            Il reste {formatCurrency(restToPay)} a regler sur vos frais annuels de {formatCurrency(totalFees)}.
          </div>
        )}
        {!etudiant.matriculeTresorPay && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            Votre liaison Tresor Pay n'est pas encore active. Rendez-vous dans Integration.
          </div>
        )}
        {lastPayment && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            Dernier paiement detecte le {formatDate(getTransactionDate(lastPayment))}.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
