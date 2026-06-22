import React from 'react';
import { cn } from '../../utils/cn';

export interface HeroProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  backgroundImage?: string;
  overlay?: boolean;
}

export function Hero({
  title,
  subtitle,
  children,
  className,
  backgroundImage,
  overlay = true,
  ...props
}: HeroProps) {
  return (
    <div 
      className={cn('relative min-h-screen flex items-center justify-center overflow-hidden', className)}
      {...props}
    >
      {backgroundImage && (
        <>
          <div className="absolute inset-0">
            <img 
              src={backgroundImage} 
              alt="" 
              className="h-full w-full object-cover"
            />
          </div>
          {overlay && (
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent" />
          )}
        </>
      )}
      
      <div className="container relative z-10 px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="display-2 font-display text-white mb-6">
            {title}
          </h1>
          {subtitle && (
            <p className="body-lg text-neutral-200 mb-8 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function Section({ className, children, ...props }: SectionProps) {
  return (
    <section className={cn('py-20', className)} {...props}>
      <div className="container px-4">{children}</div>
    </section>
  );
}

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function Container({ className, children, ...props }: ContainerProps) {
  return (
    <div className={cn('max-w-7xl mx-auto px-4', className)} {...props}>
      {children}
    </div>
  );
}