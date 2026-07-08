'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { DashboardTab } from '@/components/etudiant-portail/DashboardTab'
import { useStudentPortalData } from '@/lib/hooks/useStudentPortalData'

export default function EtudiantPortalPage() {
  const router = useRouter()
  const toast = useToast()
  const {
    etudiant,
    transactions,
    validatedTransactions,
    applicableNomenclatures,
    totalFees,
    totalPaid,
    restToPay,
    paymentProgress,
    lastPayment,
    isEtudiantLoading,
    isNomenclatureLoading,
    isTxLoading,
  } = useStudentPortalData()

  useEffect(() => {
    if (validatedTransactions.length > 0) {
      const latest = validatedTransactions[0];
      const product = (latest.nomenclature as any)?.libelleStandard || latest.libelleProduitBrut || 'Scolarité';
      toast.success(`Votre paiement de ${formatCurrency(Number(latest.montant))} pour ${product} a bien été rattaché à votre matricule.`);
    }
  }, [validatedTransactions.length, toast]);

  if (isEtudiantLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-10 w-10 text-primary" />
      </div>
    )
  }

  if (!etudiant) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-md bg-white dark:bg-gray-800">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">Profil etudiant introuvable</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Aucun profil etudiant ne correspond a votre session actuelle.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Espace Etudiant
              </p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {etudiant.prenom} {etudiant.nom}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {etudiant.matricule} · {etudiant.filiere?.libelle || 'Filiere non renseignee'} ·{' '}
                {etudiant.antenne?.nom || 'Antenne non renseignee'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DashboardTab
        etudiant={etudiant}
        totalFees={totalFees}
        totalPaid={totalPaid}
        restToPay={restToPay}
        paymentProgress={paymentProgress}
        transactions={transactions}
        validatedTransactions={validatedTransactions}
        applicableNomenclatures={applicableNomenclatures}
        isTxLoading={isTxLoading}
        isNomenclatureLoading={isNomenclatureLoading}
        lastPayment={lastPayment}
      />
    </div>
  )
}
