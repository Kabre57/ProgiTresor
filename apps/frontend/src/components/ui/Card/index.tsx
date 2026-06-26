'use client'

import Card from './Card'
import classNames from 'classnames'
import type { HTMLAttributes } from 'react'

export type { CardProps } from './Card'
export { Card }

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={classNames(
        'card-header flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4',
        className
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={classNames(
        'text-sm font-semibold text-slate-900 dark:text-white',
        className
      )}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classNames('card-body p-6', className)} {...props} />
}

export default Card
