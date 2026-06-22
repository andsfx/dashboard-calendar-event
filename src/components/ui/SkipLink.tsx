import React from 'react';
import { cn } from '../../utils/cn';

export interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'skip-link',
        className
      )}
    >
      {children}
    </a>
  );
}