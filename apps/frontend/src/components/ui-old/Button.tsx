import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'solid' | 'plain' | 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  clickFeedback?: boolean;
};

const variantClasses: Record<string, string> = {
  // Ecme variants
  solid: 'bg-[var(--primary)] text-white hover:bg-[var(--primary-deep)] shadow-sm dark:text-slate-900 dark:bg-[var(--primary)] dark:hover:bg-[var(--primary-deep)]',
  plain: 'text-[var(--primary)] hover:bg-[var(--primary-subtle)] dark:text-[var(--primary-mild)] dark:hover:bg-slate-800/80',
  default: 'border border-gray-300 bg-white text-gray-700 hover:border-[var(--primary)] hover:text-[var(--primary)] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-white dark:hover:text-white',
  
  // Retrocompatibility maps
  primary: 'bg-[var(--primary)] text-white hover:bg-[var(--primary-deep)] shadow-sm dark:text-slate-900 dark:bg-[var(--primary)]',
  secondary: 'border border-gray-300 bg-white text-gray-700 hover:border-[var(--primary)] hover:text-[var(--primary)] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-white dark:hover:text-white',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-[var(--error)] text-white hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs rounded-lg',
  sm: 'h-8 px-3 text-xs rounded-xl',
  md: 'h-10 px-5 text-sm rounded-xl',
  lg: 'h-12 px-8 text-base rounded-xl',
  icon: 'h-9 w-9 p-0 rounded-xl inline-flex items-center justify-center text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      loading = false,
      clickFeedback = true,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition duration-200 select-none outline-none',
          'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-950',
          variantClasses[variant],
          sizeClasses[size],
          clickFeedback && !disabled && !loading && 'active:scale-[0.97] transform',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Spinner size={size === 'xs' ? 'xs' : 'sm'} /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
