import { useState, useEffect, useRef, type ReactNode } from 'react';
import {
  Loader2, AlertTriangle, Search, ChevronDown, X, Building2, MapPin, Phone,
} from 'lucide-react';
import {
  fetchActiveTenants,
  type TenantDropdownOption,
} from '../../utils/domainApi';
import { SURVEY_OPTIONS } from '../../constants/survey-options';
import { cn } from '../../utils/cn';
import { Button } from '../shadcn/button';
import { Input } from '../shadcn/input';
import { Label } from '../shadcn/label';
import { RadioGroup as RadioGroupPrimitive, RadioGroupItem } from '../shadcn/radio-group';

// ─── Helpers ──────────────────────────────────────────────────────

/** Map MID floor code to SURVEY_OPTIONS.lokasi_zona value */
export function floorToZona(floor: string): string {
  const map: Record<string, string> = {
    'LTB': 'Lantai Dasar',
    'LT1': 'Lantai 1',
    'LT2': 'Lantai 2',
    'LT3': 'Lantai 3',
  };
  return map[floor.toUpperCase().trim()] || '';
}

/** Map MID tenant category to SURVEY_OPTIONS.kategori value */
export function apiCategoryToKategori(apiCat: string): string {
  const c = apiCat.toUpperCase().trim();
  if (/FOOD|FOOD\s*&\s*BEVERAGE|F\s*&\s*B|RESTAURANT|CAFE|KULINER|MINUMAN/.test(c)) return 'Food & Beverage (F&B)';
  if (/FASHION|PAKAIAN|CLOTHING|APPAREL|ACCESSORIES|TAS|SEPATU|JAM|TENANT_FASHION/.test(c)) return 'Fashion & Aksesoris';
  if (/LIFESTYLE|HOBBY|HOBI|GADGET|HP|COMPUTER|ELEKTRONIK|BUKU/.test(c)) return 'Lifestyle & Hobi';
  if (/HIBURAN|MAINAN|TOYS|KIDS|ANAK|PLAY/.test(c)) return 'Hiburan / Mainan Anak';
  if (/SERVICE|JASA|SERVIS/.test(c)) return 'Servis / Jasa';
  if (/SUPERMARKET|DEPARTMENT|MATRAI|RETAIL/.test(c)) return 'Supermarket / Department Store';
  return '';
}

/** Descriptive labels for traffic radio options */
export const TRAFFIC_LABELS: Record<string, string> = {
  'Signifikan': 'Signifikan (Toko jauh lebih ramai)',
  'Sedikit Naik': 'Sedikit Naik (Ada tambahan pengunjung tapi tidak terlalu padat)',
  'Tidak Ada': 'Tidak Ada (Kondisi sama seperti hari biasa)',
  'Menurun': 'Menurun (Toko justru lebih sepi)',
};

// ─── RadioGroup ───────────────────────────────────────────────────

export function RadioGroup({ label, options, value, onChange, disabled, labels, required, error }: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  labels?: Record<string, string>;
  required?: boolean;
  error?: string;
}) {
  const errorId = error ? `${label.replace(/\s+/g, '-').toLowerCase()}-error` : undefined;
  return (
    <fieldset className="space-y-2" disabled={disabled} aria-invalid={!!error || undefined} aria-describedby={errorId}>
      <legend className="text-sm font-semibold text-[var(--wf-ink)]">
        {label}
        {required && <><span className="ml-1 text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span></>}
      </legend>
      <RadioGroupPrimitive
        className="space-y-2"
        aria-label={label}
        aria-required={required || undefined}
        disabled={disabled}
        value={value}
        onValueChange={(next) => onChange(next)}
      >
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <Label
              key={opt}
              className={`
                flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 font-normal
                transition-colors focus-within:ring-2 focus-within:ring-[var(--wf-accent)]
                ${selected
                  ? 'border-[var(--wf-accent)] bg-[var(--wf-accent-soft)] shadow-sm'
                  : 'border-[var(--wf-rule)] bg-[var(--wf-board)] hover:border-[var(--wf-rule-strong)] hover:shadow-sm'
                }
              `}
            >
              <RadioGroupItem
                value={opt}
                className="mt-0.5 shrink-0"
                aria-label={labels?.[opt] || opt}
              />
              <span className="text-sm text-[var(--wf-ink-muted)]">
                {labels?.[opt] || opt}
              </span>
            </Label>
          );
        })}
      </RadioGroupPrimitive>
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </fieldset>
  );
}

// ─── TenantSearchSelect ───────────────────────────────────────────
// Pick-from-list only: ketik = search; commit nama/id hanya lewat pilih item.
// Ketik ulang setelah select → clear selection parent (onChange '' + onTenantSelect null).

