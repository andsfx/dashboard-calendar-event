import { ElementType, HTMLAttributes, ReactNode } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

type RevealSectionProps<T extends ElementType = 'section'> = {
  as?: T;
  children: ReactNode;
  className?: string;
  intensity?: 'default' | 'strong';
  variant?: 'dark-tosca';
  skeleton?: ReactNode;
  isLoading?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>;

/** Fast community reveal — useScrollReveal + motion.css (Path A). */
export function RevealSection<T extends ElementType = 'section'>({
  as,
  children,
  className = '',
  intensity = 'default',
  variant,
  skeleton,
  isLoading = false,
  ...rest
}: RevealSectionProps<T>) {
  const { ref, isVisible } = useScrollReveal();
  const Tag = as ?? 'section';

  const isDark = variant === 'dark-tosca';
  const variantClass = isDark ? 'relative isolate overflow-hidden text-white' : '';
  const contentClass = isDark ? 'relative z-10 [&_h2]:text-white [&_.ui-text-secondary]:text-white/70 [&_.ui-text-muted]:text-white/60' : '';

  return (
    <Tag
      ref={ref as never}
      className={`reveal-on-scroll ${intensity === 'strong' ? 'reveal-strong' : ''} ${isVisible ? 'reveal-visible' : ''} ${variantClass} ${className}`}
      {...rest}
    >
      {isDark && (
        <>
          <div aria-hidden="true" className="absolute inset-0 z-0 bg-gradient-reasoning-tosca" />
          <div aria-hidden="true" className="site-grain absolute inset-0 z-[1]" />
        </>
      )}
      <div className={`reveal-stage ${contentClass}`}>{isLoading && skeleton ? skeleton : children}</div>
    </Tag>
  );
}

type CommunityEyebrowProps = {
  children: ReactNode;
  className?: string;
  /** Di atas permukaan gelap (mis. `variant="dark-tosca"`), pakai tone terang. */
  light?: boolean;
};

/* Eyebrow tunggal untuk repo: `text-[11px]`, `tracking-[0.3em]`, tosca-700.
 *
 * Sebelumnya komponen ini memakai `--brand-tosca-dark` sementara `.ui-eyebrow`
 * (typography.css) dan `eyebrow()` (PublicShared.tsx) memakai
 * `brand-primary-700`. Satu peran, tiga nada. Sekarang semuanya ke
 * `brand-primary-700` (6.71:1 di kertas, 7.01:1 di kartu hangat — lolos AA) dan
 * `brand-primary-400` di gelap (8.95:1 di slate-950).
 *
 * `light` untuk permukaan gelap: menggantikan override ad-hoc yang saling
 * berebut urutan di stylesheet, bukan urutan atribut.
 *
 * CATATAN DESAIN: eyebrow di atas heading sudah dihapus dari seluruh section
 * landing `/` pada 2026-09-24 (craft floor: kicker-above-heading adalah larangan,
 * bukan default). Komponen ini tetap dipakai di luar landing — `/events`,
 * `/sponsor` — sehingga belum bisa dihapus. */
export function CommunityEyebrow({ children, className = 'text-[11px]', light = false }: CommunityEyebrowProps) {
  const tone = light
    ? 'text-white/80'
    : 'text-brand-primary-700 dark:text-brand-primary-400';
  return (
    <p className={`${className} font-semibold uppercase tracking-[0.3em] ${tone}`}>
      {children}
    </p>
  );
}
