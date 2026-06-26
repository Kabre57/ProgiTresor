'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type DialogProps = {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: number | string;
  closable?: boolean;
  contentClassName?: string;
  className?: string;
};

export function Dialog({
  open,
  title,
  children,
  onClose,
  width = 520,
  closable = true,
  contentClassName,
  className,
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closable) onClose();
    },
    [closable, onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current && closable) onClose();
  };

  if (!open) return null;

  const widthStyle = typeof width === 'number' ? `${width}px` : width;

  const dialog = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center px-4 py-12',
        'bg-slate-950/50 backdrop-blur-sm',
        'animate-[fadeIn_150ms_ease-out]',
        className,
      )}
    >
      <div
        className={cn(
          'relative w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl',
          'max-h-[calc(100vh-6rem)]',
          'animate-[scaleIn_200ms_ease-out]',
          contentClassName,
        )}
        style={{ maxWidth: widthStyle }}
      >
        {(title || closable) && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4">
            {title && (
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            )}
            {closable && (
              <button
                type="button"
                onClick={onClose}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(dialog, document.body);
}

/**
 * @deprecated Use Dialog instead. This alias exists for backward compatibility.
 */
export const Modal = Dialog;
