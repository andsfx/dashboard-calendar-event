import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2, Loader2, AlertTriangle, ClipboardCheck,
  Send, ArrowLeft, MapPin, Calendar, Search,
  ChevronLeft, RefreshCw, CheckCircle2, Sparkles, X,
} from 'lucide-react';
import {
  fetchPublicTenantSurveyEvent,
  checkPublicTenantSurveyDuplicate,
  submitPublicTenantSurvey,
  fetchActiveTenants,
  type TenantDropdownOption,
} from '../../utils/supabaseApi';
import { getDeviceFingerprint } from '../../utils/fingerprint';
import { validateTenantSurvey } from '../../utils/validation';
import { SURVEY_OPTIONS } from '../../constants/survey-options';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error' | 'duplicate';

const TRAFFIC_LABELS: Record<string, string> = {
  'Signifikan': 'Signifikan (Toko jauh lebih ramai)',
  'Sedikit Naik': 'Sedikit Naik (Ada tambahan pengunjung tapi tidak terlalu padat)',
  'Tidak Ada': 'Tidak Ada (Kondisi sama seperti hari biasa)',
  'Menurun': 'Menurun (Toko justru lebih sepi)',
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel';
  required?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}

function Field({ label, value, onChange, placeholder, type = 'text', required, disabled, icon }: FieldProps) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
        {icon}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
      />
    </div>
  );
}

