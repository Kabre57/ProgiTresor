'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Pagination } from './Pagination';
import { TableRowSkeleton } from './Skeleton';

export type DataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T, index: number) => string | number;
  emptyLabel?: string;
  loading?: boolean;
  pagination?: {
    currentPage: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  sorting?: {
    sortBy: string | null;
    sortOrder: 'asc' | 'desc' | null;
    onSortChange: (key: string | null, order: 'asc' | 'desc' | null) => void;
  };
};

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyLabel = 'Aucune donnée trouvée',
  loading = false,
  pagination,
  sorting,
}: DataTableProps<T>) {
  const [localSortKey, setLocalSortKey] = useState<string | null>(null);
  const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc' | null>(null);

  const sortKey = sorting ? sorting.sortBy : localSortKey;
  const sortDirection = sorting ? sorting.sortOrder : localSortDirection;

  const handleSort = (key: string) => {
    if (sorting) {
      if (sortKey === key) {
        if (sortDirection === 'asc') {
          sorting.onSortChange(key, 'desc');
        } else if (sortDirection === 'desc') {
          sorting.onSortChange(null, null);
        }
      } else {
        sorting.onSortChange(key, 'asc');
      }
      return;
    }

    if (localSortKey === key) {
      if (localSortDirection === 'asc') {
        setLocalSortDirection('desc');
      } else if (localSortDirection === 'desc') {
        setLocalSortKey(null);
        setLocalSortDirection(null);
      }
    } else {
      setLocalSortKey(key);
      setLocalSortDirection('asc');
    }
  };

  const processedData = useMemo(() => {
    if (sorting) return data;
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      let valA = (a as any)[sortKey];
      let valB = (b as any)[sortKey];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDirection, sorting]);

  return (
    <div className="table-default-container overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800 relative">
      {/* Loading overlay for data update */}
      {loading && data.length > 0 && (
        <div className="absolute inset-0 bg-slate-200/20 dark:bg-slate-900/20 backdrop-blur-[1px] z-20 flex items-center justify-center transition-opacity duration-200">
          <div className="flex items-center space-x-2 rounded-full bg-white dark:bg-slate-800 px-4 py-2 shadow-md border border-gray-200 dark:border-gray-700">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mise à jour...</span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table-default min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/60">
            <tr>
              {columns.map((column) => {
                const isSorted = sortKey === column.key;
                const canSort = column.sortable;

                return (
                  <th
                    key={column.key}
                    onClick={() => canSort && handleSort(column.key)}
                    className={cn(
                      'whitespace-nowrap px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none transition-colors',
                      canSort && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80',
                      column.className
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{column.header}</span>
                      {canSort && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5 text-[var(--primary)]" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-[var(--primary)]" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 hover:opacity-100 transition-opacity" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading && data.length === 0 ? (
              <TableRowSkeleton columnsCount={columns.length} rowsCount={5} />
            ) : processedData.length === 0 ? (
              <tr>
                <td className="px-6 py-12" colSpan={columns.length}>
                  {/* FileNotFound Ecme representation */}
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600">
                      <FileWarning className="h-8 w-8" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-slate-900 dark:text-white">Aucun résultat</h5>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{emptyLabel}</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              processedData.map((row, index) => (
                <tr key={getRowKey(row, index)} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-150">
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-6 py-3.5 text-slate-700 dark:text-slate-200">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalCount > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalCount={pagination.totalCount}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          className="border-t border-gray-200 dark:border-gray-800"
        />
      )}
    </div>
  );
}
