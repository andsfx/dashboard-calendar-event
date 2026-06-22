import React from 'react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export function Checkbox({
  label,
  error,
  className,
  ...props
}: CheckboxProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            {...props}
          />
          <div className="h-5 w-5 rounded border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 transition-all peer-checked:bg-brand-primary peer-checked:border-brand-primary peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary peer-focus-visible:ring-offset-2 group-hover:border-brand-primary-400">
            <svg
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
        <span className={cn('text-sm text-neutral-700 dark:text-neutral-300', className)}>
          {label}
        </span>
      </label>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 ml-8">
          {error}
        </p>
      )}
    </div>
  );
}

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export function Radio({
  label,
  error,
  className,
  ...props
}: RadioProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative flex items-center">
          <input
            type="radio"
            className="peer sr-only"
            {...props}
          />
          <div className="h-5 w-5 rounded-full border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 transition-all peer-checked:border-brand-primary peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary peer-focus-visible:ring-offset-2 group-hover:border-brand-primary-400">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-brand-primary opacity-0 peer-checked:opacity-100 transition-opacity"></div>
          </div>
        </div>
        <span className={cn('text-sm text-neutral-700 dark:text-neutral-300', className)}>
          {label}
        </span>
      </label>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 ml-8">
          {error}
        </p>
      )}
    </div>
  );
}