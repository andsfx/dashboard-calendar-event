import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Building2, Loader2, AlertTriangle, ClipboardCheck,
  Send, ArrowLeft, MapPin, Calendar, User,
  ChevronLeft, RefreshCw, CheckCircle2, Shield, Phone,
} from 'lucide-react';
import { Button } from '../shadcn/button';
import { Input } from '../shadcn/input';
import { NativeSelect } from '../shadcn/native-select';
import { Textarea } from '../shadcn/textarea';
import { Label } from '../shadcn/label';
import {
  fetchPublicTenantSurveyEvent,
  checkPublicTenantSurveyDuplicate,
  submitPublicTenantSurvey,
  type TenantDropdownOption,
  type PublicTenantSurveySubmission,
} from '../../utils/domainApi';
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

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main
      id="konten-utama"
      tabIndex={-1}
      className="min-h-dvh scroll-smooth bg-[var(--wf-board-2)] outline-none"
    >
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/tenant-survey"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--wf-accent)] transition-colors hover:text-[var(--wf-accent)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Pilih Event
          </Link>
          <span className="text-xs font-semibold text-[var(--wf-accent)]">
            Metropolitan Mall Bekasi
          </span>
        </div>
        {children}
      </div>
    </main>
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
    }));
    setAutoFilled({ lokasi_zona: !!zona, kategori: !!kat });
  }, []);

  useEffect(() => {
    if (!eventId) {
      setError('Tautan event tidak lengkap');
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
      setFieldErrors(['Pilih tenant dari daftar, bukan ketik bebas.']);
      setFormStatus('idle');
      submittingRef.current = false;
      requestAnimationFrame(() => {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        errorAlertRef.current?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });
      });
      return;
    }

    const submission: PublicTenantSurveySubmission = {
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

    const validation = validateTenantSurvey({ ...submission });
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
      await submitPublicTenantSurvey(submission);
      setFormStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim survei';
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

  const handleRetry = useCallback(() => {
    setFormStatus('idle');
    setSubmitError('');
    submittingRef.current = false;
  }, []);

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--wf-accent)]" />
          <p className="mt-3 text-sm text-[var(--wf-ink-muted)]">Memuat survei…</p>
        </div>
      </PageShell>
    );
  }

  if (error || !event) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/30">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[var(--wf-ink)]">Event tidak ditemukan</h2>
          <p className="mt-2 text-sm text-[var(--wf-ink-muted)]">
            {error || 'Event yang kamu cari tidak tersedia.'}
          </p>
          <Button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 h-auto inline-flex items-center gap-2 rounded-xl bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--wf-accent-ink)] shadow-sm transition-colors hover:bg-[var(--wf-accent)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Ke beranda
          </Button>
        </div>
      </PageShell>
    );
  }

  if (surveyClosed) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--wf-board-2)]">
            <Shield className="h-8 w-8 text-[var(--wf-ink-muted)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--wf-ink)]">Survei ditutup</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--wf-ink-muted)]">
            Penilaian mandiri tenant untuk event
            <span className="mx-1 font-semibold text-[var(--wf-accent)]">
              &quot;{event.acara}&quot;
            </span>
            tidak aktif atau sudah ditutup.
          </p>
          <Button
            type="button"
            onClick={() => navigate('/tenant-survey')}
            className="mt-6 h-auto inline-flex items-center gap-2 rounded-xl bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--wf-accent-ink)] shadow-sm transition-colors hover:bg-[var(--wf-accent)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Pilih event lain
          </Button>
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
          <h2 className="text-lg font-bold text-[var(--wf-ink)]">
            Kamu sudah mengisi survei
          </h2>
          <p className="mt-2 max-w-md text-sm text-[var(--wf-ink-muted)]">
            Kamu sudah pernah mengirim penilaian mandiri untuk event
            <span className="mx-1 font-semibold text-[var(--wf-accent)]">
              &quot;{event.acara}&quot;
            </span>
            dari perangkat ini. Setiap tenant hanya dapat mengirimkan satu survei per event.
          </p>
          <p className="mt-3 text-xs text-[var(--wf-ink-muted)]">
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
          <h2 className="text-lg font-bold text-[var(--wf-ink)]">Survei terkirim!</h2>
          <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">
            Terima kasih telah mengirimkan penilaian mandiri untuk event
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--wf-accent)]">
            &quot;{event.acara}&quot;
          </p>
          <p className="mt-4 max-w-md text-xs text-[var(--wf-ink-muted)]">
            Masukan kamu sangat berharga untuk meningkatkan kerja sama dan pelayanan kami.
          </p>
          <Button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 h-auto inline-flex items-center gap-2 rounded-xl bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--wf-accent-ink)] shadow-sm transition-colors hover:bg-[var(--wf-accent)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Button>
        </div>
      </PageShell>
    );
  }

  if (formStatus === 'error') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/30">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[var(--wf-ink)]">Terjadi kesalahan</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--wf-ink-muted)]">
            {submitError}
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleRetry}
              className="h-auto inline-flex items-center gap-2 rounded-xl border border-[var(--wf-rule-strong)] px-5 py-2.5 text-sm font-semibold text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)]"
            >
              <RefreshCw className="h-4 w-4" />
              Coba lagi
            </Button>
            <Button
              type="button"
              onClick={() => navigate('/')}
              className="h-auto inline-flex items-center gap-2 rounded-xl bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--wf-accent-ink)] shadow-sm transition-colors hover:bg-[var(--wf-accent)]"
            >
              <ChevronLeft className="h-4 w-4" />
              Ke beranda
            </Button>
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
      [/[Nn]ama tenant|[Pp]ilih tenant/i, 'nama_gerai'],
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
    <main
      id="konten-utama"
      tabIndex={-1}
      className="min-h-dvh scroll-smooth bg-[var(--wf-board-2)] outline-none"
    >
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/tenant-survey"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--wf-accent)] transition-colors hover:text-[var(--wf-accent)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Pilih Event
          </Link>
          <span className="text-xs font-semibold text-[var(--wf-accent)]">
            Metropolitan Mall Bekasi
          </span>
        </div>

      {/* Event banner */}
      <div className="mb-6 rounded-2xl border border-[var(--wf-accent)]/40 bg-[var(--wf-accent-soft)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--wf-accent-soft)]">
            <ClipboardCheck className="h-6 w-6 text-[var(--wf-accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--wf-accent)]">
              Penilaian mandiri tenant
            </span>
            <h1 className="mt-0.5 break-words text-lg font-bold leading-snug text-[var(--wf-accent)]">
              {event.acara}
            </h1>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--wf-accent)]">
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
        <p className="mt-3 text-xs text-[var(--wf-accent)]">
          Bantu kami meningkatkan pelayanan dengan memberikan penilaian dan masukan untuk event ini.
        </p>
      </div>

      {/* Section stepper */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-3">
          {[
            { num: 1, label: 'Informasi tenant', filled: !!(selectedTenant && formData.lokasi_zona && formData.kategori) },
            { num: 2, label: 'Evaluasi', filled: !!(formData.kenaikan_traffic && formData.kenaikan_sales) },
            { num: 3, label: 'Umpan balik', filled: formData.feedback_teks.trim().length > 0 },
          ].map(step => (
            <div key={step.num} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                step.filled
                  ? 'bg-emerald-700 text-white dark:bg-emerald-300 dark:text-emerald-950'
                  : 'bg-[var(--wf-rule)] text-[var(--wf-ink-muted)]'
              }`}>
                {step.filled ? '✓' : step.num}
              </div>
              <span className="sr-only truncate text-[11px] font-medium text-[var(--wf-ink-muted)] sm:not-sr-only">{step.label}</span>
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

        {/* Section 1: Informasi Tenant */}
        <section className="rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4">
          <h2 className="mb-1 text-sm font-bold text-[var(--wf-ink)]">
            Bagian 1: Informasi tenant
          </h2>
          <p className="mb-4 text-xs text-[var(--wf-ink-muted)]">
            Isi informasi dasar dan lokasi tenant kamu di Metropolitan Mall Bekasi.
          </p>

          <div className="space-y-4">
            {/* Tenant search + badge */}
            <div>
              <Label htmlFor="tenant-survey-tenant" className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--wf-ink-muted)]">
                <Building2 className="h-3.5 w-3.5" />
                Nama Tenant
                <span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
              </Label>
              <TenantSearchSelect
                id="tenant-survey-tenant"
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
                  <span>Lokasi tidak terdeteksi otomatis. Silakan pilih dari daftar.</span>
                </div>
              </div>
            )}
            {selectedTenant && !formData.kategori && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Kategori tidak terdeteksi otomatis. Silakan pilih manual.</span>
                </div>
              </div>
            )}

            {/* Lokasi with auto-filled indicator */}
            <div className="relative">
              <Label htmlFor="tenant-survey-lokasi" className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--wf-ink-muted)]">
                <MapPin className="h-3.5 w-3.5" />
                Zona
                <span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                {autoFilled.lokasi_zona && (
                    <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-700">Otomatis</span>
                )}
              </Label>
              <NativeSelect
                id="tenant-survey-lokasi"
                value={formData.lokasi_zona}
                onChange={(e) => updateField('lokasi_zona')(e.target.value)}
                aria-required="true"
                aria-invalid={!!fieldErrorMap.lokasi_zona || undefined}
                aria-describedby={fieldErrorMap.lokasi_zona ? 'tenant-survey-lokasi-error' : undefined}
                className="w-full [&>select]:h-auto [&>select]:rounded-xl [&>select]:border-[var(--wf-rule-strong)] [&>select]:bg-[var(--wf-board)] [&>select]:px-3 [&>select]:py-2 [&>select]:pr-9 [&>select]:text-sm [&>select]:text-[var(--wf-ink)] [&>select:hover]:border-[var(--wf-rule-control)] [&>select:focus]:border-[var(--wf-accent)] [&>select:focus]:ring-1 [&>select:focus]:ring-[var(--wf-accent)]"
              >
                <option value="">Pilih zona</option>
                {SURVEY_OPTIONS.lokasi_zona.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </NativeSelect>
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
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-700">Otomatis · terdeteksi dari data tenant</span>
                </div>
              )}
              <RadioGroup
                label="Kategori tenant"
                options={SURVEY_OPTIONS.kategori}
                value={formData.kategori}
                onChange={updateField('kategori')}
                required
                error={fieldErrorMap.kategori}
              />
            </div>

            {/* PIC fields (optional) */}
            <div className="mt-4 border-t border-[var(--wf-rule)] pt-4">
              <p className="mb-3 text-xs font-medium text-[var(--wf-ink-muted)]">
                Informasi penanggung jawab (opsional)
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="tenant-survey-pic-name" className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--wf-ink-muted)]">
                    <User className="h-3.5 w-3.5" />
                    Nama penanggung jawab
                  </Label>
                  <Input
                    id="tenant-survey-pic-name"
                    type="text"
                    value={formData.pic_name}
                    onChange={(e) => updateField('pic_name')(e.target.value)}
                    placeholder="Nama penanggung jawab"
                    maxLength={100}
                    autoComplete="name"
                    className="h-auto w-full rounded-xl border border-[var(--wf-rule-strong)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)] transition-colors hover:border-[var(--wf-rule-control)] focus:border-[var(--wf-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--wf-accent)]"
                  />
                </div>
                <div>
                  <Label htmlFor="tenant-survey-pic-phone" className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--wf-ink-muted)]">
                    <Phone className="h-3.5 w-3.5" />
                    Nomor telepon penanggung jawab
                  </Label>
                <Input
                  id="tenant-survey-pic-phone"
                  type="tel"
                  inputMode="tel"
                  value={formData.pic_phone}
                  onChange={(e) => updateField('pic_phone')(e.target.value)}
                  placeholder="08xxx"
                  maxLength={20}
                  autoComplete="tel"
                  className="h-auto w-full rounded-xl border border-[var(--wf-rule-strong)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)] transition-colors hover:border-[var(--wf-rule-control)] focus:border-[var(--wf-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--wf-accent)]"
                />
              </div>
            </div>
            </div>
          </div>
        </section>

        {/* Section 2: Evaluasi Traffic & Sales */}
        <section className="rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4">
          <h2 className="mb-1 text-sm font-bold text-[var(--wf-ink)]">
            Bagian 2: Evaluasi kunjungan dan penjualan
          </h2>
          <p className="mb-4 text-xs text-[var(--wf-ink-muted)]">
            Bandingkan kondisi kunjungan pengunjung dan penjualan selama event berlangsung dibanding hari biasa.
          </p>

          <div className="space-y-4">
            <RadioGroup
              label="Kenaikan kunjungan pengunjung"
              options={SURVEY_OPTIONS.kenaikan_traffic}
              value={formData.kenaikan_traffic}
              onChange={updateField('kenaikan_traffic')}
              labels={TRAFFIC_LABELS}
              required
              error={fieldErrorMap.kenaikan_traffic}
            />

            <RadioGroup
              label="Kenaikan penjualan"
              options={SURVEY_OPTIONS.kenaikan_sales}
              value={formData.kenaikan_sales}
              onChange={updateField('kenaikan_sales')}
              required
              error={fieldErrorMap.kenaikan_sales}
            />
          </div>
        </section>

        {/* Section 3: Umpan Balik */}
        <section className="scroll-mb-28 rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4 sm:scroll-mb-0">
          <h2 className="mb-1 text-sm font-bold text-[var(--wf-ink)]">
            Bagian 3: Umpan balik
          </h2>
          <p className="mb-4 text-xs text-[var(--wf-ink-muted)]">
            Sampaikan masukan kamu tentang event ini secara bebas (opsional).
          </p>

          <div>
            <Textarea
              id="tenant-survey-feedback"
              aria-label="Masukan dan umpan balik"
              value={formData.feedback_teks}
              onChange={(e) => updateField('feedback_teks')(e.target.value)}
              placeholder="Ceritakan kesan atau saran kamu tentang event ini (opsional)"
              rows={5}
              maxLength={2000}
              className="w-full rounded-xl border border-[var(--wf-rule-strong)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)] transition-colors hover:border-[var(--wf-rule-control)] focus:border-[var(--wf-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--wf-accent)]"
            />
            <p className="mt-1 text-right text-[10px] text-[var(--wf-ink-muted)]">
              {2000 - formData.feedback_teks.length} karakter tersisa
            </p>
          </div>
        </section>

        {/* Progress indicator */}
        <div className="space-y-1.5">
          <div className="overflow-hidden rounded-full bg-[var(--wf-accent-soft)]">
            <div
              className="h-2 rounded-full bg-[var(--wf-accent)] transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--wf-ink-muted)]">
            <span role="status" aria-live="polite">{progress}% selesai</span>
            <span>{filledCount} dari {requiredCount} field wajib terisi</span>
          </div>
        </div>

        {/* Submit — sticky on mobile */}
        <div className="sticky bottom-0 z-10 -mx-4 space-y-3 border-t border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:static sm:mx-0 sm:space-y-3 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          {filledCount < requiredCount && (
            <p className="text-center text-xs text-[var(--wf-ink-muted)] sm:text-right">
              Lengkapi {requiredCount - filledCount} field wajib lagi untuk mengirim
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/tenant-survey')}
              disabled={formStatus === 'submitting'}
              className="inline-flex min-h-[44px] h-auto items-center justify-center gap-2 rounded-xl border border-[var(--wf-rule-strong)] px-5 py-2.5 text-sm font-semibold text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Batal
            </Button>
            <Button
              type="submit"
              disabled={formStatus === 'submitting' || filledCount < requiredCount}
              className={`inline-flex min-h-[44px] h-auto items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)] focus-visible:ring-offset-2  ${
                filledCount >= requiredCount
                  ? 'bg-[var(--wf-accent)] hover:bg-[var(--wf-accent)]'
                  : 'bg-[var(--wf-rule-strong)] cursor-not-allowed'
              }`}
            >
              {formStatus === 'submitting' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Kirim survei
            </Button>
          </div>
        </div>

        <p className="text-center text-[11px] text-[var(--wf-ink-muted)]">
          <Shield className="mr-1 inline h-3 w-3" />
          Survei ini dapat diakses tanpa login. Nama tenant dan kontak penanggung jawab yang kamu isi tersimpan teridentifikasi untuk verifikasi.
        </p>
      </form>
      </div>
    </main>
  );
}