import React from 'react';
import { UseFormRegister, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import { Download, ReceiptText, CreditCard, TrendingUp, FileText, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import {
  MetricCard,
  StatusPill,
  getTransactionReference,
  getTransactionProduct,
  getTransactionDate,
  getTransactionStatus,
} from './PortalComponents';
import type { NomenclatureProduit } from '@/types/etudiant.types';
import type { Transaction } from '@/types/transaction.types';

export type DeclarationInput = {
  refTresor: string;
  montant: string;
  dateHeure: string;
  libelleProduitBrut: string;
};

export type BillingTabProps = {
  totalFees: number;
  totalPaid: number;
  restToPay: number;
  applicableNomenclatures: NomenclatureProduit[];
  isNomenclatureLoading: boolean;
  isTxLoading: boolean;
  transactions: Transaction[];
  register: UseFormRegister<DeclarationInput>;
  handleSubmit: UseFormHandleSubmit<DeclarationInput>;
  errors: FieldErrors<DeclarationInput>;
  isSubmitting: boolean;
  onSubmitDeclaration: (values: DeclarationInput) => Promise<void>;
  downloadReceipt: (tx: Transaction) => void;
  downloadCertificat: () => void;
  onGlobalReceiptClick: () => void;
};

export function BillingTab({
  totalFees,
  totalPaid,
  restToPay,
  applicableNomenclatures,
  isNomenclatureLoading,
  isTxLoading,
  transactions,
  register,
  handleSubmit,
  errors,
  isSubmitting,
  onSubmitDeclaration,
  downloadReceipt,
  downloadCertificat,
  onGlobalReceiptClick,
}: BillingTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Frais a facturer" value={formatCurrency(totalFees)} helper="Nomenclature applicable" icon={<ReceiptText className="h-5 w-5" />} />
        <MetricCard title="Total paye" value={formatCurrency(totalPaid)} helper="Transactions rapprochees" tone="emerald" icon={<CreditCard className="h-5 w-5" />} />
        <MetricCard title="Solde" value={formatCurrency(restToPay)} helper={restToPay === 0 ? 'Aucun reste' : 'Reste a payer'} tone={restToPay === 0 ? 'emerald' : 'rose'} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-primary" />
              Nomenclature applicable
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isNomenclatureLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner className="h-8 w-8 text-primary" />
              </div>
            ) : applicableNomenclatures.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                Aucune nomenclature active ne correspond a votre filiere et votre statut.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Libelle</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {applicableNomenclatures.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-50">{item.codeProduit}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.libelle}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-50">
                          {formatCurrency(item.montant)}
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
              <FileText className="h-4 w-4 text-primary" />
              Declarer un paiement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitDeclaration)} className="space-y-4">
              <div>
                <label htmlFor="refTresor" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Reference Tresor
                </label>
                <Input id="refTresor" placeholder="TR-123456" {...register('refTresor')} />
                {errors.refTresor && <p className="mt-1 text-xs text-rose-500">{errors.refTresor.message}</p>}
              </div>
              <div>
                <label htmlFor="montant" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Montant
                </label>
                <Input id="montant" type="number" min="0" placeholder="50000" {...register('montant')} />
                {errors.montant && <p className="mt-1 text-xs text-rose-500">{errors.montant.message}</p>}
              </div>
              <div>
                <label htmlFor="dateHeure" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Date et heure
                </label>
                <Input id="dateHeure" type="datetime-local" {...register('dateHeure')} />
                {errors.dateHeure && <p className="mt-1 text-xs text-rose-500">{errors.dateHeure.message}</p>}
              </div>
              <div>
                <label htmlFor="libelleProduitBrut" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Produit paye
                </label>
                <Input id="libelleProduitBrut" placeholder="Inscription, mensualite..." {...register('libelleProduitBrut')} />
                {errors.libelleProduitBrut && <p className="mt-1 text-xs text-rose-500">{errors.libelleProduitBrut.message}</p>}
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="solid" loading={isSubmitting} icon={<Save className="h-4 w-4" />}>
                  Declarer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Historique des paiements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isTxLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Aucun paiement enregistre.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Produit</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Montant</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Statut</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Recu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((tx) => (
                    <tr key={String(tx.id ?? getTransactionReference(tx))}>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-50">{getTransactionReference(tx)}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{getTransactionProduct(tx)}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatDate(getTransactionDate(tx))}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-50">
                        {formatCurrency(Number(tx.montant ?? 0))}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusPill status={getTransactionStatus(tx)} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          size="xs"
                          variant="default"
                          icon={<Download className="h-3.5 w-3.5" />}
                          onClick={() => downloadReceipt(tx)}
                        >
                          Recu
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="default" icon={<Download className="h-4 w-4" />} onClick={downloadCertificat}>
          Certificat de scolarite
        </Button>
        <Button
          variant="default"
          icon={<Download className="h-4 w-4" />}
          onClick={onGlobalReceiptClick}
        >
          Recu global
        </Button>
      </div>
    </div>
  );
}
