'use client';

import { cn } from '@/lib/utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-slate-200 dark:bg-slate-700',
        className
      )}
    />
  );
}

interface TableRowSkeletonProps {
  columnsCount: number;
  rowsCount?: number;
}

export function TableRowSkeleton({
  columnsCount,
  rowsCount = 5,
}: TableRowSkeletonProps) {
  return (
    <>
      {Array.from({ length: rowsCount }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-[var(--border)]">
          {Array.from({ length: columnsCount }).map((__, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <Skeleton
                className={cn(
                  'h-4 w-full',
                  colIndex === 0 && 'w-3/4',
                  colIndex === columnsCount - 1 && 'w-1/2'
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
