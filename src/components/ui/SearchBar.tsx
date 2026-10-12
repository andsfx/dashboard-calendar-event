import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { MdIconButton, MdTextField } from '../md';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/**
 * Pencarian acara dengan pintasan papan tuntas `Ctrl/Cmd+K` dan `/`.
 * Input memakai `md-outlined-text-field`; tombol bersihkan memakai
 * `md-icon-button`.
 */
export function SearchBar({ value, onChange, placeholder = 'Cari acara, lokasi, EO…' }: Props) {
  const inputRef = useRef<HTMLElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const selectInput = () => {
    const el = inputRef.current as (HTMLElement & { select?: () => void }) | null;
    el?.focus();
    el?.select?.();
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
      <MdTextField
        value={value}
        onChange={onChange}
        type="search"
        placeholder={placeholder}
        maxLength={100}
        ariaLabel="Cari acara"
        className="w-full"
        inputRef={inputRef}
      >
        <Search
          slot="leading-icon"
          className={`h-4 w-4 transition-colors ${value ? 'text-[var(--wf-accent)]' : 'text-[var(--wf-ink-muted)] group-focus-within:text-[var(--wf-accent)]'}`}
          aria-hidden="true"
        />
      </MdTextField>

      {/* Right side: clear button OR keyboard shortcut hint */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value ? (
          <MdIconButton
            ariaLabel="Hapus pencarian"
            onClick={() => { onChange(''); focusInput(); }}
          >
            <X className="h-4 w-4" />
          </MdIconButton>
        ) : (
          <kbd className="hidden select-none rounded-md border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--wf-ink-muted)] sm:inline-flex">
            /
          </kbd>
        )}
      </div>
    </div>
  );
}
