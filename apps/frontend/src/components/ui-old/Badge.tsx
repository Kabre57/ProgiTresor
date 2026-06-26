import { forwardRef, type HTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Tag, type TagTone } from './Tag';

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'content'> {
  content?: string | number;
  maxCount?: number;
  badgeStyle?: CSSProperties;
  innerClass?: string;
  children?: ReactNode;
  tone?: TagTone;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      content,
      maxCount = 99,
      badgeStyle,
      innerClass,
      children,
      tone,
      ...rest
    },
    ref
  ) => {
    // Determine if Badge is being used as a status Tag (retrocompatibility)
    const isTagUsage =
      tone !== undefined ||
      (content === undefined &&
        (typeof children === 'string' || typeof children === 'number'));

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
      );
    }

    const isDot = content === undefined || content === null;

    const badgeBaseClass = cn(
      'rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center select-none leading-none z-10',
      isDot 
        ? 'h-2 w-2 border border-white dark:border-gray-800' 
        : 'h-4 min-w-4 px-1 border border-white dark:border-gray-800',
      innerClass
    );

    const formattedContent = typeof content === 'number' && content > maxCount 
      ? `${maxCount}+` 
      : content;

    if (children) {
      return (
        <span
          ref={ref}
          className={cn('relative inline-flex items-center', className)}
          {...rest}
        >
          <span
            className={cn(badgeBaseClass, 'absolute -top-1 -right-1')}
            style={badgeStyle}
          >
            {!isDot && formattedContent}
          </span>
          {children}
        </span>
      );
    }

    return (
      <span
        ref={ref}
        className={cn(badgeBaseClass, className)}
        style={badgeStyle}
        {...rest}
      >
        {!isDot && formattedContent}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
