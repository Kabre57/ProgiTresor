import { forwardRef } from 'react'
import BaseButton from './Button'
import type { ButtonProps as BaseButtonProps } from './Button'
import classNames from 'classnames'

export type ButtonVariant = 'solid' | 'plain' | 'default' | 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends Omit<BaseButtonProps, 'variant' | 'size'> {
    variant?: ButtonVariant
    size?: ButtonSize
}

export const Button = (
    { variant = 'default', size, className, ...props }: ButtonProps
) => {
        let mappedVariant: 'solid' | 'plain' | 'default' = 'default'
        let extraClass = ''

        if (variant === 'solid') {
            mappedVariant = 'solid'
        } else if (variant === 'plain') {
            mappedVariant = 'plain'
        } else if (variant === 'default') {
            mappedVariant = 'default'
        } else if (variant === 'primary') {
            mappedVariant = 'solid'
        } else if (variant === 'secondary') {
            mappedVariant = 'default'
        } else if (variant === 'ghost') {
            mappedVariant = 'plain'
            extraClass = 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        } else if (variant === 'danger') {
            mappedVariant = 'solid'
            extraClass = 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-red-600 dark:bg-red-600 dark:hover:bg-red-700 dark:active:bg-red-800'
        }

        let mappedSize: any = size
        if (size === 'icon') {
            mappedSize = undefined
            extraClass = classNames(extraClass, 'p-0 inline-flex items-center justify-center')
        }

        return (
            <BaseButton
                variant={mappedVariant}
                size={mappedSize}
                className={classNames(extraClass, className)}
                {...props}
            />
        )
    }

Button.displayName = 'Button'

export default Button
