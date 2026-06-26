import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { FormItem } from './FormItem';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  required?: boolean;
  layout?: 'vertical' | 'horizontal';
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, required, layout = 'vertical', id, ...props }, ref) => {
    const textareaId = id ?? props.name;

    const textareaElement = (
      <textarea
        ref={ref}
        id={textareaId}
        required={required}
        className={cn(
          'min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-subtle)] disabled:opacity-50 disabled:cursor-not-allowed',
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
          htmlFor={textareaId}
          error={error}
          required={required}
          layout={layout}
        >
          {textareaElement}
        </FormItem>
      );
    }

    return textareaElement;
  }
);

Textarea.displayName = 'Textarea';
