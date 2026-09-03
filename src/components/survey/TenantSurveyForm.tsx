import { useState, useCallback, useMemo, type ReactNode } from 'react';
import {
  Building2, Loader2, AlertTriangle, CheckCircle2, Save, Send,
  MessageSquare, ChevronLeft, RefreshCw,
  MapPin, Calendar, Phone,
} from 'lucide-react';
import type { EventItem, TenantSurveyFormData } from '../../types';
import { validateTenantSurvey } from '../../utils/validation';
import { SURVEY_OPTIONS } from '../../constants/survey-options';
import {
  TenantSearchSelect,
  RadioGroup,
  floorToZona,
  apiCategoryToKategori,
  TRAFFIC_LABELS,
} from './TenantSurveyShared';
import type { TenantDropdownOption } from '../../utils/supabaseApi';

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
}

export default function TenantSurveyForm({
  event,
  initialData,
  onSubmit,
  onCancel,
  disabled = false,
  isSubmitting = false,
}: TenantSurveyFormProps) {
  // ─── State ──────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    nama_gerai: initialData?.nama_gerai ?? '',
    lokasi_zona: initialData?.lokasi_zona ?? '',
    kategori: initialData?.kategori ?? '',
    kenaikan_traffic: initialData?.kenaikan_traffic ?? '',
    kenaikan_sales: initialData?.kenaikan_sales ?? '',
    feedback_teks: initialData?.feedback_teks ?? '',
    pic_name: initialData?.pic_name ?? '',
    pic_phone: initialData?.pic_phone ?? '',
  });

  const [selectedTenant, setSelectedTenant] = useState<TenantDropdownOption | null>(null);
  const [autoFilled, setAutoFilled] = useState<{ lokasi_zona: boolean; kategori: boolean }>({
    lokasi_zona: false,
    kategori: false,
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [fieldLevelErrors, setFieldLevelErrors] = useState<Record<string, string>>({});

  // ─── Handlers ──────────────────────────────────────────────────
  const updateField = (field: keyof typeof formData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'lokasi_zona') setAutoFilled(prev => ({ ...prev, lokasi_zona: false }));
    if (field === 'kategori') setAutoFilled(prev => ({ ...prev, kategori: false }));
    setFieldLevelErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleTenantSelect = useCallback((tenant: TenantDropdownOption | null) => {
    setSelectedTenant(tenant);
    if (!tenant) {
      // Retype/clear: drop auto-filled fields so stale MID data tidak nempel
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

  const buildFormData = useCallback((): TenantSurveyFormData => ({
    event_id: event.id,
    tenant_name: selectedTenant?.name || formData.nama_gerai || event.eo || '',
    tenant_organization: '',
    tenant_email: '',
    tenant_phone: '',
    business_category: 'other',
    business_subcategory: '',
    sales_lift_pct: null,
    traffic_lift_pct: null,
    venue_rating: null,
    management_rating: null,
    event_organization_rating: null,
    booth_facility_rating: null,
    overall_rating: null,
    feedback_comment: '',
    improvement_suggestion: '',
    nama_gerai: (selectedTenant?.name || formData.nama_gerai).trim(),
    lokasi_zona: formData.lokasi_zona,
    kategori: formData.kategori,
    kenaikan_traffic: formData.kenaikan_traffic,
    kenaikan_sales: formData.kenaikan_sales,
    feedback_teks: formData.feedback_teks.trim(),
    tenant_id: selectedTenant?.id || '',
    pic_name: formData.pic_name.trim(),
    pic_phone: formData.pic_phone.trim(),
  }), [event.id, event.eo, formData, selectedTenant]);

  const handleSubmit = useCallback(async (isDraft: boolean) => {
    setErrors([]);
    setFieldLevelErrors({});

    // Pick-from-list: submit non-draft wajib selectedTenant (bukan free-text)
    if (!isDraft && !selectedTenant) {
      const msg = 'Pilih gerai dari daftar, bukan ketik bebas.';
      setFieldLevelErrors({ nama_gerai: msg });
      setErrors([msg]);
      return;
    }

    const data = buildFormData();
    const validation = validateTenantSurvey(data as unknown as Record<string, unknown>, isDraft);

    if (!validation.valid) {
      const fieldErrs: Record<string, string> = {};
      const patterns: Array<[RegExp, string]> = [
        [/[Nn]ama gerai|[Pp]ilih gerai/i, 'nama_gerai'],
        [/[Ll]okasi/i, 'lokasi_zona'],
        [/[Kk]ategori/i, 'kategori'],
        [/traffic/i, 'kenaikan_traffic'],
        [/sales/i, 'kenaikan_sales'],
        [/[Pp]ic/i, 'pic_name'],
        [/[Tt]elepon/i, 'pic_phone'],
      ];
      for (const err of validation.errors) {
        let mapped = false;
        for (const [re, field] of patterns) {
          if (re.test(err)) { fieldErrs[field] = err; mapped = true; break; }
        }
        if (!mapped) fieldErrs._other = (fieldErrs._other ? fieldErrs._other + '; ' : '') + err;
      }
      setFieldLevelErrors(fieldErrs);
      setErrors(validation.errors);
      return;
    }

    await onSubmit(data, isDraft);
  }, [buildFormData, onSubmit, selectedTenant]);

  // ─── Progress ───────────────────────────────────────────────────
  // nama_gerai terhitung isi hanya jika tenant dipilih dari list
  const geraiFilled = !!selectedTenant;
  const otherRequired = ['lokasi_zona', 'kategori', 'kenaikan_traffic', 'kenaikan_sales'] as const;
  const requiredCount = 1 + otherRequired.length;
  const filledCount = (geraiFilled ? 1 : 0) + otherRequired.filter(f => (formData[f] ?? '').toString().trim()).length;
  const progress = Math.round((filledCount / requiredCount) * 100);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => { e.preventDefault(); void handleSubmit(false); }}
      noValidate
    >
      {/* Event context banner */}
      <div className="rounded-2xl border border-brand-primary-200 bg-brand-primary-50 p-4 dark:border-brand-primary-800 dark:bg-brand-primary-950/40">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary-100 dark:bg-brand-primary-900/50">
            <Building2 className="h-5 w-5 text-brand-primary-600 dark:text-brand-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="truncate text-sm font-bold text-brand-primary-900 dark:text-brand-primary-100">
              {event.acara}
            </h2>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-brand-primary-700 dark:text-brand-primary-300">
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
            <span className="text-brand-primary-700 dark:text-brand-primary-300">Progress</span>
            <span className="font-semibold text-brand-primary-900 dark:text-brand-primary-100">{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-primary-200 dark:bg-brand-primary-800">
            <div
              className="h-full rounded-full bg-brand-primary-500 transition-all duration-300"
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

      {/* Section 1: Informasi Gerai */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
          Informasi Gerai
        </h3>
        <p className="mb-4 text-xs ui-text-muted">
          Isi data gerai Anda di Metropolitan Mall Bekasi.
        </p>

        <div className="space-y-4">
          {/* Tenant search */}
          <div>
            <label htmlFor="ts-form-gerai" className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              Nama Gerai
              <span className="text-red-500">*</span>
            </label>
            <TenantSearchSelect
              id="ts-form-gerai"
              value={selectedTenant?.name || formData.nama_gerai}
              onChange={updateField('nama_gerai')}
              onTenantSelect={handleTenantSelect}
              disabled={disabled}
              required
              error={fieldLevelErrors.nama_gerai}
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
                <span>Lokasi tidak terdeteksi — silakan pilih manual dari dropdown.</span>
              </div>
            </div>
          )}
          {selectedTenant && !formData.kategori && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Kategori tidak terdeteksi — silakan pilih manual.</span>
              </div>
            </div>
          )}

          {/* Lokasi / Zona */}
          <div className="relative">
            <label htmlFor="ts-form-lokasi" className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              Lokasi / Zona
              <span className="text-red-500">*</span>
              {autoFilled.lokasi_zona && (
                <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-700">Auto</span>
              )}
            </label>
            <select
              id="ts-form-lokasi"
              value={formData.lokasi_zona}
              onChange={(e) => updateField('lokasi_zona')(e.target.value)}
              disabled={disabled}
              aria-required="true"
              aria-invalid={!!fieldLevelErrors.lokasi_zona || undefined}
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-800 transition hover:border-slate-400 focus:border-brand-primary-400 focus:outline-none focus:ring-1 focus:ring-brand-primary-400 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
            >
              <option value="">Pilih lokasi / zona</option>
              {SURVEY_OPTIONS.lokasi_zona.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            <ChevronLeft className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 rotate-90 text-slate-400" />
            {fieldLevelErrors.lokasi_zona && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400" role="alert">
                <AlertTriangle className="h-3 w-3" />
                {fieldLevelErrors.lokasi_zona}
              </p>
            )}
          </div>

          {/* Kategori */}
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
            disabled={disabled}
            required
            error={fieldLevelErrors.kategori}
          />
        </div>
      </section>

      {/* Section 2: Evaluasi Traffic & Sales */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
          Evaluasi Traffic &amp; Sales
        </h3>
        <p className="mb-4 text-xs ui-text-muted">
          Bandingkan pengunjung dan penjualan selama event dengan hari biasa.
        </p>

        <div className="space-y-4">
          <RadioGroup
            label="Kenaikan Traffic Pengunjung"
            options={SURVEY_OPTIONS.kenaikan_traffic}
            value={formData.kenaikan_traffic}
            onChange={updateField('kenaikan_traffic')}
            labels={TRAFFIC_LABELS}
            disabled={disabled}
            required
            error={fieldLevelErrors.kenaikan_traffic}
          />

          <RadioGroup
            label="Kenaikan Sales / Penjualan"
            options={SURVEY_OPTIONS.kenaikan_sales}
            value={formData.kenaikan_sales}
            onChange={updateField('kenaikan_sales')}
            disabled={disabled}
            required
            error={fieldLevelErrors.kenaikan_sales}
          />
        </div>
      </section>

      {/* Section 3: PIC & Feedback (opsional) */}
      <div className="space-y-4">
        {/* PIC */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
            Informasi PIC (opsional)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ts-form-pic-name" className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Building2 className="h-3.5 w-3.5" />
                Nama PIC
              </label>
              <input
                id="ts-form-pic-name"
                type="text"
                value={formData.pic_name}
                onChange={(e) => updateField('pic_name')(e.target.value)}
                placeholder="Nama penanggung jawab"
                maxLength={100}
                disabled={disabled}
                autoComplete="name"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-brand-primary-400 focus:outline-none focus:ring-1 focus:ring-brand-primary-400 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
            <div>
              <label htmlFor="ts-form-pic-phone" className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Phone className="h-3.5 w-3.5" />
                No. Telepon PIC
              </label>
              <input
                id="ts-form-pic-phone"
                type="tel"
                inputMode="tel"
                value={formData.pic_phone}
                onChange={(e) => updateField('pic_phone')(e.target.value)}
                placeholder="08xxx"
                maxLength={20}
                disabled={disabled}
                autoComplete="tel"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-brand-primary-400 focus:outline-none focus:ring-1 focus:ring-brand-primary-400 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
            Umpan Balik (Opsional)
          </h3>
          <div>
            <textarea
              aria-label="Masukan / Feedback"
              value={formData.feedback_teks}
              onChange={(e) => updateField('feedback_teks')(e.target.value)}
              placeholder="Ceritakan kesan atau saran Anda tentang event ini (opsional)"
              rows={5}
              maxLength={2000}
              disabled={disabled}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-brand-primary-400 focus:outline-none focus:ring-1 focus:ring-brand-primary-400 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            />
            <p className="mt-1 text-right text-[10px] text-slate-400">
              {2000 - formData.feedback_teks.length} karakter tersisa
            </p>
          </div>
        </div>
      </div>

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
          <span>{filledCount} dari {requiredCount} bagian wajib terisi</span>
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
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-500 focus-visible:ring-offset-2"
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
      <p className="mt-0.5 text-sm font-semibold text-brand-primary-600 dark:text-brand-primary-400">
        "{eventName}"
      </p>
      <p className="mt-4 max-w-md text-xs ui-text-muted">
        Masukan Anda sangat berharga untuk meningkatkan kualitas kerjasama dan pelayanan kami.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700"
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
        <span className="mx-1 font-semibold text-brand-primary-600 dark:text-brand-primary-400">
          "{eventName}"
        </span>
        Setiap tenant hanya dapat mengirimkan satu survey per event.
      </p>
      <div className="mt-6 flex gap-3">
        {onViewExisting && (
          <button
            type="button"
            onClick={onViewExisting}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-primary-300 px-5 py-2.5 text-sm font-semibold text-brand-primary-700 transition hover:bg-brand-primary-50 dark:border-brand-primary-700 dark:text-brand-primary-300 dark:hover:bg-brand-primary-950/40"
          >
            Lihat Survey
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700"
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
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700"
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
      <Loader2 className="h-8 w-8 animate-spin text-brand-primary-500" />
      <p className="mt-3 text-sm ui-text-muted">{message}</p>
    </div>
  );
}