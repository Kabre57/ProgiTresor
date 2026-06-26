'use client';

import { AlertTriangle, Info, CheckCircle, XOctagon } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

type ConfirmType = 'info' | 'success' | 'warning' | 'danger';

type ConfirmDialogProps = {
  open: boolean;
  type?: ConfirmType;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const iconMap: Record<ConfirmType, React.ReactNode> = {
  info: <Info className="h-6 w-6 text-blue-500" />,
  success: <CheckCircle className="h-6 w-6 text-emerald-500" />,
  warning: <AlertTriangle className="h-6 w-6 text-amber-500" />,
  danger: <XOctagon className="h-6 w-6 text-red-500" />,
};

const iconBg: Record<ConfirmType, string> = {
  info: 'bg-blue-100 dark:bg-blue-500/20',
  success: 'bg-emerald-100 dark:bg-emerald-500/20',
  warning: 'bg-amber-100 dark:bg-amber-500/20',
  danger: 'bg-red-100 dark:bg-red-500/20',
};

export function ConfirmDialog({
  open,
  type = 'warning',
  title,
  children,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} width={420} closable={false}>
      <div className="flex gap-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            iconBg[type],
          )}
        >
          {iconMap[type]}
        </div>
        <div className="min-w-0">
          <h4 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">{title}</h4>
          <div className="text-sm text-slate-600 dark:text-slate-300">{children}</div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={confirmLoading}>
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={type === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={confirmLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Dialog>
  );
}
