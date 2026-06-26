'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface FormItemProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  className?: string;
  layout?: 'vertical' | 'horizontal';
  children: ReactNode;
}

export function FormItem({
  label,
  htmlFor,
  error,
  required,
  className,
  layout = 'vertical',
  children,
}: FormItemProps) {
  const isHorizontal = layout === 'horizontal';

  return (
    <div
      className={cn(
        'flex',
        isHorizontal ? 'flex-row items-start gap-4' : 'flex-col gap-1.5',
        className
      )}
    >
      {label && (
        <label
          htmlFor={htmlFor}
          className={cn(
            'text-sm font-medium text-slate-700 dark:text-slate-200',
            isHorizontal && 'w-1/3 pt-2 text-right'
          )}
        >
          {label}
          {required && <span className="ml-1 text-red-500 font-bold">*</span>}
        </label>
      )}
      <div className={cn('flex-1 min-w-0', isHorizontal && 'w-2/3')}>
        {children}
        <div
          className={cn(
            'transition-all duration-200 ease-in-out overflow-hidden',
            error ? 'max-h-10 mt-1 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
