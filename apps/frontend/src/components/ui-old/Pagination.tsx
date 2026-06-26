'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  const getPages = () => {
    const pages: (number | string)[] = [];
    const siblingCount = 1;

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, idx) => idx + 1);
      return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from({ length: rightItemCount }, (_, idx) => totalPages - rightItemCount + idx + 1);
      return [1, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, idx) => leftSiblingIndex + idx);
      return [1, '...', ...middleRange, '...', totalPages];
    }

    return pages;
  };

  if (totalCount === 0) return null;

  const pages = getPages();
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-4 bg-[var(--surface)] border-t border-[var(--border)]', className)}>
      <div className="flex items-center space-x-2 text-xs text-slate-500">
        <span>Affichage de <span className="font-semibold text-slate-750 dark:text-slate-200">{start}</span> à <span className="font-semibold text-slate-750 dark:text-slate-200">{end}</span> sur <span className="font-semibold text-slate-750 dark:text-slate-200">{totalCount}</span> éléments</span>
        {onPageSizeChange && (
          <>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>Par page :</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-xs outline-none focus:border-[var(--primary)] text-slate-700 dark:text-slate-200"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center space-x-1" aria-label="Pagination">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="flex h-8 w-8 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface)] text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition duration-150"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pages.map((page, idx) => {
            if (page === '...') {
              return (
                <span
                  key={`dots-${idx}`}
                  className="flex h-8 w-8 items-center justify-center text-slate-400 text-sm animate-pulse"
                >
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded border text-sm font-medium transition duration-150',
                  pageNum === currentPage
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-white font-semibold'
                    : 'border-[var(--border)] bg-[var(--surface)] text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="flex h-8 w-8 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface)] text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition duration-150"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
