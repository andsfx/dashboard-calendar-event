import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Kartu panel Pusat Komando. Strukturnya mengikuti Card Corporate Overview
 * (judul, subjudul, aksi, badan), tetapi memakai token `--wf-*` supaya terang
 * identik dengan referensi dan tema gelap admin tetap benar.
 */
export function Card({ children, title, subtitle, actions, className, bodyClassName }: CardProps) {
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <section
      className={`rounded-[var(--radius-card-lg)] border border-[var(--wf-rule)] bg-[var(--wf-board)] shadow-[var(--shadow-card-soft)] ${className ?? ''}`}
    >
      {hasHeader ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--wf-rule)] px-5 py-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-display text-base font-semibold text-[var(--wf-ink)]">{title}</h2>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 text-sm text-[var(--wf-ink-muted)]">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={`px-5 py-4 ${bodyClassName ?? ''}`}>{children}</div>
    </section>
  );
}
