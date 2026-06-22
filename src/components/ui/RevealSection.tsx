import React, { ReactNode } from 'react';
import { useAnimation, AnimationType } from '../../hooks/useAnimation';
import { cn } from '../../utils/cn';

export interface RevealSectionProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
  animation?: AnimationType;
  threshold?: number;
  delay?: number;
  stagger?: boolean;
  intensity?: 'default' | 'strong';
  id?: string;
}

export function RevealSection({
  children,
  className = '',
  as = 'section',
  animation = 'fade-in',
  threshold = 0.15,
  delay = 0,
  stagger = false,
  intensity = 'default',
  id,
  ...rest
}: RevealSectionProps) {
  // Adjust animation based on intensity
  let finalAnimation: AnimationType = animation;
  let finalThreshold = threshold;
  
  if (intensity === 'strong') {
    // For strong intensity, use more dramatic animations
    if (animation === 'fade-in') {
      finalAnimation = 'slide-in-up';
    }
    finalThreshold = 0.1; // Trigger earlier
  }

  const ref = useAnimation({ 
    animation: finalAnimation, 
    threshold: finalThreshold, 
    delay, 
    stagger 
  });
  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={cn(className)}
      id={id}
      {...rest}
    >
      {children}
    </Tag>
  );
}