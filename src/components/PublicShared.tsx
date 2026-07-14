import React, { ReactNode } from 'react';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function RevealSection({
  children,
  className = '',
  as = 'section',
  intensity = 'default',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
  intensity?: 'default' | 'strong';
} & React.HTMLAttributes<HTMLElement>) {
  const { ref, isVisible } = useScrollReveal();
  const Tag = as;

  return (
    <Tag ref={ref as never} className={`reveal-on-scroll ${intensity === 'strong' ? 'reveal-strong' : ''} ${isVisible ? 'reveal-visible' : ''} ${className}`} {...rest}>
      <div className="reveal-stage">{children}</div>
    </Tag>
  );
}

export function LogoMark({ className = '' }: { className?: string }) {
  return <img src={mallLogo} alt="Metropolitan Mall Bekasi" className={className} />;
}

export function eyebrow(label: string, light = false) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.3em] ${light ? 'text-white/80' : 'text-brand-primary-500 dark:text-brand-primary-400'}`}
    >
      {label}
    </p>
  );
}
