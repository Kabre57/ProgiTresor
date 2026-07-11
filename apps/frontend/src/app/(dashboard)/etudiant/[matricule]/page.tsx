'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Tag, { type TagTone } from '@/components/ui/Tag';
import Tabs from '@/components/ui/Tabs';
import Table from '@/components/ui/Table';
import AdaptiveCard from '@/components/shared/AdaptiveCard';
import Container from '@/components/shared/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { useEtudiant, useStudentFinancialSummary, useDownloadAttestation } from '@/lib/hooks/useEtudiantQueries';
import { useTransactions } from '@/lib/hooks/useOperationsQueries';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { TbArrowNarrowLeft, TbFileText, TbPencil, TbPrinter } from 'react-icons/tb';
import type { PaymentOrder } from '@/types/order.types';
import type { Transaction } from '@/types/transaction.types';

const { THead, TBody, Tr, Th, Td } = Table;
const { TabList, TabNav, TabContent } = Tabs;

const getInitials = (nom?: string, prenom?: string) =>
  `${nom?.[0] ?? ''}${prenom?.[0] ?? ''}`.toUpperCase() || 'ET';

const getStatusTone = (value?: unknown): TagTone => {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized.includes('paid') || normalized.includes('pay') || normalized.includes('affect') || normalized.includes('valid')) {
    return 'success';
  }
  if (normalized.includes('pending') || normalized.includes('attente') || normalized.includes('importe')) return 'warning';
  if (normalized.includes('rej') || normalized.includes('annul') || normalized.includes('fail')) return 'danger';
  return 'info';
};

const readValue = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const getTransactionReference = (transaction: Transaction) =>
  String(readValue(transaction, ['refTresor', 'reference', 'id']) ?? '-');

const getTransactionDate = (transaction: Transaction) =>
  readValue(transaction, ['dateHeure', 'dateTransaction', 'createdAt']);

const getTransactionProduct = (transaction: Transaction) => {
  const nomenclature = transaction.nomenclature as { libelle?: string; codeProduit?: string } | undefined;
  return nomenclature?.libelle || String(readValue(transaction, ['libelleProduitBrut', 'produit']) ?? '-');
};

const getOrderCode = (order: PaymentOrder) => String(readValue(order, ['codeOt', 'code', 'reference', 'id']) ?? '-');

const getOrderDate = (order: PaymentOrder) => readValue(order, ['dateCreation', 'createdAt', 'date']);

const isOrderLinkedToEtudiant = (order: PaymentOrder, matricule: string) => {
  const direct = readValue(order, ['matricule', 'etudiantMatricule', 'matriculeEtudiant']);
  if (String(direct ?? '') === matricule) return true;
  const etudiant = order.etudiant as { matricule?: string } | undefined;
  return etudiant?.matricule === matricule;
};

const InfoField = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <span className="font-semibold text-gray-500 dark:text-gray-400">{label}</span>
    <p className="heading-text font-bold mt-1">{value || '-'}</p>
  </div>
);

const TransactionsTable = ({ transactions, compact = false }: { transactions: Transaction[]; compact?: boolean }) => (
  <Table compact={compact}>
    <THead>
      <Tr>
        <Th>Référence</Th>
        <Th>Date</Th>
        <Th>Produit</Th>
        <Th>Flux</Th>
        <Th>Statut</Th>
        <Th>Montant</Th>
      </Tr>
    </THead>
    <TBody>
      {transactions.length === 0 ? (
        <Tr>
          <Td colSpan={6}>Aucune transaction liée à cette fiche.</Td>
        </Tr>
      ) : (
        transactions.map((transaction, index) => {
          const status = readValue(transaction, ['statutTraitement', 'statut', 'status']);
          const nomenclature = transaction.nomenclature as { typeRecette?: { typeFlux?: { libelle?: string } } } | undefined;
          const typeFlux = transaction.typeFlux as { libelle?: string; label?: string } | undefined;
          const fluxLabel = nomenclature?.typeRecette?.typeFlux?.libelle || typeFlux?.libelle || typeFlux?.label || (transaction.typeFluxId ? `Flux #${transaction.typeFluxId}` : '-');
          return (
            <Tr key={`${getTransactionReference(transaction)}-${index}`}>
              <Td>{getTransactionReference(transaction)}</Td>
              <Td>{formatDate(getTransactionDate(transaction) as string)}</Td>
              <Td>{getTransactionProduct(transaction)}</Td>
              <Td>{fluxLabel}</Td>
              <Td>
                <Tag tone={getStatusTone(status)}>{String(status ?? 'Pending')}</Tag>
              </Td>
              <Td>{formatCurrency(Number(transaction.montant ?? 0))}</Td>
            </Tr>
          );
        })
      )}
    </TBody>
  </Table>
);

