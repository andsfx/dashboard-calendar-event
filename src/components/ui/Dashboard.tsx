import React from 'react';
import { cn } from '../../utils/cn';

export interface DashboardLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DashboardLayout({
  sidebar,
  children,
  className,
  ...props
}: DashboardLayoutProps) {
  return (
    <div className={cn('ui-dashboard-page flex min-h-screen dark:bg-slate-950', className)} {...props}>
      {sidebar && (
        <aside className="hidden w-64 border-r border-[var(--border-subtle)] bg-[var(--brand-card-light)] dark:border-neutral-800/50 dark:bg-neutral-900 md:block">
          {sidebar}
        </aside>
      )}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

export interface DashboardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function DashboardHeader({
  title,
  description,
  actions,
  className,
  ...props
}: DashboardHeaderProps) {
  return (
    <div 
      className={cn(
        'ui-dashboard-chrome flex flex-col items-start justify-between gap-4 border-b p-6 sm:flex-row sm:items-center',
        className
      )}
      {...props}
    >
      <div className="space-y-1">
        <h1 className="h2 font-display">{title}</h1>
        {description && (
          <p className="body-sm text-neutral-600 dark:text-neutral-400">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}

export interface DashboardSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: Array<{
    label: string;
    href: string;
    icon?: React.ReactNode;
    active?: boolean;
  }>;
  logo?: React.ReactNode;
  className?: string;
}

export function DashboardSidebar({
  items,
  logo,
  className,
  ...props
}: DashboardSidebarProps) {
  return (
    <nav 
      className={cn('h-full flex flex-col p-6', className)}
      {...props}
    >
      {logo && (
        <div className="mb-8">
          {logo}
        </div>
      )}

      <div className="space-y-1 flex-1">
        {items.map((item, index) => (
          <a
            key={index}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg body-sm font-medium transition-colors',
              item.active
                ? 'bg-brand-primary-50 text-brand-primary-700 dark:bg-brand-primary-900/30 dark:text-brand-primary-300'
                : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            )}
            aria-current={item.active ? 'page' : undefined}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

export interface DashboardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function DashboardContent({
  className,
  children,
  ...props
}: DashboardContentProps) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export interface DataTableProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  columns: Array<{
    key: keyof T | string;
    header: string;
    render?: (item: T, index: number) => React.ReactNode;
    className?: string;
  }>;
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  className,
  ...props
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg loading-skeleton" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="body-base text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)} {...props}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            {columns.map((col, index) => (
              <th
                key={index}
                className={cn(
                  'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
            >
              {columns.map((col, colIndex) => (
                <td
                  key={colIndex}
                  className={cn(
                    'px-6 py-4 body-sm text-neutral-800 dark:text-neutral-200',
                    col.className
                  )}
                >
                  {col.render
                    ? col.render(item, rowIndex)
                    : String((item as any)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TabItem[];
  defaultValue?: string;
  className?: string;
}

export function Tabs({
  items,
  defaultValue,
  className,
  ...props
}: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultValue || items[0]?.id || '');

  const activeContent = items.find(item => item.id === activeTab)?.content;

  return (
    <div className={cn('space-y-6', className)} {...props}>
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="flex gap-8" role="tablist">
          {items.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={activeTab === item.id}
              aria-controls={`tab-panel-${item.id}`}
              id={`tab-${item.id}`}
              className={cn(
                'py-3 px-1 body-sm font-medium border-b-2 transition-colors',
                activeTab === item.id
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              )}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div
        role="tabpanel"
        id={`tab-panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeContent}
      </div>
    </div>
  );
}

// Note: Uses React.useState directly in the Tabs component above