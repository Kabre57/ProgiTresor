'use client';

import { cn } from '@/lib/utils/cn';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  indicatorClassName?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
};

export function Spinner({
  size = 'sm',
  className,
  indicatorClassName,
}: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-slate-200 dark:border-slate-800 border-t-transparent dark:border-t-transparent',
        sizeClasses[size],
        className
      )}
      style={{
        borderTopColor: 'currentColor',
      }}
      role="status"
      aria-label="Chargement"
    >
      <span className="sr-only">Chargement...</span>
    </div>
  );
}