function RadioGroup({ label, options, value, onChange, disabled, labels }: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  labels?: Record<string, string>;
}) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
        <span className="ml-1 text-red-500">*</span>
      </legend>
      <div className="space-y-2" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <label
              key={opt}
              className={`
                flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3
                transition focus-within:ring-2 focus-within:ring-violet-500
                ${selected
                  ? 'border-violet-400 bg-violet-50 dark:border-violet-500 dark:bg-violet-950/40'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
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
                className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
                aria-label={labels?.[opt] || opt}
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {labels?.[opt] || opt}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Map MID floor code to SURVEY_OPTIONS.lokasi_zona value */
function floorToZona(floor: string): string {
  const map: Record<string, string> = {
    'LTB': 'Lantai Dasar',
    'LT1': 'Lantai 1',
    'LT2': 'Lantai 2',
    'LT3': 'Lantai 3',
  };
  return map[floor.toUpperCase().trim()] || '';
}

function TenantSearchSelect({ value, onChange, onTenantSelect, disabled }: {
  value: string;
  onChange: (v: string) => void;
  onTenantSelect?: (tenant: TenantDropdownOption) => void;
  disabled?: boolean;
}) {
  const containerRef = useState<HTMLDivElement | null>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<TenantDropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const container = containerRef[0];
  const setContainer = containerRef[1];

  // Sync query when value changes externally (e.g., reset)
  useEffect(() => { setQuery(value); }, [value]);

  // Debounced search
  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const result = await fetchActiveTenants(query);
      if (!cancelled) {
        setTenants(result);
        setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, disabled]);

  // Close on outside click + ESC
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (container && !container.contains(e.target as Node)) setOpen(false);
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
  }, [open, container]);

  return (
    <div ref={setContainer} className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Ketik nama gerai Anda..."
        disabled={disabled}
        autoComplete="off"
        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
      />
      {query && !disabled && (
        <button
          type="button"
          onClick={() => { setQuery(''); onChange(''); setOpen(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          aria-label="Hapus"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {open && !disabled && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {loading ? (
            <div className="flex items-center justify-center px-4 py-3 text-xs text-slate-500">
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Memuat tenant...
            </div>
          ) : tenants.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500">
              {query ? `Tidak ada tenant cocok "${query}"` : 'Ketik untuk mencari tenant'}
            </div>
          ) : (
            tenants.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(t.name); setQuery(t.name); setOpen(false); onTenantSelect?.(t); }}
                className="flex w-full items-start gap-3 border-b border-slate-100 px-3 py-2 text-left transition last:border-b-0 hover:bg-violet-50 dark:border-slate-700 dark:hover:bg-violet-950/30"
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
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
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
    </div>
  );
}

export default function TenantSurveyPublicPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<{
    id: string; acara: string; tanggal: string; lokasi: string; eo: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    nama_gerai: '',
    lokasi_zona: '',
    kategori: '',
    kenaikan_traffic: '',
    kenaikan_sales: '',
    feedback_teks: '',
  });

  const updateField = (field: keyof typeof formData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-fill lokasi_zona when a tenant is picked from the dropdown
  const handleTenantSelect = useCallback((tenant: TenantDropdownOption) => {
    const zona = floorToZona(tenant.floor);
    if (zona) {
      setFormData(prev => (prev.lokasi_zona ? prev : { ...prev, lokasi_zona: zona }));
    }
  }, []);

  useEffect(() => {
    if (!eventId) {
      setError('Event ID tidak ditemukan di URL');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const ev = await fetchPublicTenantSurveyEvent(eventId);
        if (cancelled) return;
        if (!ev) {
          setError('Event tidak ditemukan atau sudah berakhir');
          setLoading(false);
          return;
        }
        setEvent(ev);

        const fp = getDeviceFingerprint();
        const dup = await checkPublicTenantSurveyDuplicate(eventId, fp);
        if (!cancelled && dup) setAlreadySubmitted(true);
      } catch {
        if (!cancelled) setError('Gagal memuat data event');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [eventId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !event) return;

    setFormStatus('submitting');
    setSubmitError('');
    setFieldErrors([]);

    const submission: Record<string, unknown> = {
      event_id: eventId,
      nama_gerai: formData.nama_gerai.trim(),
      lokasi_zona: formData.lokasi_zona,
      kategori: formData.kategori,
      kenaikan_traffic: formData.kenaikan_traffic,
      kenaikan_sales: formData.kenaikan_sales,
      feedback_teks: formData.feedback_teks.trim(),
      device_fingerprint: getDeviceFingerprint(),
    };

    const validation = validateTenantSurvey(submission);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setFormStatus('idle');
      return;
    }

    try {
      await submitPublicTenantSurvey(submission as never);
      setFormStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim survey';
      if (/sudah|already/i.test(msg) || /23505|duplicate/i.test(msg)) {
        setFormStatus('duplicate');
        setAlreadySubmitted(true);
      } else {
        setFormStatus('error');
        setSubmitError(msg);
      }
    }
  }, [eventId, event, formData]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleRetry = useCallback(() => {
    setFormStatus('idle');
    setSubmitError('');
  }, []);

  const PageShell = ({ children }: { children: ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950/30">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
            Metropolitan Mall Bekasi
          </span>
        </div>
        {children}
      </div>
    </div>
  );

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 dark:border-slate-700 dark:bg-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Memuat survey...</p>
        </div>
      </PageShell>
    );
  }

  if (error || !event) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Event Tidak Ditemukan</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {error || 'Event yang Anda cari tidak tersedia.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Ke Beranda
          </button>
        </div>
      </PageShell>
    );
  }

  if (alreadySubmitted || formStatus === 'duplicate') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/30">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <CheckCircle2 className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Anda Sudah Mengisi Survey
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Anda sudah pernah mengirimkan self-assessment untuk event
            <span className="mx-1 font-semibold text-violet-600 dark:text-violet-400">
              &quot;{event.acara}&quot;
            </span>
            dari perangkat ini. Setiap tenant hanya dapat mengirimkan satu survey per event.
          </p>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Jika ini adalah kesalahan, hubungi tim Metropolitan Mall Bekasi.
          </p>
        </div>
      </PageShell>
    );
  }

  if (formStatus === 'success') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Survey Terkirim!</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Terima kasih telah mengirimkan self-assessment untuk event
          </p>
          <p className="mt-0.5 text-sm font-semibold text-violet-600 dark:text-violet-400">
            &quot;{event.acara}&quot;
          </p>
          <p className="mt-4 max-w-md text-xs text-slate-500 dark:text-slate-400">
            Masukan Anda sangat berharga untuk meningkatkan kualitas kerjasama dan pelayanan kami.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Kembali ke Beranda
          </button>
        </div>
      </PageShell>
    );
  }

  if (formStatus === 'error') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Terjadi Kesalahan</h2>
          <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            {submitError}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Ke Beranda
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  const requiredCount = 5; // nama_gerai, lokasi_zona, kategori, kenaikan_traffic, kenaikan_sales
  const filledCount = [
    formData.nama_gerai.trim() ? 1 : 0,
    formData.lokasi_zona ? 1 : 0,
    formData.kategori ? 1 : 0,
    formData.kenaikan_traffic ? 1 : 0,
    formData.kenaikan_sales ? 1 : 0,
  ].reduce((a, b) => a + b, 0) as number;
  const progress = Math.round((filledCount / requiredCount) * 100);

  return (
    <PageShell>
      {/* Event banner */}
      <div className="mb-6 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 dark:border-violet-800 dark:from-violet-950/40 dark:to-indigo-950/40">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
            <ClipboardCheck className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Self-Assessment Tenant
            </span>
            <h1 className="mt-0.5 truncate text-lg font-bold text-violet-900 dark:text-violet-100">
              {event.acara}
            </h1>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-violet-700 dark:text-violet-300">
              {event.tanggal && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {event.tanggal}
                </span>
              )}
              {event.lokasi && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {event.lokasi}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-violet-700 dark:text-violet-300">
          Bantu kami meningkatkan pelayanan dengan memberikan penilaian dan masukan untuk event ini.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Top-level errors */}
        {fieldErrors.length > 0 && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                  Mohon perbaiki {fieldErrors.length} kesalahan:
                </p>
                <ul className="mt-1 list-inside list-disc text-xs text-red-700 dark:text-red-300">
                  {fieldErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Informasi Gerai */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
            Bagian 1: Informasi Gerai
          </h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Isi informasi dasar tenant dan lokasi gerai Anda di Metropolitan Mall Bekasi.
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Building2 className="h-3.5 w-3.5" />
                Nama Gerai
                <span className="text-red-500">*</span>
              </label>
              <TenantSearchSelect
                value={formData.nama_gerai}
                onChange={updateField('nama_gerai')}
                onTenantSelect={handleTenantSelect}
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                Lokasi / Zona
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.lokasi_zona}
                onChange={(e) => updateField('lokasi_zona')(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="">Pilih lokasi / zona</option>
                {SURVEY_OPTIONS.lokasi_zona.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            <RadioGroup
              label="Kategori Gerai"
              options={SURVEY_OPTIONS.kategori}
              value={formData.kategori}
              onChange={updateField('kategori')}
            />
          </div>
        </section>

        {/* Section 2: Evaluasi Traffic & Sales */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
            Bagian 2: Evaluasi Traffic &amp; Sales
          </h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Bandingkan kondisi traffic pengunjung dan penjualan selama event berlangsung dibanding hari biasa.
          </p>

          <div className="space-y-5">
            <RadioGroup
              label="Kenaikan Traffic Pengunjung"
              options={SURVEY_OPTIONS.kenaikan_traffic}
              value={formData.kenaikan_traffic}
              onChange={updateField('kenaikan_traffic')}
              labels={TRAFFIC_LABELS}
            />

            <RadioGroup
              label="Kenaikan Sales / Penjualan"
              options={SURVEY_OPTIONS.kenaikan_sales}
              value={formData.kenaikan_sales}
              onChange={updateField('kenaikan_sales')}
            />
          </div>
        </section>

        {/* Section 3: Umpan Balik */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
            Bagian 3: Umpan Balik
          </h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Sampaikan masukan Anda tentang event ini secara bebas (opsional).
          </p>

          <div>
            <textarea
              value={formData.feedback_teks}
              onChange={(e) => updateField('feedback_teks')(e.target.value)}
              placeholder="Apakah profil pengunjung event ini cocok dengan produk Anda? Jenis event apa yang Anda harapkan ke depannya?"
              rows={5}
              maxLength={2000}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            />
            <p className="mt-1 text-right text-[10px] text-slate-400">
              {2000 - formData.feedback_teks.length} karakter tersisa
            </p>
          </div>
        </section>

        {/* Progress indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{progress}% selesai</span>
          <span>{filledCount} dari {requiredCount} bagian wajib terisi</span>
        </div>

        {/* Submit */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={goBack}
            disabled={formStatus === 'submitting'}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Batal
          </button>
          <button
            type="submit"
            disabled={formStatus === 'submitting'}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            {formStatus === 'submitting' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Kirim Survey
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          <Sparkles className="mr-1 inline h-3 w-3" />
          Survey ini dapat diakses tanpa login. Identitas Anda akan disimpan secara anonim.
        </p>
      </form>
    </PageShell>
  );
}