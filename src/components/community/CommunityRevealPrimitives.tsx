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
};

export function CommunityEyebrow({ children, className = 'text-[11px]' }: CommunityEyebrowProps) {
  return (
    <p className={`${className} font-semibold uppercase tracking-[0.2em] text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]`}>
      {children}
    </p>
  );
}
