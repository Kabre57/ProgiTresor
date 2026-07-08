'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { DataTable } from '@/components/ui/DataTable';
import { useTransactionsByIds } from '@/lib/hooks/useOperationsQueries';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { SynthesisLine } from '@/types/analyse.types';

export interface SynthesisDetailsModalData {
  antenneLibelle?: string;
  niveauLibelle?: string;
  statutLibelle?: string;
  typeRecetteLibelle?: string;
  montantCumule: number;
  nombreFlux?: number;
  transactionIds: number[];
}

type SynthesisDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  synthesisLine: SynthesisDetailsModalData | null;
};

interface DetailedTransactionRow {
  id: number;
  dateHeure: string;
  dateTransaction?: string;
  reference?: string;
  libelleProduitBrut?: string;
  montant: number | string;
  etudiant?: {
    nom: string;
    prenom: string;
    matricule: string;
  };
}

export function SynthesisDetailsModal({ isOpen, onClose, synthesisLine }: SynthesisDetailsModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Reset page when synthesisLine changes
  useEffect(() => {
    setCurrentPage(1);
  }, [synthesisLine]);

  const transactionIds = synthesisLine?.transactionIds || [];
  const totalFlux = synthesisLine?.nombreFlux ?? transactionIds.length;
  const currentPageIds = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return transactionIds.slice(startIndex, startIndex + pageSize);
  }, [currentPage, transactionIds]);

  const { data, isLoading } = useTransactionsByIds(
    currentPageIds,
    isOpen && !!synthesisLine && currentPageIds.length > 0
  );

  const transactionsList = data?.list || [];

  const columns = [
    {
      key: 'dateHeure',
      header: 'Date & Heure',
      render: (row: DetailedTransactionRow) => formatDate(row.dateHeure),
    },
    {
      key: 'reference',
      header: 'Référence Trésor',
      render: (row: DetailedTransactionRow) => (
        <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
          {row.reference || '-'}
        </span>
      ),
    },
    {
      key: 'etudiantNom',
      header: 'Étudiant',
      render: (row: DetailedTransactionRow) => {
        if (!row.etudiant) return '-';
        return (
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {row.etudiant.nom} {row.etudiant.prenom}
            </div>
            <div className="text-xs text-slate-400 font-mono">{row.etudiant.matricule}</div>
          </div>
        );
      },
    },
    {
      key: 'libelleProduitBrut',
      header: 'Libellé Produit',
      render: (row: DetailedTransactionRow) => (
        <span className="text-xs max-w-[200px] truncate block" title={row.libelleProduitBrut || ''}>
          {row.libelleProduitBrut || '-'}
        </span>
      ),
    },
    {
      key: 'montant',
      header: 'Montant',
      render: (row: DetailedTransactionRow) => (
        <span className="font-bold text-slate-900 dark:text-white">
          {formatCurrency(Number(row.montant))}
        </span>
      ),
    },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width={900}
      title={
        synthesisLine ? (
          <div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              Détails des flux de paiement
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {synthesisLine.antenneLibelle} • {synthesisLine.niveauLibelle} • {synthesisLine.statutLibelle} • {synthesisLine.typeRecetteLibelle}
            </p>
          </div>
        ) : (
          'Détails des flux'
        )
      }
    >
      <div className="space-y-4 py-2">
        <DataTable
          data={transactionsList as unknown as DetailedTransactionRow[]}
          columns={columns}
          loading={isLoading}
          getRowKey={(row: DetailedTransactionRow) => String(row.id)}
          emptyLabel="Aucun flux de paiement trouvé pour cette ligne de synthèse"
          pagination={{
            currentPage,
            totalCount: transactionIds.length,
            pageSize,
            onPageChange: (page) => setCurrentPage(page),
          }}
        />

        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">Total Cumulé</div>
            <div className="text-xl font-black text-[var(--primary)] mt-0.5">
              {synthesisLine ? formatCurrency(synthesisLine.montantCumule) : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold text-right">Nombre de Flux</div>
            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-200 text-right mt-0.5">
              {totalFlux} transaction(s)
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