const OrdersTable = ({ orders, compact = false }: { orders: PaymentOrder[]; compact?: boolean }) => (
  <Table compact={compact}>
    <THead>
      <Tr>
        <Th>Code OT</Th>
        <Th>Date</Th>
        <Th>Type</Th>
        <Th>Statut</Th>
        <Th>Montant</Th>
      </Tr>
    </THead>
    <TBody>
      {orders.length === 0 ? (
        <Tr>
          <Td colSpan={5}>Aucun ordre de traitement lié à cette fiche.</Td>
        </Tr>
      ) : (
        orders.map((order, index) => {
          const status = readValue(order, ['statut', 'status']);
          return (
            <Tr key={`${getOrderCode(order)}-${index}`}>
              <Td>{getOrderCode(order)}</Td>
              <Td>{formatDate(getOrderDate(order) as string)}</Td>
              <Td>{String(readValue(order, ['type', 'typeFlux', 'libelle']) ?? '-')}</Td>
              <Td>
                <Tag tone={getStatusTone(status)}>{String(status ?? '-')}</Tag>
              </Td>
              <Td>{formatCurrency(Number(order.montant ?? 0))}</Td>
            </Tr>
          );
        })
      )}
    </TBody>
  </Table>
);

export default function EtudiantDetailsPage() {
  const params = useParams<{ matricule: string }>();
  const matricule = decodeURIComponent(String(params.matricule ?? ''));
  const router = useRouter();
  const etudiantQuery = useEtudiant(matricule);
  const summaryQuery = useStudentFinancialSummary(matricule);
  const downloadAttestationMutation = useDownloadAttestation();

  const [txPage, setTxPage] = useState(1);
  const txLimit = 10;
  const transactionsQuery = useTransactions({ 
    etudiantMatricule: matricule, 
    limit: txLimit, 
    offset: (txPage - 1) * txLimit 
  });
  const printTransactionsQuery = useTransactions({
    etudiantMatricule: matricule,
    limit: 10000,
    offset: 0
  });

  const etudiant = etudiantQuery.data;
  const transactions = transactionsQuery.data?.list ?? [];
  const allTransactions = printTransactionsQuery.data?.list ?? [];

  const summary = summaryQuery.data;
  const totalPaid = summary?.montantTotalPaye ?? 0;
  const expectedTotal = summary?.montantTotalAttendu ?? 0;
  const soldeRestant = summary?.soldeRestant ?? 0;
  const isSolded = summary?.isSolded ?? false;

  const handleDownloadAttestation = async () => {
    try {
      const blob = await downloadAttestationMutation.mutateAsync(matricule);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attestation_${matricule}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  if (etudiantQuery.isLoading) {
    return (
      <Container>
        <AdaptiveCard>
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">Chargement de la fiche...</div>
        </AdaptiveCard>
      </Container>
    );
  }

  if (!etudiant) {
    return (
      <Container>
        <AdaptiveCard>
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">Fiche étudiant introuvable.</div>
        </AdaptiveCard>
      </Container>
    );
  }

  return (
    <Container>
      <style>{`
        .etudiant-print-sheet { display: none; }
        @media print {
          @page { size: A4; margin: 8mm; }
          body { background: #fff !important; color: #111827 !important; font-size: 10px !important; }
          aside, nav, header, footer, .print-hidden, .etudiant-screen { display: none !important; }
          .etudiant-print-sheet { display: block !important; }
          .etudiant-print-card { break-inside: avoid; page-break-inside: avoid; margin-bottom: 8px; }
          .etudiant-print-title { font-size: 16px !important; margin: 0 0 6px; }
          .etudiant-print-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
          .etudiant-print-table th, .etudiant-print-table td { padding: 3px 4px !important; font-size: 9px !important; }
          .table-default { font-size: 9px !important; }
          .container { max-width: none !important; padding: 0 !important; }
        }
      `}</style>

      <div className="etudiant-screen flex flex-col gap-4">
        <PageHeader
          title={`Fiche ${etudiant.matricule}`}
          description={`${etudiant.nom} ${etudiant.prenom}`}
          actions={
            <>
              <Button type="button" icon={<TbArrowNarrowLeft className="text-xl" />} onClick={() => router.push('/etudiant')}>
                Retour
              </Button>
              <Button
                type="button"
                icon={<TbPencil className="text-xl" />}
                onClick={() => router.push(`/etudiant/${encodeURIComponent(etudiant.matricule)}/edit`)}
              >
                Modifier
              </Button>
              <Button type="button" variant="solid" icon={<TbPrinter className="text-xl" />} onClick={() => window.print()}>
                Imprimer
              </Button>
            </>
          }
        />

        <div className="flex flex-col xl:flex-row gap-4">
          <div className="xl:min-w-[330px] 2xl:min-w-[400px]">
            <AdaptiveCard className="w-full">
              <div className="flex flex-col items-center gap-4 mt-4">
                <Avatar size={90} shape="circle" src={etudiant.photoUrl ?? undefined}>
                  {getInitials(etudiant.nom, etudiant.prenom)}
                </Avatar>
                <h4 className="font-bold">{etudiant.nom} {etudiant.prenom}</h4>
                <Tag tone={getStatusTone(etudiant.statut?.libelle)}>{etudiant.statut?.libelle ?? 'Statut non défini'}</Tag>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-y-7 gap-x-4 mt-10">
                <InfoField label="Matricule" value={etudiant.matricule} />
                <InfoField label="Trésor Pay" value={etudiant.matriculeTresorPay} />
                <InfoField label="Promotion" value={etudiant.promotion?.niveau ? `${etudiant.promotion.niveau} ${etudiant.promotion.ordre}` : (etudiant.promotion?.nom || etudiant.promotionString)} />
                <InfoField label="Créé le" value={formatDate(etudiant.dateCreation)} />
              </div>
            </AdaptiveCard>
          </div>

          <AdaptiveCard className="w-full">
            <Tabs defaultValue="profil">
              <TabList>
                <TabNav value="profil">Profil</TabNav>
                <TabNav value="transactions">Transactions</TabNav>
                <TabNav value="solde">Solde / Attestation</TabNav>
              </TabList>
              <div className="p-4">
                <TabContent value="profil">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField label="Antenne" value={etudiant.antenne?.nom || etudiant.antenneId} />
                    <InfoField label="Filière" value={etudiant.filiere?.libelle || etudiant.filiereId || '-'} />
                    <InfoField label="Statut" value={etudiant.statut?.libelle || etudiant.statutId} />
                    <InfoField label="Promotion" value={etudiant.promotion?.niveau ? `${etudiant.promotion.niveau} ${etudiant.promotion.ordre}` : (etudiant.promotion?.nom || etudiant.promotionString)} />
                    <InfoField label="Matricule Trésor Pay" value={etudiant.matriculeTresorPay} />
                    <InfoField label="Fiche temporaire" value={etudiant.estTemporaire ? 'Oui' : 'Non'} />
                  </div>
                </TabContent>
                <TabContent value="transactions">
                  <div className="space-y-4">
                    <TransactionsTable transactions={transactions} />
                    <div className="flex justify-end mt-4">
                      <Pagination
                        currentPage={txPage}
                        onChange={(p) => setTxPage(p)}
                        pageSize={txLimit}
                        total={transactionsQuery.data?.total ?? 0}
                      />
                    </div>
                  </div>
                </TabContent>
                <TabContent value="solde">
                  {summaryQuery.isLoading ? (
                    <div className="text-center py-4 text-gray-500">Chargement du solde...</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <AdaptiveCard>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Total attendu (Frais obligatoire)</span>
                          <h4 className="mt-2 text-primary">{formatCurrency(expectedTotal)}</h4>
                        </AdaptiveCard>
                        <AdaptiveCard>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Total payé</span>
                          <h4 className="mt-2 text-success">{formatCurrency(totalPaid)}</h4>
                        </AdaptiveCard>
                        <AdaptiveCard>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Solde restant</span>
                          <h4 className={`mt-2 ${soldeRestant > 0 ? 'text-danger font-bold' : 'text-success'}`}>
                            {formatCurrency(soldeRestant)}
                          </h4>
                        </AdaptiveCard>
                      </div>

                      {soldeRestant > 0 && (
                        <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm">
                          Montant restant à régler : <strong>{formatCurrency(soldeRestant)}</strong>. L'attestation ne peut être générée qu'après le règlement complet.
                        </div>
                      )}

                      <div className="mt-6">
                        <Button
                          variant="solid"
                          disabled={!isSolded || downloadAttestationMutation.isPending}
                          onClick={handleDownloadAttestation}
                          icon={<TbFileText className="text-xl" />}
                        >
                          {downloadAttestationMutation.isPending ? 'Génération...' : 'Générer une attestation'}
                        </Button>
                      </div>
                    </>
                  )}
                </TabContent>
              </div>
            </Tabs>
          </AdaptiveCard>
        </div>
      </div>

      <div className="etudiant-print-sheet">
        <section className="etudiant-print-card">
          <div className="flex gap-6 items-start border-b border-gray-200 pb-4 mb-4">
            <div className="flex-shrink-0">
              <Avatar 
                size={96} 
                shape="square" 
                src={etudiant.photoUrl ?? undefined}
                className="border border-gray-200 shadow-sm"
                style={{ width: '96px', height: '96px', borderRadius: '8px' }}
              >
                {getInitials(etudiant.nom, etudiant.prenom)}
              </Avatar>
            </div>
            <div className="flex-1">
              <h1 className="etudiant-print-title font-bold text-xl mb-3">Fiche Étudiant - {etudiant.matricule}</h1>
              <div className="etudiant-print-grid">
                <InfoField label="Nom & Prénom" value={`${etudiant.nom} ${etudiant.prenom}`} />
                <InfoField label="Antenne" value={etudiant.antenne?.nom || etudiant.antenneId} />
                <InfoField label="Filière" value={etudiant.filiere?.libelle || etudiant.filiereId || '-'} />
                <InfoField label="Statut" value={etudiant.statut?.libelle || etudiant.statutId} />
                <InfoField label="Promotion" value={etudiant.promotion?.niveau ? `${etudiant.promotion.niveau} ${etudiant.promotion.ordre}` : (etudiant.promotion?.nom || etudiant.promotionString)} />
                <InfoField label="Trésor Pay" value={etudiant.matriculeTresorPay} />
                <InfoField label="Total payé" value={formatCurrency(totalPaid)} />
                <InfoField label="Transactions" value={printTransactionsQuery.data?.total ?? allTransactions.length} />
              </div>
            </div>
          </div>
        </section>
        <section className="etudiant-print-card etudiant-print-table mt-4">
          <h2 className="font-bold text-base mb-2 pb-1 border-b border-gray-200">Détails des transactions</h2>
          <TransactionsTable transactions={allTransactions} compact />
        </section>
      </div>
    </Container>
  );
}
