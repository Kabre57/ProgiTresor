import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardHeaderConfig {
  content?: ReactNode;
  extra?: ReactNode;
  bordered?: boolean;
  className?: string;
}

export interface CardFooterConfig {
  content?: ReactNode;
  bordered?: boolean;
  className?: string;
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  bodyClass?: string;
  clickable?: boolean;
  bordered?: boolean;
  header?: CardHeaderConfig;
  footer?: CardFooterConfig;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      bodyClass,
      children,
      clickable = false,
      bordered = true,
      header,
      footer,
      onClick,
      ...props
    },
    ref
  ) => {
    const cardClass = cn(
      'card overflow-hidden rounded-2xl bg-white dark:bg-gray-800 transition-all duration-200',
      bordered 
        ? 'border border-gray-200 dark:border-gray-800' 
        : 'shadow-xl dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
      clickable && 'cursor-pointer select-none hover:shadow-lg dark:hover:shadow-black/30 hover:scale-[1.005] transform',
      className
    );

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (clickable && onClick) {
        onClick(e);
      }
    };

    return (
      <div
        ref={ref}
        className={cardClass}
        onClick={handleCardClick}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        {...props}
      >
        {header?.content && (
          <div
            className={cn(
              'card-header flex items-center justify-between py-4 px-6',
              (header.bordered ?? true) && 'border-b border-gray-200 dark:border-gray-700',
              header.className
            )}
          >
            <div className="font-semibold text-slate-900 dark:text-white">
              {typeof header.content === 'string' ? (
                <h4 className="text-base font-bold">{header.content}</h4>
              ) : (
                header.content
              )}
            </div>
            {header.extra && <div className="text-sm">{header.extra}</div>}
          </div>
        )}

        <div className={cn('card-body p-6', bodyClass)}>{children}</div>

        {footer?.content && (
          <div
            className={cn(
              'card-footer py-4 px-6',
              (footer.bordered ?? true) && 'border-t border-gray-200 dark:border-gray-700',
              footer.className
            )}
          >
            {footer.content}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ─── Retrocompatibility Components ───

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'card-header flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4',
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'text-sm font-semibold text-slate-900 dark:text-white',
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card-body p-6', className)} {...props} />;
}
