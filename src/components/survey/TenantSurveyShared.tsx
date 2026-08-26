import { useState, useEffect, useRef, type ReactNode } from 'react';
import {
  Loader2, AlertTriangle, Search, ChevronDown, X, Building2, MapPin, Phone,
} from 'lucide-react';
import {
  fetchActiveTenants,
  fetchTenantDetail,
  type TenantDropdownOption,
} from '../../utils/supabaseApi';
import { SURVEY_OPTIONS } from '../../constants/survey-options';

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
    <fieldset className="space-y-2" disabled={disabled} aria-required={required || undefined} aria-invalid={!!error || undefined} aria-describedby={errorId}>
      <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </legend>
      <div className="space-y-2" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <label
              key={opt}
              className={`
                flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3
                transition focus-within:ring-2 focus-within:ring-brand-primary-500
                ${selected
                  ? 'border-brand-primary-400 bg-brand-primary-50 shadow-sm dark:border-brand-primary-500 dark:bg-brand-primary-950/40'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                }
              `}
            >
              <input
                type="radio"
                name={label}
                value={opt}
                checked={selected}
                onChange={() => onChange(opt)}
                disabled={disabled}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-primary-600"
                aria-label={labels?.[opt] || opt}
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {labels?.[opt] || opt}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
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

export function TenantSearchSelect({ value, onChange, onTenantSelect, disabled, id, required, error }: {
  value: string;
  onChange: (v: string) => void;
  onTenantSelect?: (tenant: TenantDropdownOption | null) => void;
  disabled?: boolean;
  id: string;
  required?: boolean;
  error?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<TenantDropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
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
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const result = await fetchActiveTenants(q);
      if (!cancelled) {
        setTenants(result);
        setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, disabled]);

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
    // Instant auto-fill (nama/lokasi/kategori) from list option
    onTenantSelect?.(t);
    // PIC auto-fill: list strips PIC (no mass PII dump) → fetch detail by id
    void fetchTenantDetail(t.id).then((detail) => {
      if (!detail) return;
      // Guard: selection may have changed while detail was loading
      if (selectedIdRef.current !== t.id) return;
      onTenantSelect?.({
        ...t,
        pic: detail.pic,
        picTelp: detail.picTelp,
      });
    });
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
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Cari & pilih gerai dari daftar"
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
        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-800 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-brand-primary-400 focus:outline-none focus:ring-1 focus:ring-brand-primary-400 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
      />
      {query && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          aria-label="Hapus"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {open && !disabled && (
        <div id={listboxId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900">
          {loading ? (
            <div className="flex items-center justify-center px-4 py-3 text-xs ui-text-muted">
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Memuat tenant...
            </div>
          ) : tenants.length === 0 ? (
            <div className="px-4 py-3 text-xs ui-text-muted">
              {query.trim().length < 2
                ? 'Ketik minimal 2 huruf, lalu pilih dari daftar'
                : `Tidak ada tenant cocok "${query}"`}
            </div>
          ) : (
            tenants.map((t, i) => (
              <button
                key={t.id}
                id={`tenant-opt-${i}`}
                type="button"
                role="option"
                aria-selected={i === highlighted}
                onClick={() => selectTenant(t)}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex w-full items-start gap-3 border-b border-slate-100 px-3 py-2 text-left transition last:border-b-0 dark:border-slate-700 ${
                  i === highlighted
                    ? 'bg-brand-primary-50 dark:bg-brand-primary-950/30'
                    : 'hover:bg-brand-primary-50 dark:hover:bg-brand-primary-950/30'
                }`}
              >
                {t.logo ? (
                  <img src={t.logo} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-600" onError={(e) => { (e.currentTarget.style.display = 'none'); }} />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-400 dark:bg-slate-700">
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {t.name}
                  </p>
                  <p className="truncate text-[11px] ui-text-muted">
                    {t.category || '—'}
                    {t.floor ? ` • ${t.floor}` : ''}
                    {t.lot ? ` • Lot ${t.lot}` : ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
      {!value && !error && (
        <p id={hintId} className="mt-1 text-[11px] ui-text-muted">
          Pilih gerai dari daftar, bukan ketik bebas.
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
