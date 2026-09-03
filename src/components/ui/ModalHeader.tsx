import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ModalChromeHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Lucide (or any) icon node — rendered white on solid tosca box */
  icon?: React.ReactNode;
  titleId?: string;
  onClose?: () => void;
  closeDisabled?: boolean;
  closeAriaLabel?: string;
  /** Optional control before icon (e.g. back) */
  leading?: React.ReactNode;
  className?: string;
}

/**
 * Shared admin modal chrome: solid tosca icon, title, subtitle, close.
 * DESIGN.md: no multi-stop brand gradients on admin chrome — solid fill only.
 */
export function ModalHeader({
  title,
  subtitle,
  icon,
  titleId,
  onClose,
  closeDisabled = false,
  closeAriaLabel = 'Tutup',
  leading,
  className,
}: ModalChromeHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 dark:border-slate-700',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        {icon != null && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary-600">
            <span className="[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-white">{icon}</span>
          </div>
        )}
        <div className="min-w-0">
          <p
            id={titleId}
            className="truncate font-bold text-slate-800 dark:text-white"
          >
            {title}
          </p>
          {subtitle != null && subtitle !== '' && (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label={closeAriaLabel}
          className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
