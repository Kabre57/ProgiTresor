import BaseDialog from './Dialog'
import type { DialogProps as BaseDialogProps } from './Dialog'
import type { ReactNode } from 'react'

export interface DialogProps extends Omit<BaseDialogProps, 'isOpen'> {
    open?: boolean
    isOpen?: boolean
    title?: ReactNode
}

export const Dialog = ({ open, isOpen, title, children, ...props }: DialogProps) => {
    const content = (
        <>
            {title && (
                <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                    {typeof title === 'string' ? (
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                            {title}
                        </h3>
                    ) : (
                        title
                    )}
                </div>
            )}
            {children}
        </>
    )

    return (
        <BaseDialog isOpen={isOpen ?? open ?? false} {...props}>
            {content}
        </BaseDialog>
    )
}

export default Dialog
