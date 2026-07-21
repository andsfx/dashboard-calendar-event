import { ElementType, HTMLAttributes, ReactNode } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

type RevealSectionProps<T extends ElementType = 'section'> = {
  as?: T;
  children: ReactNode;
  className?: string;
  intensity?: 'default' | 'strong';
  skeleton?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>;

/** Fast community reveal — useScrollReveal + motion.css (Path A). */
export function RevealSection<T extends ElementType = 'section'>({
  as,
  children,
  className = '',
  intensity = 'default',
  skeleton: _skeleton,
  ...rest
}: RevealSectionProps<T>) {
  const { ref, isVisible } = useScrollReveal();
  const Tag = as ?? 'section';

  return (
    <Tag
      ref={ref as never}
      className={`reveal-on-scroll ${intensity === 'strong' ? 'reveal-strong' : ''} ${isVisible ? 'reveal-visible' : ''} ${className}`}
      {...rest}
    >
      <div className="reveal-stage">{children}</div>
    </Tag>
  );
}

type CommunityEyebrowProps = {
  children: ReactNode;
  className?: string;
};

export function CommunityEyebrow({ children, className = 'text-[11px]' }: CommunityEyebrowProps) {
  return (
    <p className={`${className} font-semibold uppercase tracking-[0.2em] text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]`}>
      {children}
    </p>
  );
}
