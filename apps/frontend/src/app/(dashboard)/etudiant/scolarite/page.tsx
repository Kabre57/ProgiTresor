'use client';

import { CreditCard, GraduationCap, ReceiptText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { MetricCard, StatusPill, getTransactionDate, getTransactionProduct, getTransactionReference, getTransactionStatus } from '@/components/etudiant-portail/PortalComponents';
import { useStudentPortalData } from '@/lib/hooks/useStudentPortalData';
import { formatCurrency, formatDate } from '@/lib/utils/format';

export default function EtudiantScolaritePage() {
  const {
    etudiant,
    transactions,
    applicableNomenclatures,
    totalFees,
    totalPaid,
    restToPay,
    paymentProgress,
    isLoading,
  } = useStudentPortalData();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!etudiant) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Card>
          <CardContent className="p-6 text-center text-sm text-slate-500">
            Aucun profil étudiant ne correspond à votre session.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Espace étudiant</p>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Ma scolarité</h1>
        <p className="mt-1 text-sm text-slate-500">
          {etudiant.matricule} · {etudiant.niveau?.libelle || 'Niveau non renseigné'} · {etudiant.antenne?.nom || 'Antenne non renseignée'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Frais attendus" value={formatCurrency(totalFees)} helper="Référentiel applicable" icon={<ReceiptText className="h-5 w-5" />} />
        <MetricCard title="Total payé" value={formatCurrency(totalPaid)} helper={`${transactions.length} paiement(s)`} tone="emerald" icon={<CreditCard className="h-5 w-5" />} />
        <MetricCard title="Reste à payer" value={formatCurrency(restToPay)} helper={restToPay === 0 ? 'Solde à jour' : 'Solde restant'} tone={restToPay === 0 ? 'emerald' : 'rose'} icon={<GraduationCap className="h-5 w-5" />} />
        <MetricCard title="Progression" value={`${paymentProgress}%`} helper="Avancement financier" tone="blue" icon={<ReceiptText className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nomenclature applicable</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {applicableNomenclatures.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">Aucun frais applicable trouvé.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Frais</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {applicableNomenclatures.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 font-medium">{item.codeProduit}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.libelle}</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(item.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">Aucun paiement rattaché.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Référence</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Produit</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">Montant</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-slate-500">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {transactions.map((tx) => (
                    <tr key={String(tx.id ?? getTransactionReference(tx))}>
                      <td className="px-6 py-4 font-medium">{getTransactionReference(tx)}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{getTransactionProduct(tx)}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{formatDate(getTransactionDate(tx))}</td>
                      <td className="px-6 py-4 text-right font-semibold">{formatCurrency(Number(tx.montant ?? 0))}</td>
                      <td className="px-6 py-4 text-center"><StatusPill status={getTransactionStatus(tx)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
