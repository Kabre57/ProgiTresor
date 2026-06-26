import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { FormItem } from './FormItem';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  required?: boolean;
  layout?: 'vertical' | 'horizontal';
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, required, layout = 'vertical', id, ...props }, ref) => {
    const inputId = id ?? props.name;

    const inputElement = (
      <input
        ref={ref}
        id={inputId}
        required={required}
        className={cn(
          'h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-subtle)] disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-[var(--error)]',
          className
        )}
        {...props}
      />
    );

    if (label || error) {
      return (
        <FormItem
          label={label}
          htmlFor={inputId}
          error={error}
          required={required}
          layout={layout}
        >
          {inputElement}
        </FormItem>
      );
    }

    return inputElement;
  }
);

Input.displayName = 'Input';
