import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Badge({
  variant = 'default',
  size = 'md',
  children,
  className,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center gap-1 font-semibold rounded-full transition-colors';

  const variants = {
    default: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    primary: 'bg-brand-primary-50 text-brand-primary-700 dark:bg-brand-primary-900/30 dark:text-brand-primary-300',
    secondary: 'bg-brand-secondary-50 text-brand-secondary-700 dark:bg-brand-secondary-900/30 dark:text-brand-secondary-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}

export interface StatusDotProps {
  status: 'live' | 'upcoming' | 'completed' | 'cancelled';
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  const statusColors = {
    live: 'bg-emerald-500 shadow-emerald-500/50',
    upcoming: 'bg-blue-500 shadow-blue-500/50',
    completed: 'bg-neutral-400',
    cancelled: 'bg-red-500',
  };

  const isLive = status === 'live';

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      {isLive && (
        <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', statusColors[status])} />
      )}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', statusColors[status], isLive && 'shadow-lg')} />
    </span>
  );
}