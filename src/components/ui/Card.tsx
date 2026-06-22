import React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'campaign';
  className?: string;
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  className,
  children,
  ...props
}: CardProps) {
  const baseStyles = 'rounded-xl border bg-white dark:bg-neutral-800 transition-all duration-200';

  const variants = {
    default: 'border-neutral-200 dark:border-neutral-700 shadow-sm',
    elevated: 'border-neutral-200 dark:border-neutral-700 shadow-md',
    glass: 'border-neutral-200/50 dark:border-neutral-700/50 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm shadow-sm',
    campaign: 'border-neutral-200/50 dark:border-neutral-700/50 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl shadow-sm',
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('p-6 pb-4', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn('p-6 pt-4', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div className={cn('p-6 pt-4', className)} {...props}>
      {children}
    </div>
  );
}