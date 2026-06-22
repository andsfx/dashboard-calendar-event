import { useState, useEffect } from 'react';

export interface UseImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
}

export function useImage({
  src,
  srcSet,
  sizes,
  loading = 'lazy',
  fetchPriority = 'auto'
}: UseImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    
    // Set image properties
    if (srcSet) img.srcset = srcSet;
    if (sizes) img.sizes = sizes;
    if (loading) img.loading = loading;
    if (fetchPriority) img.fetchPriority = fetchPriority;
    
    img.onload = () => {
      setIsLoaded(true);
      setHasError(false);
    };
    
    img.onerror = () => {
      setIsLoaded(false);
      setHasError(true);
    };
    
    img.src = src;
    
    return () => {
      // Cleanup
    };
  }, [src, srcSet, sizes, loading, fetchPriority]);

  return { isLoaded, hasError };
}