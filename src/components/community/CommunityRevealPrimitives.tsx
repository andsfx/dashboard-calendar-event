import { ElementType, HTMLAttributes, ReactNode } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

type RevealSectionProps<T extends ElementType = 'section'> = {
  as?: T;
  children: ReactNode;
  className?: string;
  intensity?: 'default' | 'strong';
  skeleton?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>;

export function RevealSection<T extends ElementType = 'section'>({
  as,
  children,
  className = '',
  intensity = 'default',
  skeleton,
  ...rest
}: RevealSectionProps<T>) {
  const { ref, isVisible } = useScrollReveal();
  const Tag = as ?? 'section';

  if (!isVisible && skeleton) {
    return (
      <Tag ref={ref} className={className} {...rest}>
        <div className="animate-pulse">{skeleton}</div>
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
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
    <p className={`${className} font-semibold uppercase tracking-[0.3em] text-violet-600`}>
      {children}
    </p>
  );
}
