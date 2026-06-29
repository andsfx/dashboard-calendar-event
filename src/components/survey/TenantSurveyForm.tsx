import { useState, useCallback, useMemo, type ReactNode } from 'react';
import {
  Building2, Loader2, AlertTriangle, CheckCircle2, Save, Send,
  Star, MessageSquare, Lightbulb, ChevronLeft, RefreshCw,
  MapPin, Calendar, Briefcase, Mail, Phone,
} from 'lucide-react';
import type { EventItem, TenantSurveyFormData } from '../../types';
import {
  TENANT_RATING_KEYS, TENANT_RATING_LABELS, TENANT_RATING_MIN, TENANT_RATING_MAX,
  validateTenantSurvey,
} from '../../utils/validation';

// ─── Rating Field Metadata ───────────────────────────────────────

interface RatingField {
  key: 'venue_rating' | 'management_rating' | 'event_organization_rating' | 'booth_facility_rating';
  label: string;
  description: string;
  icon: ReactNode;
}

const RATING_FIELDS: readonly RatingField[] = [
  {
    key: 'venue_rating',
    label: TENANT_RATING_LABELS.venue_rating ?? 'Kualitas Venue',
    description: 'Kondisi venue, lokasi, akses, dan fasilitas',
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    key: 'management_rating',
    label: TENANT_RATING_LABELS.management_rating ?? 'Kualitas Manajemen',
    description: 'Kualitas komunikasi dan dukungan tim manajemen',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    key: 'event_organization_rating',
    label: TENANT_RATING_LABELS.event_organization_rating ?? 'Organisasi Event',
    description: 'Kelancaran organisasi event secara keseluruhan',
    icon: <Star className="h-4 w-4" />,
  },
  {
    key: 'booth_facility_rating',
    label: TENANT_RATING_LABELS.booth_facility_rating ?? 'Fasilitas Booth',
    description: 'Fasilitas booth (listrik, signage, area)',
    icon: <MapPin className="h-4 w-4" />,
  },
] as const;

// ─── 1-5 Star Rating Input ───────────────────────────────────────

