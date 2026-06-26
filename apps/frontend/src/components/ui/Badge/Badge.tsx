'use client'

import { forwardRef, type HTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import classNames from 'classnames'
import { Tag, type TagTone } from '../Tag'

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'content'> {
    badgeStyle?: CSSProperties
    content?: string | number
    innerClass?: string
    maxCount?: number
    children?: ReactNode
    tone?: TagTone
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    (props, ref) => {
        const {
            className,
            content,
            maxCount = 99,
            badgeStyle,
            innerClass,
            children,
            tone,
            ...rest
        } = props

        // Determine if Badge is being used as a status Tag (retrocompatibility)
        const isTagUsage =
            tone !== undefined ||
            (content === undefined &&
                (typeof children === 'string' || typeof children === 'number'))

        if (isTagUsage) {
            return (
                <Tag
                    ref={ref as any}
                    tone={tone ?? 'neutral'}
                    className={className}
                    {...(rest as any)}
                >
                    {children}
                </Tag>
            )
        }

        const isDot = content === undefined || content === null

        const badgeBaseClass = classNames(
            'rounded-full text-xs font-semibold bg-error text-white flex items-center justify-center select-none leading-none z-10',
            isDot
                ? 'badge-dot w-3 h-3 border border-white dark:border-gray-900'
                : 'badge px-2 py-1 min-w-6 border border-white dark:border-gray-900',
            innerClass,
        )

        const formattedContent = typeof content === 'number' && content > maxCount
            ? `${maxCount}+`
            : content

        if (children) {
            return (
                <span
                    ref={ref}
                    className={classNames('badge-wrapper relative flex', className)}
                    {...rest}
                >
                    <span
                        className={classNames(badgeBaseClass, 'badge-inner')}
                        style={badgeStyle}
                    >
                        {!isDot && formattedContent}
                    </span>
                    {children}
                </span>
            )
        }

        return (
            <span
                ref={ref}
                className={classNames(badgeBaseClass, className)}
                style={badgeStyle}
                {...rest}
            >
                {!isDot && formattedContent}
            </span>
        )
    }
)

Badge.displayName = 'Badge'

export default Badge
