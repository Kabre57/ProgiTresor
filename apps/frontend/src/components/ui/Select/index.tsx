import { forwardRef } from 'react'
import BaseSelect from './Select'
import type { SelectProps as BaseSelectProps } from './Select'
import Option from './Option'
import classNames from 'classnames'

type SelectOption = {
    label: string
    value: string | number
}

export interface SelectProps extends Omit<BaseSelectProps<any, any, any>, 'value' | 'onChange' | 'options'> {
    value?: any
    onChange?: (val: any) => void
    options?: any
    label?: string
    error?: string
    required?: boolean
    layout?: 'vertical' | 'horizontal'
    searchable?: boolean
}

export const Select = ({ value, onChange, options, label, error, required, layout = 'vertical', id, searchable, isSearchable, ...props }: SelectProps) => {
        const isStringValue = typeof value === 'string' || typeof value === 'number'
        const inputId = id ?? (props.name || '')
        const isHorizontal = layout === 'horizontal'

        let mappedValue = value
        let mappedOnChange = onChange

        if (isStringValue && options) {
            mappedValue = options.find((opt: any) => String(opt.value) === String(value)) || null
            
            mappedOnChange = (option: any) => {
                if (onChange) {
                    const fakeEvent = {
                        target: {
                            value: option ? option.value : '',
                            name: props.name || ''
                        }
                    }
                    onChange(fakeEvent)
                }
            }
        }

        const selectElement = (
            <BaseSelect
                value={mappedValue}
                onChange={mappedOnChange}
                options={options}
                invalid={!!error || props.invalid}
                isSearchable={isSearchable ?? searchable}
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
                        {selectElement}
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

        return selectElement
    }

Select.displayName = 'Select'

export { Option }
export default Select
