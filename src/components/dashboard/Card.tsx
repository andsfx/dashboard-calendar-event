import type { ReactNode } from 'react';
import { Card as ShadcnCard, CardContent, CardDescription, CardHeader, CardTitle } from '../shadcn/card';

export interface CardProps {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Kartu panel admin: judul, subjudul, aksi, badan.
 *
 * Geometrinya mengikuti kontrak admin, bukan set token publik: radius papan
 * 12px (`--wf-radius-board`) dan **tanpa** bayangan. Kontrak wayfinding
 * menetapkan "satu elevasi per elemen — garis rambut ATAU bayangan, tidak
 * keduanya"; kartu ini sudah membawa garis rambut (`--wf-rule`), jadi
 * menambahkan `--shadow-card-soft` (token set publik) membuatnya berbeda dari
 * setiap panel lain di halaman yang sama — `.wf-metric`, `.wf-register`, dan
 * `.wf-plate` semuanya 12px tanpa bayangan. Karena itu primitive shadcn
 * (`rounded-xl` + `ring-1` + padding sendiri + `gap-(--card-spacing)`)
 * ditaklukkan dengan sufiks `!`, bukan diwarisi: geometri di atas adalah
 * kontrak, bukan default library.
 *
 * Adapter tipis: prop API tidak berubah, jadi pemanggil
 * (`dashboard/EventInsightsPanel.tsx`) tidak perlu disesuaikan.
 */
export function Card({ children, title, subtitle, actions, className, bodyClassName }: CardProps) {
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <ShadcnCard
      className={`gap-0! overflow-visible! rounded-[var(--wf-radius-board)]! py-0! text-[1em]! ring-0! shadow-none! border border-[var(--wf-rule)] bg-[var(--wf-board)]! ${className ?? ''}`}
    >
      {hasHeader ? (
        <CardHeader className="flex! flex-wrap! items-start! justify-between! gap-3! rounded-none! border-b border-[var(--wf-rule)] px-5! py-4!">
          <div className="min-w-0">
            {title ? (
              // CardTitle shadcn merender `<div>`; peran judul tetap dipertahankan
              // agar struktur heading panel ini tidak hilang bagi AT.
              <CardTitle
                role="heading"
                aria-level={2}
                className="font-display! leading-6! font-semibold! text-base! text-[var(--wf-ink)]!"
              >
                {title}
              </CardTitle>
            ) : null}
            {subtitle ? (
              <CardDescription className="mt-0.5! text-sm! text-[var(--wf-ink-muted)]!">{subtitle}</CardDescription>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={`px-5! py-4! ${bodyClassName ?? ''}`}>{children}</CardContent>
    </ShadcnCard>
  );
}
