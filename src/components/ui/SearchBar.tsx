import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Cari acara, lokasi, EO…' }: Props) {
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
      <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${value ? 'text-[var(--wf-accent)]' : 'text-[var(--wf-ink-muted)] group-focus-within:text-[var(--wf-accent)]'}`} />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={100}
        aria-label="Cari acara"
        className="ui-dashboard-control h-10 w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] py-2 pl-9 pr-16 text-sm text-[var(--wf-ink)] outline-none transition placeholder:text-[var(--wf-ink-muted)] focus:border-[var(--wf-accent)] focus:ring-2 focus:ring-[var(--wf-accent)]/20"
      />

      {/* Right side: clear button OR keyboard shortcut hint */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value ? (
          <button
            onClick={() => { onChange(''); inputRef.current?.focus(); }}
            className="-m-1 rounded-lg p-1 text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]"
            aria-label="Hapus pencarian"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="hidden select-none rounded-md border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--wf-ink-muted)] sm:inline-flex">
            /
          </kbd>
        )}
      </div>
    </div>
  );
}
