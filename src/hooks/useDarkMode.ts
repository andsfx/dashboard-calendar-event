import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';

export function useDarkMode(): [boolean, () => void] {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(isDark));
  }, [isDark]);

  const toggle = () => setIsDark(prev => !prev);

  return [isDark, toggle];
}
