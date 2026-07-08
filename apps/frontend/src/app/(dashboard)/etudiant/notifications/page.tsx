'use client';

import { NotificationTab } from '@/components/etudiant-portail/NotificationTab';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useStudentPortalData } from '@/lib/hooks/useStudentPortalData';

export default function EtudiantNotificationsPage() {
  const {
    etudiant,
    applicableNomenclatures,
    validatedTransactions,
    totalPaid,
    restToPay,
    totalFees,
    lastPayment,
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
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Espace étudiant</p>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Notifications</h1>
      </div>
      <NotificationTab
        etudiant={etudiant}
        applicableNomenclatures={applicableNomenclatures}
        validatedTransactions={validatedTransactions}
        totalPaid={totalPaid}
        restToPay={restToPay}
        totalFees={totalFees}
        lastPayment={lastPayment}
      />
    </div>
  );
}
