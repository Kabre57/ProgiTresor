'use client';

import { Search, X, Edit, Trash2 } from 'lucide-react';
import { PiCloudArrowDownDuotone, PiUploadSimpleDuotone, PiMagnifyingGlassDuotone } from 'react-icons/pi';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Dropdown } from '@/components/ui/Dropdown';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/api/client';
import { useTransactions } from '@/lib/hooks/useOperationsQueries';
import { transactionApi } from '@/lib/api/transactionApi';
import { formatCurrency, formatDate } from '@/lib/utils/format';

import { EditTransactionModal } from '@/components/transactions/EditTransactionModal';
import { ImportTransactionModal } from '@/components/transactions/ImportTransactionModal';
import { DeleteConfirmationModal } from '@/components/transactions/DeleteConfirmationModal';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { TransactionKpiCards } from '@/components/transactions/TransactionKpiCards';

type ExportFormat = 'xlsx' | 'xls';

const getTransactionProductLabel = (row: any): string => {
  const importedValue = String(row.libelleProduitBrut ?? '').trim();
  const nomenclatureLabel = String(row.nomenclature?.libelle ?? '').trim();
  const nomenclatureCode = String(row.nomenclature?.codeProduit ?? '').trim();

  if (!importedValue) return nomenclatureLabel || '-';
  if (
    nomenclatureLabel &&
    nomenclatureCode &&
    importedValue.toLocaleUpperCase() === nomenclatureCode.toLocaleUpperCase()
  ) {
    return nomenclatureLabel;
  }
  return importedValue;
};

