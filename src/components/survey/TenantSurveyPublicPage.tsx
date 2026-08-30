import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2, Loader2, AlertTriangle, ClipboardCheck,
  Send, ArrowLeft, MapPin, Calendar, User,
  ChevronLeft, ChevronDown, RefreshCw, CheckCircle2, Shield, Phone,
} from 'lucide-react';
import {
  fetchPublicTenantSurveyEvent,
  checkPublicTenantSurveyDuplicate,
  submitPublicTenantSurvey,
  type TenantDropdownOption,
} from '../../utils/supabaseApi';
import { getDeviceFingerprint } from '../../utils/fingerprint';
import { validateTenantSurvey } from '../../utils/validation';
import { SURVEY_OPTIONS } from '../../constants/survey-options';
import {
  TenantSearchSelect,
  RadioGroup,
  floorToZona,
  apiCategoryToKategori,
  TRAFFIC_LABELS,
} from './TenantSurveyShared';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error' | 'duplicate';

function PageShell({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  return (
    <div className="min-h-screen scroll-smooth bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary-600 transition hover:text-brand-primary-700 dark:text-brand-primary-400 dark:hover:text-brand-primary-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <span className="text-xs font-semibold text-brand-primary-600 dark:text-brand-primary-400">
            Metropolitan Mall Bekasi
          </span>
        </div>
        {children}
      </div>
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
  const [surveyClosed, setSurveyClosed] = useState(false);
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
    pic_name: '',
    pic_phone: '',
  });
  const [selectedTenant, setSelectedTenant] = useState<TenantDropdownOption | null>(null);
  const [autoFilled, setAutoFilled] = useState<{ lokasi_zona: boolean; kategori: boolean }>({
    lokasi_zona: false,
    kategori: false,
  });
  const errorAlertRef = useRef<HTMLDivElement | null>(null);
  const submittingRef = useRef(false);

  const updateField = (field: keyof typeof formData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'lokasi_zona') setAutoFilled(prev => ({ ...prev, lokasi_zona: false }));
    if (field === 'kategori') setAutoFilled(prev => ({ ...prev, kategori: false }));
  };

  // Pick-from-list: auto-fill only when tenant dipilih dari MID list
  const handleTenantSelect = useCallback((tenant: TenantDropdownOption | null) => {
    setSelectedTenant(tenant);
    if (!tenant) {
      setAutoFilled(prevAuto => {
        setFormData(prev => ({
          ...prev,
          nama_gerai: '',
          lokasi_zona: prevAuto.lokasi_zona ? '' : prev.lokasi_zona,
          kategori: prevAuto.kategori ? '' : prev.kategori,
          pic_name: '',
          pic_phone: '',
        }));
        return { lokasi_zona: false, kategori: false };
      });
      return;
    }
    const zona = floorToZona(tenant.floor);
    const kat = apiCategoryToKategori(tenant.category);
    setFormData(prev => ({
      ...prev,
      nama_gerai: tenant.name,
      lokasi_zona: zona || prev.lokasi_zona,
      kategori: kat || prev.kategori,
      pic_name: tenant.pic || prev.pic_name,
      pic_phone: tenant.picTelp || prev.pic_phone,
    }));
    setAutoFilled({ lokasi_zona: !!zona, kategori: !!kat });
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
        if (ev.is_active !== true) {
          setSurveyClosed(true);
          setLoading(false);
          return;
        }

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
    if (!eventId || !event || submittingRef.current) return;

    submittingRef.current = true;
    setFormStatus('submitting');
    setSubmitError('');
    setFieldErrors([]);

    if (!selectedTenant) {
      setFieldErrors(['Pilih gerai dari daftar, bukan ketik bebas.']);
      setFormStatus('idle');
      submittingRef.current = false;
      requestAnimationFrame(() => {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        errorAlertRef.current?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });
      });
      return;
    }

    const submission: Record<string, unknown> = {
      event_id: eventId,
      nama_gerai: selectedTenant.name.trim(),
      lokasi_zona: formData.lokasi_zona,
      kategori: formData.kategori,
      kenaikan_traffic: formData.kenaikan_traffic,
      kenaikan_sales: formData.kenaikan_sales,
      feedback_teks: formData.feedback_teks.trim(),
      device_fingerprint: getDeviceFingerprint(),
      tenant_id: selectedTenant.id,
      pic_name: formData.pic_name.trim(),
      pic_phone: formData.pic_phone.trim(),
    };

    const validation = validateTenantSurvey(submission);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setFormStatus('idle');
      submittingRef.current = false;
      requestAnimationFrame(() => {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        errorAlertRef.current?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });
      });
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
    } finally {
      submittingRef.current = false;
    }
  }, [eventId, event, formData, selectedTenant]);

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
    submittingRef.current = false;
  }, []);

  if (loading) {
    return (
      <PageShell onBack={goBack}>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 dark:border-slate-700 dark:bg-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary-500" />
          <p className="mt-3 text-sm ui-text-muted">Memuat survey...</p>
        </div>
      </PageShell>
    );
  }

  if (error || !event) {
    return (
      <PageShell onBack={goBack}>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/30">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Event Tidak Ditemukan</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {error || 'Event yang Anda cari tidak tersedia.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Ke Beranda
          </button>
        </div>
      </PageShell>
    );
  }

  if (surveyClosed) {
    return (
      <PageShell onBack={goBack}>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
            <Shield className="h-8 w-8 text-slate-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Survey Ditutup</h2>
          <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Self-assessment tenant untuk event
            <span className="mx-1 font-semibold text-brand-primary-600 dark:text-brand-primary-400">
              &quot;{event.acara}&quot;
            </span>
            tidak aktif atau sudah ditutup.
          </p>
          <button
            type="button"
            onClick={() => navigate('/tenant-survey')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Pilih Event Lain
          </button>
        </div>
      </PageShell>
    );
  }

  if (alreadySubmitted || formStatus === 'duplicate') {
    return (
      <PageShell onBack={goBack}>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/30">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <CheckCircle2 className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Anda Sudah Mengisi Survey
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Anda sudah pernah mengirimkan self-assessment untuk event
            <span className="mx-1 font-semibold text-brand-primary-600 dark:text-brand-primary-400">
              &quot;{event.acara}&quot;
            </span>
            dari perangkat ini. Setiap tenant hanya dapat mengirimkan satu survey per event.
          </p>
          <p className="mt-3 text-xs ui-text-muted">
            Jika ini adalah kesalahan, hubungi tim Metropolitan Mall Bekasi.
          </p>
        </div>
      </PageShell>
    );
  }

  if (formStatus === 'success') {
    return (
      <PageShell onBack={goBack}>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Survey Terkirim!</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Terima kasih telah mengirimkan self-assessment untuk event
          </p>
          <p className="mt-0.5 text-sm font-semibold text-brand-primary-600 dark:text-brand-primary-400">
            &quot;{event.acara}&quot;
          </p>
          <p className="mt-4 max-w-md text-xs ui-text-muted">
            Masukan Anda sangat berharga untuk meningkatkan kerjasama dan pelayanan kami.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700"
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
      <PageShell onBack={goBack}>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/30">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Terjadi Kesalahan</h2>
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
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Ke Beranda
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // nama_gerai terhitung isi hanya jika tenant dipilih dari list
  const geraiFilled = !!selectedTenant;
  const otherRequired = ['lokasi_zona', 'kategori', 'kenaikan_traffic', 'kenaikan_sales'] as const;
  const requiredCount = 1 + otherRequired.length;
  const filledCount = (geraiFilled ? 1 : 0) + otherRequired.filter(f => formData[f].trim()).length;
  const progress = Math.round((filledCount / requiredCount) * 100);

  const fieldErrorMap = (() => {
    const map: Record<string, string> = {};
    const patterns: Array<[RegExp, string]> = [
      [/[Nn]ama gerai|[Pp]ilih gerai/i, 'nama_gerai'],
      [/[Ll]okasi/i, 'lokasi_zona'],
      [/[Kk]ategori/i, 'kategori'],
      [/traffic/i, 'kenaikan_traffic'],
      [/sales/i, 'kenaikan_sales'],
    ];
    for (const err of fieldErrors) {
      for (const [re, field] of patterns) {
        if (re.test(err)) { map[field] = err; break; }
      }
    }
    return map;
  })();

  return (
    <div className="min-h-screen scroll-smooth bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary-600 transition hover:text-brand-primary-700 dark:text-brand-primary-400 dark:hover:text-brand-primary-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <span className="text-xs font-semibold text-brand-primary-600 dark:text-brand-primary-400">
            Metropolitan Mall Bekasi
          </span>
        </div>

      {/* Event banner */}
      <div className="mb-6 rounded-2xl border border-brand-primary-200 bg-brand-primary-50 p-4 dark:border-brand-primary-800 dark:bg-brand-primary-950/40">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-primary-100 dark:bg-brand-primary-900/50">
            <ClipboardCheck className="h-6 w-6 text-brand-primary-600 dark:text-brand-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-primary-600 dark:text-brand-primary-400">
              Self-Assessment Tenant
            </span>
            <h1 className="mt-0.5 break-words text-lg font-bold leading-snug text-brand-primary-900 dark:text-brand-primary-100">
              {event.acara}
            </h1>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-brand-primary-700 dark:text-brand-primary-300">
              {event.tanggal && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {event.tanggal}
                </span>
              )}
              {event.lokasi && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.lokasi}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-brand-primary-700 dark:text-brand-primary-300">
          Bantu kami meningkatkan pelayanan dengan memberikan penilaian dan masukan untuk event ini.
        </p>
      </div>

      {/* Section stepper */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          {[
            { num: 1, label: 'Informasi Gerai', filled: !!(selectedTenant && formData.lokasi_zona && formData.kategori) },
            { num: 2, label: 'Evaluasi', filled: !!(formData.kenaikan_traffic && formData.kenaikan_sales) },
            { num: 3, label: 'Umpan Balik', filled: formData.feedback_teks.trim().length > 0 },
          ].map(step => (
            <div key={step.num} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition ${
                step.filled
                  ? 'bg-emerald-500 text-white'
: 'bg-slate-200 ui-text-muted dark:bg-slate-700 '
              }`}>
                {step.filled ? '✓' : step.num}
              </div>
              <span className="sr-only truncate text-[11px] font-medium text-slate-600 dark:text-slate-400 sm:not-sr-only">{step.label}</span>
            </div>
          ))}
        </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Top-level errors */}
        {fieldErrors.length > 0 && (
          <div ref={errorAlertRef} role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
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
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
            Bagian 1: Informasi Gerai
          </h2>
          <p className="mb-4 text-xs ui-text-muted">
            Isi informasi dasar tenant dan lokasi gerai Anda di Metropolitan Mall Bekasi.
          </p>

          <div className="space-y-4">
            {/* Tenant search + badge */}
            <div>
              <label htmlFor="tenant-survey-gerai" className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Building2 className="h-3.5 w-3.5" />
                Nama Gerai
                <span className="text-red-500">*</span>
              </label>
              <TenantSearchSelect
                id="tenant-survey-gerai"
                value={selectedTenant?.name || formData.nama_gerai}
                onChange={updateField('nama_gerai')}
                onTenantSelect={handleTenantSelect}
                required
                error={fieldErrorMap.nama_gerai}
              />
              {selectedTenant && (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
                  {selectedTenant.logo ? (
                    <img src={selectedTenant.logo} alt="" className="h-8 w-8 shrink-0 rounded-md border border-emerald-200 object-cover dark:border-emerald-700" onError={(e) => { (e.currentTarget.style.display = 'none'); }} />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-[10px] font-bold text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                      {selectedTenant.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-emerald-800 dark:text-emerald-200">{selectedTenant.name}</p>
                    <p className="truncate text-[10px] text-emerald-600 dark:text-emerald-400">
                      {selectedTenant.category}{selectedTenant.floor ? ` • ${selectedTenant.floor}` : ''}{selectedTenant.lot ? ` • Lot ${selectedTenant.lot}` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Auto-detect warnings */}
            {selectedTenant && !formData.lokasi_zona && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Lokasi tidak terdeteksi otomatis — silakan pilih manual dari dropdown.</span>
                </div>
              </div>
            )}
            {selectedTenant && !formData.kategori && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Kategori tidak terdeteksi otomatis — silakan pilih manual.</span>
                </div>
              </div>
            )}

            {/* Lokasi with auto-filled indicator */}
            <div className="relative">
              <label htmlFor="tenant-survey-lokasi" className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                Lokasi / Zona
                <span className="text-red-500">*</span>
                {autoFilled.lokasi_zona && (
                    <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-700">Auto</span>
                )}
              </label>
              <select
                id="tenant-survey-lokasi"
                value={formData.lokasi_zona}
                onChange={(e) => updateField('lokasi_zona')(e.target.value)}
                aria-required="true"
                aria-invalid={!!fieldErrorMap.lokasi_zona || undefined}
                aria-describedby={fieldErrorMap.lokasi_zona ? 'tenant-survey-lokasi-error' : undefined}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-800 transition hover:border-slate-400 focus:border-brand-primary-400 focus:outline-none focus:ring-1 focus:ring-brand-primary-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
              >
                <option value="">Pilih lokasi / zona</option>
                {SURVEY_OPTIONS.lokasi_zona.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 text-slate-400" />
              {fieldErrorMap.lokasi_zona && (
                <p id="tenant-survey-lokasi-error" className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400" role="alert">
                  <AlertTriangle className="h-3 w-3" />
                  {fieldErrorMap.lokasi_zona}
                </p>
              )}
            </div>

            {/* Kategori with auto-filled indicator */}
            <div>
              {autoFilled.kategori && (
                <div className="mb-1">
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-700">Auto — terdeteksi dari data tenant</span>
                </div>
              )}
              <RadioGroup
                label="Kategori Gerai"
                options={SURVEY_OPTIONS.kategori}
                value={formData.kategori}
                onChange={updateField('kategori')}
                required
                error={fieldErrorMap.kategori}
              />
            </div>

            {/* PIC fields (optional) */}
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
              <p className="mb-3 text-xs font-medium ui-text-muted">
                Informasi PIC (opsional)
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="tenant-survey-pic-name" className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    Nama PIC
                  </label>
                  <input
                    id="tenant-survey-pic-name"
                    type="text"
                    value={formData.pic_name}
                    onChange={(e) => updateField('pic_name')(e.target.value)}
                    placeholder="Nama penanggung jawab"
                    maxLength={100}
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-brand-primary-400 focus:outline-none focus:ring-1 focus:ring-brand-primary-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="tenant-survey-pic-phone" className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <Phone className="h-3.5 w-3.5" />
                    No. Telepon PIC
                  </label>
                <input
                  id="tenant-survey-pic-phone"
                  type="tel"
                  inputMode="tel"
                  value={formData.pic_phone}
                  onChange={(e) => updateField('pic_phone')(e.target.value)}
                  placeholder="08xxx"
                  maxLength={20}
                  autoComplete="tel"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-brand-primary-400 focus:outline-none focus:ring-1 focus:ring-brand-primary-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
                />
              </div>
            </div>
            </div>
          </div>
        </section>

        {/* Section 2: Evaluasi Traffic & Sales */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
            Bagian 2: Evaluasi Traffic &amp; Sales
          </h2>
          <p className="mb-4 text-xs ui-text-muted">
            Bandingkan kondisi traffic pengunjung dan penjualan selama event berlangsung dibanding hari biasa.
          </p>

          <div className="space-y-4">
            <RadioGroup
              label="Kenaikan Traffic Pengunjung"
              options={SURVEY_OPTIONS.kenaikan_traffic}
              value={formData.kenaikan_traffic}
              onChange={updateField('kenaikan_traffic')}
              labels={TRAFFIC_LABELS}
              required
              error={fieldErrorMap.kenaikan_traffic}
            />

            <RadioGroup
              label="Kenaikan Sales / Penjualan"
              options={SURVEY_OPTIONS.kenaikan_sales}
              value={formData.kenaikan_sales}
              onChange={updateField('kenaikan_sales')}
              required
              error={fieldErrorMap.kenaikan_sales}
            />
          </div>
        </section>

        {/* Section 3: Umpan Balik */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
            Bagian 3: Umpan Balik
          </h2>
          <p className="mb-4 text-xs ui-text-muted">
            Sampaikan masukan Anda tentang event ini secara bebas (opsional).
          </p>

          <div>
            <textarea
              id="tenant-survey-feedback"
              aria-label="Masukan / Feedback"
              value={formData.feedback_teks}
              onChange={(e) => updateField('feedback_teks')(e.target.value)}
              placeholder="Ceritakan kesan atau saran Anda tentang event ini (opsional)"
              rows={5}
              maxLength={2000}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-brand-primary-400 focus:outline-none focus:ring-1 focus:ring-brand-primary-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
            />
            <p className="mt-1 text-right text-[10px] text-slate-400">
              {2000 - formData.feedback_teks.length} karakter tersisa
            </p>
          </div>
        </section>

        {/* Progress indicator */}
        <div className="space-y-1.5">
          <div className="overflow-hidden rounded-full bg-brand-primary-200 dark:bg-brand-primary-800">
            <div
              className="h-2 rounded-full bg-brand-primary-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] ui-text-muted">
            <span role="status" aria-live="polite">{progress}% selesai</span>
            <span>{filledCount} dari {requiredCount} field wajib terisi</span>
          </div>
        </div>

        {/* Submit — sticky on mobile */}
        <div className="sticky bottom-0 z-10 -mx-4 space-y-3 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/95 sm:static sm:mx-0 sm:space-y-3 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          {filledCount < requiredCount && (
            <p className="text-center text-xs ui-text-muted sm:text-right">
              Lengkapi {requiredCount - filledCount} field wajib lagi untuk mengirim
            </p>
          )}
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
              disabled={formStatus === 'submitting' || filledCount < requiredCount}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${
                filledCount >= requiredCount
                  ? 'bg-brand-primary-600 hover:bg-brand-primary-700'
                  : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              {formStatus === 'submitting' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Kirim Survey
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] ui-text-muted">
          <Shield className="mr-1 inline h-3 w-3" />
          Survey ini dapat diakses tanpa login. Identitas Anda akan disimpan secara anonim.
        </p>
      </form>
      </div>
    </div>
  );
}