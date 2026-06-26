'use client';

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { FormItem } from './FormItem';

export type SelectOption = {
  label: string;
  value: string | number;
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  layout?: 'vertical' | 'horizontal';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      required,
      layout = 'vertical',
      id,
      options = [],
      placeholder,
      searchable = false,
      value,
      onChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id ?? props.name;
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const updateCoords = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    // Close when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const isClickInsideTrigger = containerRef.current && containerRef.current.contains(target);
        const isClickInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);
        if (!isClickInsideTrigger && !isClickInsideDropdown) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
      if (isOpen) {
        updateCoords();
      }
    }, [isOpen]);

    useEffect(() => {
      if (!isOpen) return;
      const handleScrollOrResize = () => {
        updateCoords();
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }, [isOpen]);

    const selectedOption = options.find((opt) => String(opt.value) === String(value));

    const filteredOptions = options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      String(opt.value).toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (val: string | number) => {
      if (onChange) {
        // Simulate standard HTMLSelect change event for backward compatibility
        const simulatedEvent = {
          target: {
            value: String(val),
            name: props.name || '',
            id: selectId || '',
          },
          currentTarget: {
            value: String(val),
            name: props.name || '',
            id: selectId || '',
          },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(simulatedEvent);
      }
      setIsOpen(false);
      setSearch('');
    };

    const selectElement = !searchable ? (
      <select
        ref={ref}
        id={selectId}
        disabled={disabled}
        required={required}
        value={value ?? ''}
        onChange={onChange}
        className={cn(
          'h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-subtle)] disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200',
          error && 'border-[var(--error)]',
          className
        )}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : (
      <div ref={containerRef} className="relative w-full">
        {/* Hidden select for React Hook Form integration / standard refs */}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          value={value ?? ''}
          onChange={onChange}
          className="sr-only"
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={cn(
              'h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none transition text-left flex items-center justify-between focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-subtle)] disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200',
              error && 'border-[var(--error)]',
              className
            )}
          >
            <span className={cn('block truncate', !selectedOption && 'text-slate-400')}>
              {selectedOption ? selectedOption.label : (placeholder ?? 'Sélectionner...')}
            </span>
            <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform duration-200', isOpen && 'transform rotate-180')} />
          </button>

          {isOpen && createPortal(
            <div 
              ref={dropdownRef}
              className="fixed z-[100] mt-1 rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg max-h-60 overflow-y-auto"
              style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`
              }}
            >
              <div className="p-2 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)] z-10 flex items-center space-x-2">
                <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  className="w-full text-sm bg-transparent border-none outline-none focus:ring-0 p-0 text-slate-700 dark:text-slate-200"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              
              <div className="py-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500 italic">Aucun résultat</div>
                ) : (
                  filteredOptions.map((option) => (
                    <button
                      key={String(option.value)}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-150 text-slate-700 dark:text-slate-200',
                        String(option.value) === String(value) && 'bg-slate-100 dark:bg-slate-800 text-[var(--primary)] font-medium'
                      )}
                    >
                      {option.label}
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    );

    if (label || error) {
      return (
        <FormItem
          label={label}
          htmlFor={selectId}
          error={error}
          required={required}
          layout={layout}
        >
          {selectElement}
        </FormItem>
      );
    }

    return selectElement;
  }
);

Select.displayName = 'Select';
