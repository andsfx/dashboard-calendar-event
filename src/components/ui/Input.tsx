import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className,
  ...props
}: InputProps) {
  const baseStyles = 'w-full px-4 py-3 rounded-xl border bg-white dark:bg-neutral-800 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const errorStyles = error 
    ? 'border-red-500 dark:border-red-700' 
    : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500';

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <input
        className={cn(baseStyles, errorStyles, className)}
        {...props}
      />
      {(error || helperText) && (
        <p className={cn(
          'text-xs',
          error 
            ? 'text-red-600 dark:text-red-400' 
            : 'text-neutral-500 dark:text-neutral-400'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({
  label,
  error,
  helperText,
  className,
  ...props
}: TextareaProps) {
  const baseStyles = 'w-full px-4 py-3 rounded-xl border bg-white dark:bg-neutral-800 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed resize-none';

  const errorStyles = error 
    ? 'border-red-500 dark:border-red-700' 
    : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500';

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <textarea
        className={cn(baseStyles, errorStyles, className)}
        {...props}
      />
      {(error || helperText) && (
        <p className={cn(
          'text-xs',
          error 
            ? 'text-red-600 dark:text-red-400' 
            : 'text-neutral-500 dark:text-neutral-400'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}