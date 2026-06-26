import BaseInput from './Input'
import type { InputProps as BaseInputProps } from './Input'
import classNames from 'classnames'

export type InputProps = BaseInputProps & {
  label?: string
  error?: string
  required?: boolean
  layout?: 'vertical' | 'horizontal'
}

export const Input = ({ className, label, error, required, layout = 'vertical', id, ...props }: InputProps) => {
    const inputId = id ?? (props.name || '')
    const isHorizontal = layout === 'horizontal'

    const inputElement = (
      <BaseInput
        id={inputId}
        invalid={!!error || props.invalid}
        className={className}
        {...props}
      />
    )

    if (label || error) {
      return (
        <div
          className={classNames(
            'flex',
            isHorizontal ? 'flex-row items-start gap-4' : 'flex-col gap-1.5'
          )}
        >
          {label && (
            <label
              htmlFor={inputId}
              className={classNames(
                'text-sm font-medium text-slate-700 dark:text-slate-200',
                isHorizontal && 'w-1/3 pt-2 text-right'
              )}
            >
              {label}
              {required && <span className="ml-1 text-red-500 font-bold">*</span>}
            </label>
          )}
          <div className={classNames('flex-1 min-w-0', isHorizontal && 'w-2/3')}>
            {inputElement}
            <div
              className={classNames(
                'transition-all duration-200 ease-in-out overflow-hidden',
                error ? 'max-h-10 mt-1 opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      )
    }

    return inputElement
}

Input.displayName = 'Input'

export type { BaseInputProps }
export default Input
