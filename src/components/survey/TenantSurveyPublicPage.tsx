import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2, Loader2, AlertTriangle, ClipboardCheck,
  Send, ArrowLeft, MapPin, Calendar, Briefcase, Mail, Phone,
  Star, MessageSquare, Lightbulb, ChevronLeft, RefreshCw,
  CheckCircle2, Sparkles,
} from 'lucide-react';
import {
  fetchPublicTenantSurveyEvent,
  checkPublicTenantSurveyDuplicate,
  submitPublicTenantSurvey,
} from '../../utils/supabaseApi';
import { getDeviceFingerprint } from '../../utils/fingerprint';
import { validateTenantSurvey } from '../../utils/validation';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error' | 'duplicate';

const RATING_FIELDS = [
  {
    key: 'venue_rating' as const,
    label: 'Kualitas Venue',
    description: 'Kondisi venue, lokasi, akses, dan fasilitas',
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    key: 'management_rating' as const,
    label: 'Kualitas Manajemen',
    description: 'Kualitas komunikasi dan dukungan tim manajemen',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    key: 'event_organization_rating' as const,
    label: 'Organisasi Event',
    description: 'Kelancaran organisasi event secara keseluruhan',
    icon: <Star className="h-4 w-4" />,
  },
  {
    key: 'booth_facility_rating' as const,
    label: 'Fasilitas Booth',
    description: 'Fasilitas booth (listrik, signage, area)',
    icon: <MapPin className="h-4 w-4" />,
  },
] as const;

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

