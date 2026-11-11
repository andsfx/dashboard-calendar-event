import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../shadcn/input';
import { Button } from '../shadcn/button';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/**
 * Pencarian acara dengan pintasan papan tuntas `Ctrl/Cmd+K` dan `/`.
 * Input memakai Input shadcn; tombol bersihkan memakai Button shadcn
 * (pola yang sama dengan plate search di `DashboardHeader`).
 */
export function SearchBar({ value, onChange, placeholder = 'Cari acara, lokasi, EO…' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const selectInput = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  // Keyboard shortcut: Ctrl+K or "/" to focus — tetap global (bukan hanya saat
  // input fokus), persis seperti sebelum migrasi.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        selectInput();
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && !(document.activeElement as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        focusInput();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="relative group">
      <Search
        className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${value ? 'text-[var(--wf-accent)]' : 'text-[var(--wf-ink-muted)] group-focus-within:text-[var(--wf-accent)]'}`}
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={100}
        aria-label="Cari acara"
        className="w-full pl-8 pr-8"
      />

      {/* Right side: clear button OR keyboard shortcut hint */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Hapus pencarian"
            onClick={() => { onChange(''); focusInput(); }}
            className="text-[var(--wf-ink-muted)] hover:text-[var(--wf-ink)]"
          >
            <X aria-hidden />
          </Button>
        ) : (
          <kbd className="hidden select-none rounded-md border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--wf-ink-muted)] sm:inline-flex">
            /
          </kbd>
        )}
      </div>
    </div>
  );
}
