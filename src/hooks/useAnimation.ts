import { useEffect, useRef } from 'react';

export type AnimationType = 
  | 'fade-in'
  | 'slide-in-up'
  | 'slide-in-left'
  | 'slide-in-right'
  | 'scale-in';

export interface UseAnimationProps {
  animation?: AnimationType;
  threshold?: number;
  rootMargin?: string;
  delay?: number;
  stagger?: boolean;
}

export function useAnimation({
  animation = 'fade-in',
  threshold = 0.1,
  rootMargin = '0px',
  delay = 0,
  stagger = false
}: UseAnimationProps = {}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!elementRef.current || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            
            // Add base animation class
            elementRef.current?.classList.add(animation);
            
            // Add delay if specified
            if (delay > 0) {
              elementRef.current?.style.setProperty('--animation-delay', `${delay}ms`);
            }
            
            // Handle staggered animations
            if (stagger && elementRef.current?.children) {
              Array.from(elementRef.current.children).forEach((child, index) => {
                child.classList.add('fade-in-stagger');
                child.classList.add(`stagger-${index + 1}`);
              });
            }
            
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [animation, threshold, rootMargin, delay, stagger]);

  return elementRef;
}