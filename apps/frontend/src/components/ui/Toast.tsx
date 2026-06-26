'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/* ─── Types ─── */

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
}

interface ToastContextValue {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

/* ─── Context ─── */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

/* ─── Icons ─── */

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

const bgColors: Record<ToastType, string> = {
  success: 'border-emerald-200 dark:border-emerald-800',
  error: 'border-red-200 dark:border-red-800',
  warning: 'border-amber-200 dark:border-amber-800',
  info: 'border-blue-200 dark:border-blue-800',
};

/* ─── Single Toast ─── */

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(item.id), 200);
  }, [item.id, onDismiss]);

  // Auto-dismiss
  useState(() => {
    if (item.duration > 0) {
      const timer = setTimeout(dismiss, item.duration);
      return () => clearTimeout(timer);
    }
  });

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-80 items-start gap-3 rounded-lg border bg-[var(--surface)] p-4 shadow-lg',
        bgColors[item.type],
        exiting
          ? 'animate-[slideOut_200ms_ease-in_forwards]'
          : 'animate-[slideIn_250ms_ease-out]',
      )}
      role="alert"
    >
      <div className="mt-0.5 shrink-0">{icons[item.type]}</div>
      <div className="min-w-0 flex-1">
        {item.title && (
          <div className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
            {item.title}
          </div>
        )}
        <div className="text-sm text-slate-600 dark:text-slate-300">{item.message}</div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded p-0.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Provider ─── */

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const push = useCallback((type: ToastType, message: string, title?: string, duration = 4000) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message, title, duration }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const api: ToastContextValue = {
    success: (msg, title) => push('success', msg, title),
    error: (msg, title) => push('error', msg, title),
    warning: (msg, title) => push('warning', msg, title),
    info: (msg, title) => push('info', msg, title),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed right-4 top-4 z-[9999] flex flex-col gap-3">
            {toasts.map((item) => (
              <ToastCard key={item.id} item={item} onDismiss={dismiss} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
