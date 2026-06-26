'use client'

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import classNames from 'classnames'

export type TagTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface TagProps extends Omit<HTMLAttributes<HTMLDivElement>, 'prefix' | 'suffix'> {
  tone?: TagTone
  prefix?: boolean | ReactNode
  suffix?: boolean | ReactNode
  prefixClass?: string
  suffixClass?: string
}

const toneClasses: Record<TagTone, string> = {
  neutral: 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200',
  success: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400',
  info: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400',
}

export const Tag = forwardRef<HTMLDivElement, TagProps>(
  (
    {
      className,
      children,
      tone = 'neutral',
      prefix,
      suffix,
      prefixClass,
      suffixClass,
      ...rest
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={classNames(
          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold select-none leading-none w-max transition-colors',
          toneClasses[tone],
          className
        )}
        {...rest}
      >
        {prefix && typeof prefix === 'boolean' && (
          <span
            className={classNames('h-1.5 w-1.5 rounded-full bg-current', prefixClass)}
          />
        )}
        {prefix && typeof prefix !== 'boolean' && (
          <span className={classNames('flex items-center shrink-0', prefixClass)}>{prefix}</span>
        )}

        <span>{children}</span>

        {suffix && typeof suffix === 'boolean' && (
          <span
            className={classNames('h-1.5 w-1.5 rounded-full bg-current', suffixClass)}
          />
        )}
        {suffix && typeof suffix !== 'boolean' && (
          <span className={classNames('flex items-center shrink-0', suffixClass)}>{suffix}</span>
        )}
      </div>
    )
  }
)

Tag.displayName = 'Tag'

export default Tag
