import React from 'react';
import { cn } from '../../utils/cn';

export interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  className,
  ...props
}: FeatureCardProps) {
  return (
    <div 
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 transition-all duration-300 hover:shadow-lg hover:border-brand-primary/50 dark:hover:border-brand-primary/50',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary-50 dark:bg-brand-primary-900/20 text-brand-primary dark:text-brand-primary-400 transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      )}
      <h3 className="h4 font-display mb-2">{title}</h3>
      <p className="body-base text-neutral-600 dark:text-neutral-400">{description}</p>
    </div>
  );
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendValue,
  className,
  ...props
}: StatCardProps) {
  const trendColors = {
    up: 'text-emerald-500',
    down: 'text-red-500',
    neutral: 'text-neutral-500',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div 
      className={cn(
        'rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 transition-all duration-300 hover:shadow-md',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between mb-4">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary-50 dark:bg-brand-primary-900/20 text-brand-primary dark:text-brand-primary-400">
            {icon}
          </div>
        )}
        {trend && trendValue && (
          <div className={cn('flex items-center gap-1 body-xs font-medium', trendColors[trend])}>
            <span>{trendIcons[trend]}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="display-4 font-display tabular-nums">{value}</div>
        <div className="body-sm text-neutral-500 dark:text-neutral-400">{label}</div>
      </div>
    </div>
  );
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQAccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  items: FAQItem[];
  className?: string;
}

export function FAQAccordion({ items, className, ...props }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className={cn('space-y-4', className)} {...props}>
      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden transition-all duration-300"
        >
          <button
            className="w-full flex items-center justify-between p-6 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
            onClick={() => toggleItem(index)}
            aria-expanded={openIndex === index}
          >
            <h3 className="h5 font-display pr-8">{item.question}</h3>
            <div className="flex-shrink-0">
              <svg
                className={cn(
                  'h-6 w-6 text-neutral-500 transition-transform duration-300',
                  openIndex === index && 'rotate-180'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          <div
            className={cn(
              'overflow-hidden transition-all duration-300',
              openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="px-6 pb-6">
              <p className="body-base text-neutral-600 dark:text-neutral-400">
                {item.answer}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Note: Uses React.useState directly in the FAQAccordion component above