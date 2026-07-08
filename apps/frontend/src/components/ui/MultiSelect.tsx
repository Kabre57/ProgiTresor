'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { FormItem } from './FormItem';
import { Badge } from './Badge';

export type MultiSelectOption = {
  label: string;
  value: string | number;
};

export interface MultiSelectProps {
  label?: string;
  error?: string;
  options: MultiSelectOption[];
  placeholder?: string;
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  disabled?: boolean;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  error,
  options = [],
  placeholder = 'Sélectionner...',
  value = [],
  onChange,
  disabled = false,
  className,
}) => {
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
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  };

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

  const handleToggleOption = (optValue: string | number) => {
    const stringifiedValue = String(optValue);
    const isSelected = value.map(String).includes(stringifiedValue);
    
    let newValue: (string | number)[];
    if (isSelected) {
      newValue = value.filter((v) => String(v) !== stringifiedValue);
    } else {
      // Keep original type if option is number
      const originalOpt = options.find(o => String(o.value) === stringifiedValue);
      const valToAdd = originalOpt ? originalOpt.value : optValue;
      newValue = [...value, valToAdd];
    }
    onChange(newValue);
  };

  const handleRemoveOption = (e: React.MouseEvent, optValue: string | number) => {
    e.stopPropagation();
    onChange(value.filter((v) => String(v) !== String(optValue)));
  };

  const selectedOptions = options.filter((opt) => value.map(String).includes(String(opt.value)));

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    String(opt.value).toLowerCase().includes(search.toLowerCase())
  );

  const selectElement = (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'min-h-[40px] py-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none transition text-left flex items-center justify-between focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-subtle)] disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200',
            error && 'border-[var(--error)]',
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center max-w-[90%]">
            {selectedOptions.length === 0 ? (
              <span className="text-slate-400">{placeholder}</span>
            ) : (
              selectedOptions.map((opt) => (
                <Badge
                  key={String(opt.value)}
                  tone="info"
                  className="flex items-center gap-1 py-0.5 px-1.5 text-xs font-normal"
                >
                  <span className="truncate max-w-[120px]">{opt.label}</span>
                  {!disabled && (
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-500 rounded-full"
                      onClick={(e) => handleRemoveOption(e, opt.value)}
                    />
                  )}
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2', isOpen && 'transform rotate-180')} />
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
                filteredOptions.map((option) => {
                  const isSelected = value.map(String).includes(String(option.value));
                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      onClick={() => handleToggleOption(option.value)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-150 text-slate-700 dark:text-slate-200 flex items-center justify-between',
                        isSelected && 'bg-slate-100 dark:bg-slate-800 text-[var(--primary)] font-medium'
                      )}
                    >
                      <span className="pr-4">{option.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-[var(--primary)] flex-shrink-0" />}
                    </button>
                  );
                })
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
        error={error}
      >
        {selectElement}
      </FormItem>
    );
  }

  return selectElement;
};