export function TenantSearchSelect({ value, onChange, onTenantSelect, disabled, id, required, error, className }: {
  value: string;
  onChange: (v: string) => void;
  onTenantSelect?: (tenant: TenantDropdownOption | null) => void;
  disabled?: boolean;
  id: string;
  required?: boolean;
  error?: string;
  /** Kelas tambahan untuk input. Dipakai pemanggil di luar survei agar kontrol
   *  ini seragam dengan input form sekitarnya; halaman survei tidak mengirimnya. */
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<TenantDropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [retryTick, setRetryTick] = useState(0);
  const [highlighted, setHighlighted] = useState(-1);
  const listboxId = `${id}-listbox`;

  // Sync display when parent commits selection / form reset.
  // Jangan overwrite query saat user ketik ulang (value '' tapi input masih isi).
  useEffect(() => {
    if (value) {
      setQuery(value);
      return;
    }
    if (!open) setQuery('');
  }, [value, open]);

  useEffect(() => { setHighlighted(-1); }, [tenants]);

  useEffect(() => {
    if (disabled) return;
    const q = query.trim();
    if (q.length < 2) {
      setTenants([]);
      setSearchError('');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSearchError('');
    const t = setTimeout(async () => {
      try {
        const result = await fetchActiveTenants(q);
        if (cancelled) return;
        setTenants(result);
      } catch {
        if (cancelled) return;
        setTenants([]);
        setSearchError('Gagal memuat daftar tenant. Periksa koneksi lalu coba lagi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, disabled, retryTick]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function clearSelection() {
    selectedIdRef.current = null;
    onChange('');
    onTenantSelect?.(null);
  }

  function selectTenant(t: TenantDropdownOption) {
    selectedIdRef.current = t.id;
    onChange(t.name);
    setQuery(t.name);
    setOpen(false);
    setHighlighted(-1);
    // Instant auto-fill (nama/lokasi/kategori) from list option.
    // PIC TIDAK di-auto-fill: /tenant/tenants sengaja mengosongkan pic/picTelp
    // dan /tenant/tenant-detail tidak lagi mengembalikan PIC (anti PII dump).
    onTenantSelect?.(t);
  }

  function handleInputChange(next: string) {
    setQuery(next);
    setOpen(true);
    // Retype after pick → drop committed selection + auto-fill parent
    if (value) clearSelection();
  }

  function handleClear() {
    setQuery('');
    setOpen(false);
    clearSelection();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || tenants.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(prev => (prev < tenants.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(prev => (prev > 0 ? prev - 1 : tenants.length - 1));
    } else if (e.key === 'Enter' && highlighted >= 0 && tenants[highlighted]) {
      e.preventDefault();
      selectTenant(tenants[highlighted]);
    }
  }

  const hintId = `${id}-hint`;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [!value ? hintId : null, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wf-ink-muted)]" aria-hidden="true" />
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Cari & pilih tenant dari daftar"
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={highlighted >= 0 ? `tenant-opt-${highlighted}` : undefined}
          aria-required={required || undefined}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn('h-auto w-full rounded-xl border border-[var(--wf-rule-strong)] bg-[var(--wf-board)] py-2 pl-9 pr-9 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)] transition-colors hover:border-[var(--wf-rule-control)] focus:border-[var(--wf-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--wf-accent)] disabled:opacity-60', className)}
        />
        {query && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleClear}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink-muted)]"
            aria-label="Hapus"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {open && !disabled && (
        <div id={listboxId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center px-4 py-3 text-xs text-[var(--wf-ink-muted)]">
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Memuat tenant…
            </div>
          ) : searchError ? (
            <div className="flex items-start gap-2 px-4 py-3 text-xs text-red-600 dark:text-red-400" role="alert">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{searchError}</span>
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={() => setRetryTick((n) => n + 1)}
                className="h-auto p-0 font-medium text-red-600 underline underline-offset-2 hover:text-red-700 hover:no-underline dark:text-red-400 dark:hover:text-red-300"
              >
                Coba lagi
              </Button>
            </div>
          ) : tenants.length === 0 ? (
            <div className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">
              {query.trim().length < 2
                ? 'Ketik minimal 2 huruf, lalu pilih dari daftar'
                : `Tidak ada tenant cocok "${query}"`}
            </div>
          ) : (
            tenants.map((t, i) => (
              <Button
                key={t.id}
                variant="ghost"
                id={`tenant-opt-${i}`}
                type="button"
                role="option"
                aria-selected={i === highlighted}
                onClick={() => selectTenant(t)}
                onMouseEnter={() => setHighlighted(i)}
                className={`h-auto flex w-full items-start justify-start gap-3 rounded-none border-b border-[var(--wf-rule)] px-3 py-2 text-left font-normal whitespace-normal transition-colors last:border-b-0 ${
                  i === highlighted
                    ? 'bg-[var(--wf-accent-soft)]'
                    : 'hover:bg-[var(--wf-accent-soft)]'
                }`}
              >
                {t.logo ? (
                  <img src={t.logo} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-[var(--wf-rule)] object-cover" onError={(e) => { (e.currentTarget.style.display = 'none'); }} />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--wf-board-2)] text-[10px] font-bold text-[var(--wf-ink-muted)]">
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--wf-ink)]">
                    {t.name}
                  </p>
                  <p className="truncate text-[11px] text-[var(--wf-ink-muted)]">
                    {t.category || '-'}
                    {t.floor ? ` • ${t.floor}` : ''}
                    {t.lot ? ` • Lot ${t.lot}` : ''}
                  </p>
                </div>
              </Button>
            ))
          )}
        </div>
      )}
      {!value && !error && (
        <p id={hintId} className="mt-1 text-[11px] text-[var(--wf-ink-muted)]">
          Pilih tenant dari daftar, bukan ketik bebas.
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400" role="alert">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