function TransactionsContent() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // Sort State
  const [sortBy, setSortBy] = useState<string | null>('dateHeure');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>('desc');

  // Filter States
  const getFormatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getInitialActiveFilters = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const paramStatut = searchParams.get('statutTraitement');
    return {
      dateDebut: getFormatDateString(firstDayOfMonth),
      dateFin: getFormatDateString(today),
      statutTraitement: paramStatut || undefined,
    };
  };

  const [activeFilters, setActiveFilters] = useState<any>(getInitialActiveFilters());

  // Fetch transactions with full query parameter object
  const queryParams = {
    limit,
    offset: (page - 1) * limit,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
    ...activeFilters,
  };

  const transactionsQuery = useTransactions(queryParams);
  const toast = useToast();
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleApplyFilters = (newFilters: any) => {
    setPage(1);
    setActiveFilters(newFilters);
  };

  const handleExport = async (format: ExportFormat) => {
    try {
      const blob = await transactionApi.export({ ...activeFilters, format });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_export_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Exportation ${format.toUpperCase()} des transactions filtrées réussie.`);
    } catch (err) {
      toast.error(getErrorMessage(err), "Échec de l'exportation");
    }
  };

  const columns = [
    { 
      key: 'refTresor', 
      header: 'Référence Trésor', 
      sortable: true,
      render: (row: any) => String(row.refTresor ?? row.reference ?? '-') 
    },
    { 
      key: 'dateHeure', 
      header: 'Date/Heure', 
      sortable: true,
      render: (row: any) => formatDate(String(row.dateHeure ?? '')) 
    },
    { 
      key: 'montant', 
      header: 'Montant', 
      sortable: true,
      render: (row: any) => formatCurrency(Number(row.montant ?? 0)) 
    },
    { 
      key: 'matriculeEtudiant', 
      header: 'Étudiant', 
      sortable: true,
      render: (row: any) => row.etudiant ? (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 dark:text-slate-100">{row.etudiant.nom} {row.etudiant.prenom}</span>
          <span className="text-xs text-slate-400">{row.etudiant.matricule}</span>
        </div>
      ) : (
        <span className="text-slate-400">{row.etudiantId || '-'}</span>
      )
    },
    {
      key: 'promotion',
      header: 'Promotion',
      render: (row: any) => {
        const p = row.etudiant?.promotion;
        return String(p?.niveau ? `${p.niveau} ${p.ordre}` : (p?.nom || row.etudiant?.promotionString || '-'));
      }
    },
    {
      key: 'antenne',
      header: 'Antenne',
      render: (row: any) => String(row.etudiant?.antenne?.nom || '-')
    },
    {
      key: 'filiere',
      header: 'Filière',
      render: (row: any) => String(row.etudiant?.filiere?.libelle || row.filiere || '-')
    },
    {
      key: 'nomenclature',
      header: 'Nomenclature',
      render: (row: any) => row.nomenclature ? (
        <div className="flex flex-col">
          <span className="font-medium text-slate-700 dark:text-slate-300">{row.nomenclature.libelle}</span>
          <span className="text-xs text-slate-400">{row.nomenclature.codeProduit}</span>
        </div>
      ) : '-'
    },
    {
      key: 'typeFlux',
      header: 'Type de flux',
      render: (row: any) => {
        const fluxLabel = row.nomenclature?.typeRecette?.typeFlux?.libelle || row.typeFlux?.libelle || row.typeFlux?.label;
        if (fluxLabel) return fluxLabel;
        return row.typeFluxId ? `Flux #${row.typeFluxId}` : '-';
      }
    },
    {
      key: 'payeur',
      header: 'Payeur',
      render: (row: any) => String(row.nomPayeurBrut || '-')
    },
    {
      key: 'contactPayeur',
      header: 'Contact payeur',
      render: (row: any) => String(row.contactPayeur || '-')
    },
    {
      key: 'libelleProduitBrut',
      header: 'Libellé produit',
      render: (row: any) => getTransactionProductLabel(row)
    },
    { 
      key: 'statutTraitement', 
      header: 'Statut', 
      render: (row: any) => (
        <Badge tone={row.statutTraitement === 'AFFECTE' ? 'success' : 'info'}>
          {String(row.statutTraitement ?? '-')}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-500 hover:text-[var(--primary)] hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => { setEditingTransaction(row); setIsEditModalOpen(true); }}
            disabled={row.gele}
            title={row.gele ? "Transaction gelée" : "Modifier"}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => { setDeletingTransactionId(String(row.id)); setIsDeleteModalOpen(true); }}
            disabled={row.gele}
            title={row.gele ? "Transaction gelée" : "Supprimer"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const totals = transactionsQuery.data?.totals || { budget: 0, horsBudget: 0, total: 0 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions – Consultation et import des flux de paiement"
        description="Consultez, filtrez et importez les flux de paiements des étudiants."
        actions={
          <div className="flex items-center gap-2">
            <Dropdown
              placement="bottom-end"
              renderTitle={
                <Button
                  variant="default"
                  type="button"
                  icon={<PiCloudArrowDownDuotone className="text-xl" />}
                >
                  Exporter
                </Button>
              }
            >
              <Dropdown.Item onClick={() => handleExport('xlsx')}>Excel moderne (.xlsx)</Dropdown.Item>
              <Dropdown.Item onClick={() => handleExport('xls')}>Excel ancien (.xls)</Dropdown.Item>
            </Dropdown>
            <Button 
              variant="solid"
              type="button" 
              onClick={() => { setIsImportModalOpen(true); }}
              icon={<PiUploadSimpleDuotone className="text-xl" />}
            >
              Importer transactions
            </Button>
          </div>
        }
      />

      {/* KPI Cards section for totals */}
      <TransactionKpiCards totals={totals} />

      {/* Advanced Filters */}
      <TransactionFilters onApplyFilters={handleApplyFilters} />

      {/* Main transactions list */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<any>
            data={transactionsQuery.data?.list ?? []}
            loading={transactionsQuery.isLoading}
            getRowKey={(row, index) => String(row.id ?? row.refTresor ?? index)}
            columns={columns}
            pagination={{
              currentPage: page,
              totalCount: transactionsQuery.data?.total ?? 0,
              pageSize: limit,
              onPageChange: (p) => setPage(p),
            }}
            sorting={{
              sortBy,
              sortOrder,
              onSortChange: (key, order) => {
                setSortBy(key);
                setSortOrder(order);
                setPage(1);
              }
            }}
          />
        </CardContent>
      </Card>

      <ImportTransactionModal
        open={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          transactionsQuery.refetch();
        }}
      />

      <EditTransactionModal
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTransaction(null);
          transactionsQuery.refetch();
        }}
        transaction={editingTransaction}
      />

      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingTransactionId(null);
          transactionsQuery.refetch();
        }}
        transactionId={deletingTransactionId}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
