import { ElementType, HTMLAttributes, ReactNode } from 'react';

type RevealSectionProps<T extends ElementType = 'section'> = {
  as?: T;
  children: ReactNode;
  className?: string;
  intensity?: 'default' | 'strong';
  skeleton?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>;

/** Static section wrapper — scroll-reveal removed (community landing polish). */
export function RevealSection<T extends ElementType = 'section'>({
  as,
  children,
  className = '',
  intensity: _intensity = 'default',
  skeleton: _skeleton,
  ...rest
}: RevealSectionProps<T>) {
  const Tag = as ?? 'section';

  return (
    <Tag className={className} {...rest}>
      {children}
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
