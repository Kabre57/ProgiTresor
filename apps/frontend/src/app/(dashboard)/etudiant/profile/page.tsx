'use client';

import StudentSheetV2 from '@/components/etudiants/StudentSheetV2';
import { Spinner } from '@/components/ui/Spinner';
import { Card, CardContent } from '@/components/ui/Card';
import { getTransactionDate, getTransactionProduct, getTransactionReference } from '@/components/etudiant-portail/PortalComponents';
import { useStudentPortalData } from '@/lib/hooks/useStudentPortalData';
import { formatCurrency, formatDate } from '@/lib/utils/format';

export default function EtudiantProfilePage() {
  const {
    etudiant,
    transactions,
    applicableNomenclatures,
    totalFees,
    totalPaid,
    restToPay,
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
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <StudentSheetV2
        studentName={`${etudiant.nom} ${etudiant.prenom}`}
        matricule={etudiant.matricule}
        photoUrl={etudiant.photoUrl ?? undefined}
        antenne={etudiant.antenne?.nom || '-'}
        promotion={etudiant.promotion?.nom || etudiant.promotionString || '-'}
        statutEtudiant={etudiant.statut?.libelle || '-'}
        filiere={etudiant.filiere?.libelle || etudiant.niveau?.filiere?.libelle || etudiant.niveau?.libelle || '-'}
        cycle={etudiant.niveau?.cycle || etudiant.niveau?.libelle || '-'}
        totalPayments={totalPaid}
        totalAmount={formatCurrency(totalPaid)}
        status={restToPay === 0 && totalFees > 0 ? 'À JOUR' : 'SOLDE IMPAYÉ'}
        soldeRestant={restToPay}
        expectedTotal={totalFees}
        transactions={transactions.map((tx) => ({
          refTresor: getTransactionReference(tx),
          libelleProduitBrut: getTransactionProduct(tx),
          montant: Number(tx.montant ?? 0),
          dateHeure: formatDate(getTransactionDate(tx)),
        }))}
        pricingReferences={applicableNomenclatures.map((item) => ({
          type: item.libelleStandard,
          year1: formatCurrency(item.montant),
          year2: '-',
          year3: '-',
        }))}
      />
    </div>
  );
}
