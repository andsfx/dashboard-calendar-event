import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Cari acara, lokasi, EO...' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Ctrl+K or "/" to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && !(document.activeElement as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="relative group">
      <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${value ? 'text-brand-primary-500' : 'text-slate-500 group-focus-within:text-brand-primary-500'}`} />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={100}
        aria-label="Cari acara"
        className="ui-dashboard-control h-10 w-full rounded-xl py-2 pl-9 pr-16 text-sm text-slate-800 outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:text-white dark:focus:border-brand-primary-500 dark:focus:ring-brand-primary-900/30"
      />

      {/* Right side: clear button OR keyboard shortcut hint */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value ? (
          <button
            onClick={() => { onChange(''); inputRef.current?.focus(); }}
            className="rounded-lg p-0.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-400 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-label="Hapus pencarian"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden select-none rounded-md border border-[var(--border-subtle)] bg-[var(--brand-card)] px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500 sm:inline-flex">
            /
          </kbd>
        )}
      </div>
    </div>
  );
}