interface RatingStarsProps {
  label: string;
  description?: string;
  value: number | null;
  onChange: (v: number) => void;
  error?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

function RatingStars({ label, description, value, onChange, error, icon, disabled }: RatingStarsProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <fieldset className="space-y-1.5" disabled={disabled}>
      <legend className="flex w-full items-center gap-2">
        {icon && <span className="text-violet-500 dark:text-violet-400">{icon}</span>}
        <div className="flex-1">
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            {label}
          </span>
          {description && (
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              {description}
            </span>
          )}
        </div>
        <span className={`min-w-[2.5rem] text-right text-sm font-bold ${
          value != null && value >= 4 ? 'text-emerald-500'
          : value != null && value >= 3 ? 'text-yellow-500'
          : value != null ? 'text-red-500'
          : 'text-slate-400'
        }`}>
          {value != null ? `${value}/5` : '—/—'}
        </span>
      </legend>

      <div className="flex items-center gap-1.5" role="radiogroup" aria-label={label}>
        {stars.map(n => {
          const selected = value === n;
          const filled = value != null && n <= value;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${n} dari 5`}
              disabled={disabled}
              onClick={() => onChange(n)}
              className={`
                flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold
                transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
                ${selected
                  ? 'scale-110 bg-violet-600 text-white shadow-md ring-2 ring-violet-300'
                  : filled
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700'
                }
              `}
            >
              {n}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </fieldset>
  );
}

export default function TenantSurveyPublicPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  // ─── State ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<{
    id: string; acara: string; tanggal: string; lokasi: string; eo: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [fieldLevelErrors, setFieldLevelErrors] = useState<Record<string, string>>({});

  // Form state
  const [ratings, setRatings] = useState<Record<string, number | null>>({
    venue_rating: null,
    management_rating: null,
    event_organization_rating: null,
    booth_facility_rating: null,
    overall_rating: null,
  });

  const [identity, setIdentity] = useState({
    tenant_name: '',
    tenant_organization: '',
    tenant_email: '',
    tenant_phone: '',
  });

  const [comments, setComments] = useState({
    feedback_comment: '',
    improvement_suggestion: '',
  });

  // ─── Initial load: event + duplicate check ─────────────────────
  useEffect(() => {
    if (!eventId) {
      setError('Event ID tidak ditemukan di URL');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Fetch event
        const ev = await fetchPublicTenantSurveyEvent(eventId);
        if (cancelled) return;
        if (!ev) {
          setError('Event tidak ditemukan atau sudah berakhir');
          setLoading(false);
          return;
        }
        setEvent(ev);

        // Pre-fill tenant_name from event.eo if available
        setIdentity(prev => ({
          ...prev,
          tenant_name: prev.tenant_name || ev.eo || '',
        }));

        // Check duplicate by fingerprint
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

  // ─── Handlers ──────────────────────────────────────────────────
  const setRating = useCallback((key: string, val: number) => {
    setRatings(prev => ({ ...prev, [key]: val }));
    setFieldLevelErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !event) return;

    setFormStatus('submitting');
    setSubmitError('');
    setFieldErrors([]);
    setFieldLevelErrors({});

    // Build submission object
    const submission = {
      event_id: eventId,
      tenant_name: identity.tenant_name,
      tenant_organization: identity.tenant_organization,
      tenant_email: identity.tenant_email,
      tenant_phone: identity.tenant_phone,
      venue_rating: ratings.venue_rating ?? null,
      management_rating: ratings.management_rating ?? null,
      event_organization_rating: ratings.event_organization_rating ?? null,
      booth_facility_rating: ratings.booth_facility_rating ?? null,
      overall_rating: ratings.overall_rating ?? null,
      feedback_comment: comments.feedback_comment,
      improvement_suggestion: comments.improvement_suggestion,
      device_fingerprint: getDeviceFingerprint(),
    };

    // Client-side validation
    const validation = validateTenantSurvey(submission as unknown as Record<string, unknown>, false);
    if (!validation.valid) {
      const fieldErrs: Record<string, string> = {};
      for (const err of validation.errors) {
        for (const f of RATING_FIELDS) {
          if (err.startsWith(f.label) && !fieldErrs[f.key]) {
            fieldErrs[f.key] = err;
          }
        }
      }
      setFieldLevelErrors(fieldErrs);
      setFieldErrors(validation.errors);
      setFormStatus('idle');
      return;
    }

    try {
      await submitPublicTenantSurvey(submission);
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
  }, [eventId, event, identity, ratings, comments]);

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

  // ─── Page Shell ─────────────────────────────────────────────────
  const PageShell = ({ children }: { children: ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950/30">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        {/* Header */}
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

  // ─── Render states ─────────────────────────────────────────────

  // Loading
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

  // Error (event not found)
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

  // Duplicate
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
              "{event.acara}"
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

  // Success
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
            "{event.acara}"
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

  // Error (after submit)
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

  // ─── Form ───────────────────────────────────────────────────────
  const filledCount = RATING_FIELDS.filter(f => ratings[f.key] != null).length;
  const progress = Math.round((filledCount / RATING_FIELDS.length) * 100);

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

        {/* Tenant identity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
            Identitas Tenant/EO
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Nama Tenant/EO"
              required
              value={identity.tenant_name}
              onChange={(v) => setIdentity(p => ({ ...p, tenant_name: v }))}
              placeholder="Nama organisasi"
              icon={<Briefcase className="h-3.5 w-3.5" />}
            />
            <Field
              label="Organisasi"
              value={identity.tenant_organization}
              onChange={(v) => setIdentity(p => ({ ...p, tenant_organization: v }))}
              placeholder="Nama perusahaan (opsional)"
            />
            <Field
              label="Email"
              type="email"
              value={identity.tenant_email}
              onChange={(v) => setIdentity(p => ({ ...p, tenant_email: v }))}
              placeholder="email@contoh.com (opsional)"
              icon={<Mail className="h-3.5 w-3.5" />}
            />
            <Field
              label="Telepon"
              type="tel"
              value={identity.tenant_phone}
              onChange={(v) => setIdentity(p => ({ ...p, tenant_phone: v }))}
              placeholder="08xxxxxxxxxx (opsional)"
              icon={<Phone className="h-3.5 w-3.5" />}
            />
          </div>
        </section>

        {/* Ratings */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Penilaian Event
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {progress}% selesai
            </span>
          </div>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Beri nilai dari 1 (sangat kurang) sampai 5 (sangat baik)
          </p>
          <div className="space-y-5">
            {RATING_FIELDS.map(field => (
              <RatingStars
                key={field.key}
                label={field.label}
                description={field.description}
                value={ratings[field.key] ?? null}
                onChange={(v) => setRating(field.key, v)}
                error={fieldLevelErrors[field.key]}
                icon={field.icon}
              />
            ))}
          </div>
        </section>

        {/* Comments */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
            Feedback (Opsional)
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                <MessageSquare className="h-3.5 w-3.5" />
                Komentar / Feedback
              </label>
              <textarea
                value={comments.feedback_comment}
                onChange={(e) => setComments(p => ({ ...p, feedback_comment: e.target.value }))}
                placeholder="Bagikan komentar, kesan, atau masukan Anda tentang event ini..."
                rows={3}
                maxLength={2000}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
              <p className="mt-1 text-right text-[10px] text-slate-400">
                {2000 - comments.feedback_comment.length} karakter tersisa
              </p>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Lightbulb className="h-3.5 w-3.5" />
                Saran Perbaikan
              </label>
              <textarea
                value={comments.improvement_suggestion}
                onChange={(e) => setComments(p => ({ ...p, improvement_suggestion: e.target.value }))}
                placeholder="Saran atau ide perbaikan untuk event selanjutnya..."
                rows={3}
                maxLength={2000}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
              <p className="mt-1 text-right text-[10px] text-slate-400">
                {2000 - comments.improvement_suggestion.length} karakter tersisa
              </p>
            </div>
          </div>
        </section>

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
