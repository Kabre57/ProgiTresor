import { useMemo } from 'react';
import { useEtudiantMe, useReferential } from '@/lib/hooks/useEtudiantQueries';
import { useTransactions } from '@/lib/hooks/useOperationsQueries';
import { isValidatedTransaction } from '@/components/etudiant-portail/PortalComponents';
import type { NomenclatureProduit } from '@/types/etudiant.types';

const isApplicableNomenclature = (
  item: NomenclatureProduit,
  niveauId: number,
  filiereId: number | null,
  statutId: number,
) => {
  const niveauMatches = item.niveauId === null || item.niveauId === niveauId;
  const filiereMatches =
    item.filiereId === null ||
    filiereId === null ||
    item.filiereId === filiereId ||
    item.niveau?.filiereId === filiereId;
  const statutMatches = item.statutId === null || item.statutId === statutId;
  return item.actif && niveauMatches && filiereMatches && statutMatches;
};

export function useStudentPortalData() {
  const etudiantQuery = useEtudiantMe();
  const nomenclatureQuery = useReferential('nomenclatures');

  const transactionParams = useMemo(
    () => ({ etudiantMatricule: etudiantQuery.data?.matricule ?? '__pending__', limit: 100 }),
    [etudiantQuery.data?.matricule],
  );

  const transactionsQuery = useTransactions(transactionParams);
  const transactions = useMemo(() => transactionsQuery.data?.list ?? [], [transactionsQuery.data?.list]);
  const validatedTransactions = useMemo(
    () => transactions.filter(isValidatedTransaction),
    [transactions],
  );

  const applicableNomenclatures = useMemo(() => {
    const etudiant = etudiantQuery.data;
    const nomenclatures = nomenclatureQuery.data ?? [];
    if (!etudiant) return [];
    return nomenclatures.filter((item) =>
      isApplicableNomenclature(item, etudiant.niveauId, etudiant.filiereId, etudiant.statutId),
    );
  }, [etudiantQuery.data, nomenclatureQuery.data]);

  const totalFees = applicableNomenclatures.reduce(
    (sum, item) => sum + Number(item.montant ?? 0),
    0,
  );

  const totalPaid = validatedTransactions.reduce(
    (sum, tx) => sum + Number(tx.montant ?? 0),
    0,
  );

  const restToPay = Math.max(0, totalFees - totalPaid);
  const paymentProgress = totalFees > 0 ? Math.min(100, Math.round((totalPaid / totalFees) * 100)) : 0;

  return {
    etudiant: etudiantQuery.data,
    transactions,
    validatedTransactions,
    applicableNomenclatures,
    totalFees,
    totalPaid,
    restToPay,
    paymentProgress,
    lastPayment: transactions[0],
    isEtudiantLoading: etudiantQuery.isLoading,
    isNomenclatureLoading: nomenclatureQuery.isLoading,
    isTxLoading: transactionsQuery.isLoading,
    isLoading: etudiantQuery.isLoading || nomenclatureQuery.isLoading || transactionsQuery.isLoading,
  };
}