interface RatingStarsProps {
  label: string;
  description?: string;
  value: number | null;
  onChange: (value: number) => void;
  error?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

function RatingStars({ label, description, value, onChange, error, icon, disabled }: RatingStarsProps) {
  const stars = Array.from({ length: TENANT_RATING_MAX }, (_, i) => i + 1);

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
          {value != null ? `${value}/${TENANT_RATING_MAX}` : '—/—'}
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
              aria-label={`${n} dari ${TENANT_RATING_MAX}`}
              disabled={disabled}
              onClick={() => onChange(n)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' && (value ?? 0) < TENANT_RATING_MAX) onChange((value ?? 0) + 1);
                if (e.key === 'ArrowLeft' && (value ?? 0) > TENANT_RATING_MIN) onChange((value ?? 0) - 1);
              }}
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

// ─── Main Form Component ─────────────────────────────────────────

interface TenantSurveyFormProps {
  event: Pick<EventItem, 'id' | 'acara' | 'tanggal' | 'lokasi' | 'eo'>;
  initialData?: Partial<TenantSurveyFormData>;
  onSubmit: (data: TenantSurveyFormData, isDraft: boolean) => Promise<void>;
  onCancel: () => void;
  /** Disable the form (e.g., when duplicate detected) */
  disabled?: boolean;
  /** External submit state from parent (e.g., during API call) */
  isSubmitting?: boolean;
  /** External field errors keyed by field name (for duplicate/inline errors) */
  fieldErrors?: Record<string, string>;
}

export default function TenantSurveyForm({
  event,
  initialData,
  onSubmit,
  onCancel,
  disabled = false,
  isSubmitting = false,
  fieldErrors = {},
}: TenantSurveyFormProps) {
  // ─── State ──────────────────────────────────────────────────────
  const [ratings, setRatings] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {};
    for (const f of RATING_FIELDS) {
      const raw = initialData?.[f.key];
      init[f.key] = (raw === undefined ? null : raw) as number | null;
    }
    const overall = initialData?.overall_rating;
    init.overall_rating = overall === undefined ? null : (overall as number | null);
    return init;
  });

  const [identity, setIdentity] = useState({
    tenant_name: initialData?.tenant_name ?? event.eo ?? '',
    tenant_organization: initialData?.tenant_organization ?? '',
    tenant_email: initialData?.tenant_email ?? '',
    tenant_phone: initialData?.tenant_phone ?? '',
    business_category: initialData?.business_category ?? 'other',
    business_subcategory: initialData?.business_subcategory ?? '',
    sales_lift_pct: initialData?.sales_lift_pct ?? 0,
    traffic_lift_pct: initialData?.traffic_lift_pct ?? 0,
    pic_name: initialData?.pic_name ?? '',
    pic_phone: initialData?.pic_phone ?? '',
  });

  const [comments, setComments] = useState({
    feedback_comment: initialData?.feedback_comment ?? '',
    improvement_suggestion: initialData?.improvement_suggestion ?? '',
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [fieldLevelErrors, setFieldLevelErrors] = useState<Record<string, string>>({});

  // ─── Handlers ──────────────────────────────────────────────────
  const setRating = useCallback((key: string, val: number) => {
    setRatings(prev => ({ ...prev, [key]: val }));
    setFieldLevelErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const buildFormData = useCallback((): TenantSurveyFormData => ({
    event_id: event.id,
    ...identity,
    venue_rating: ratings.venue_rating ?? null,
    management_rating: ratings.management_rating ?? null,
    event_organization_rating: ratings.event_organization_rating ?? null,
    booth_facility_rating: ratings.booth_facility_rating ?? null,
    overall_rating: ratings.overall_rating ?? null,
    feedback_comment: comments.feedback_comment,
    improvement_suggestion: comments.improvement_suggestion,
  }), [event.id, identity, ratings, comments]);

  const handleSubmit = useCallback(async (isDraft: boolean) => {
    setErrors([]);
    setFieldLevelErrors({});

    const formData = buildFormData();
    const validation = validateTenantSurvey(formData as unknown as Record<string, unknown>, isDraft);

    if (!validation.valid) {
      // Map errors to fields for inline display
      const fieldErrs: Record<string, string> = {};
      for (const f of TENANT_RATING_KEYS) {
        const expected = `${TENANT_RATING_LABELS[f]}`;
        const matching = validation.errors.find(e => e.startsWith(expected));
        if (matching) fieldErrs[f] = matching;
      }
      setFieldLevelErrors(fieldErrs);
      setErrors(validation.errors);
      return;
    }

    await onSubmit(formData, isDraft);
  }, [buildFormData, onSubmit]);  // ─── Progress ───────────────────────────────────────────────────
  const progress = useMemo(() => {
    const filled = RATING_FIELDS.filter(f => ratings[f.key] != null).length;
    return Math.round((filled / RATING_FIELDS.length) * 100);
  }, [ratings]);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => { e.preventDefault(); void handleSubmit(false); }}
      noValidate
    >
      {/* Event context banner */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 dark:border-violet-800 dark:from-violet-950/40 dark:to-indigo-950/40">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
            <Building2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="truncate text-sm font-bold text-violet-900 dark:text-violet-100">
              {event.acara}
            </h2>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-violet-700 dark:text-violet-300">
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
        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-violet-700 dark:text-violet-300">Progress penilaian</span>
            <span className="font-semibold text-violet-900 dark:text-violet-100">{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-violet-200 dark:bg-violet-800">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top-level errors */}
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                Mohon perbaiki {errors.length} kesalahan:
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-red-700 dark:text-red-300">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* External field errors (e.g. duplicate from server) */}
      {Object.entries(fieldErrors).map(([field, msg]) => (
        <div
          key={field}
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{msg}</p>
          </div>
        </div>
      ))}

      {/* Identity section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
          Informasi Tenant/EO
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Nama EO/Tenant"
            required
            value={identity.tenant_name}
            onChange={(v) => setIdentity(p => ({ ...p, tenant_name: v }))}
            placeholder="Nama organisasi"
            icon={<Briefcase className="h-3.5 w-3.5" />}
            disabled={disabled}
          />
          <Field
            label="Organisasi"
            value={identity.tenant_organization}
            onChange={(v) => setIdentity(p => ({ ...p, tenant_organization: v }))}
            placeholder="Nama perusahaan (opsional)"
            disabled={disabled}
          />
          <Field
            label="Email"
            type="email"
            value={identity.tenant_email}
            onChange={(v) => setIdentity(p => ({ ...p, tenant_email: v }))}
            placeholder="email@contoh.com (opsional)"
            icon={<Mail className="h-3.5 w-3.5" />}
            disabled={disabled}
          />
          <Field
            label="Telepon"
            type="tel"
            value={identity.tenant_phone}
            onChange={(v) => setIdentity(p => ({ ...p, tenant_phone: v }))}
            placeholder="08xxxxxxxxxx (opsional)"
            icon={<Phone className="h-3.5 w-3.5" />}
            disabled={disabled}
          />
          <Field
            label="Nama PIC"
            value={identity.pic_name}
            onChange={(v) => setIdentity(p => ({ ...p, pic_name: v }))}
            placeholder="Nama penanggung jawab (opsional)"
            disabled={disabled}
          />
          <Field
            label="No. Telepon PIC"
            type="tel"
            value={identity.pic_phone}
            onChange={(v) => setIdentity(p => ({ ...p, pic_phone: v }))}
            placeholder="08xxx (opsional)"
            icon={<Phone className="h-3.5 w-3.5" />}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Rating section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
          Penilaian Event
        </h3>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Beri nilai dari {TENANT_RATING_MIN} (sangat kurang) sampai {TENANT_RATING_MAX} (sangat baik)
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
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Optional comments */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
          Feedback (Opsional)
        </h3>
        <div className="space-y-3">
          <TextArea
            label="Komentar / Feedback"
            value={comments.feedback_comment}
            onChange={(v) => setComments(p => ({ ...p, feedback_comment: v }))}
            placeholder="Bagikan komentar, kesan, atau masukan Anda tentang event ini..."
            rows={3}
            maxLength={2000}
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            disabled={disabled}
          />
          <TextArea
            label="Saran Perbaikan"
            value={comments.improvement_suggestion}
            onChange={(v) => setComments(p => ({ ...p, improvement_suggestion: v }))}
            placeholder="Saran atau ide perbaikan untuk event selanjutnya..."
            rows={3}
            maxLength={2000}
            icon={<Lightbulb className="h-3.5 w-3.5" />}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Batal
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting || disabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Save className="h-4 w-4" />
          Simpan Draft
        </button>
        <button
          type="submit"
          disabled={isSubmitting || disabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Kirim Survey
        </button>
      </div>
    </form>
  );
}

// ─── Reusable Field Input ────────────────────────────────────────

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

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  icon?: ReactNode;
}

function TextArea({ label, value, onChange, placeholder, rows = 3, maxLength, disabled, icon }: TextAreaProps) {
  const remaining = maxLength ? maxLength - value.length : null;
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
        {icon}
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
      />
      {remaining !== null && (
        <p className="mt-1 text-right text-[10px] text-slate-400">
          {remaining} karakter tersisa
        </p>
      )}
    </div>
  );
}

// ─── Success / Error / Duplicate / Loading View Components ──────

export function TenantSurveySuccess({
  eventName,
  onBack,
}: {
  eventName: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Survey Terkirim!</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Terima kasih telah mengirimkan self-assessment untuk event
      </p>
      <p className="mt-0.5 text-sm font-semibold text-violet-600 dark:text-violet-400">
        "{eventName}"
      </p>
      <p className="mt-4 max-w-md text-xs text-slate-500 dark:text-slate-400">
        Masukan Anda sangat berharga untuk meningkatkan kualitas kerjasama dan pelayanan kami.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Dashboard
      </button>
    </div>
  );
}

export function TenantSurveyDuplicate({
  eventName,
  onBack,
  onViewExisting,
}: {
  eventName: string;
  onBack: () => void;
  onViewExisting?: () => void;
}) {
  return (
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
          "{eventName}"
        </span>
        Setiap tenant hanya dapat mengirimkan satu survey per event.
      </p>
      <div className="mt-6 flex gap-3">
        {onViewExisting && (
          <button
            type="button"
            onClick={onViewExisting}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-300 px-5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/40"
          >
            Lihat Survey
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </button>
      </div>
    </div>
  );
}

export function TenantSurveyError({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/30">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Terjadi Kesalahan</h2>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {message}
      </p>
      <div className="mt-6 flex gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </button>
        )}
      </div>
    </div>
  );
}

export function TenantSurveyLoading({ message = 'Memuat survey...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 dark:border-slate-700 dark:bg-slate-800">
      <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
