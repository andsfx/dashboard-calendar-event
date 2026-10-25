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
import type { TenantDropdownOption } from '../../utils/domainApi';
import { MdButton, MdLinearProgress, MdSelect, MdTextField } from '../md';

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

  /**
   * Saat mengubah survey yang sudah ada, identitas tenant harus direkonstruksi
   * dari data yang tersimpan. Tanpa ini `selectedTenant` tetap null, sehingga
   * `buildFormData` menulis `tenant_id: ''` (tautan ke master tenant hilang)
   * dan guard "pilih dari daftar" memblokir submit ulang walau nama tenant
   * sudah terisi.
   */
  const [selectedTenant, setSelectedTenant] = useState<TenantDropdownOption | null>(() => {
    if (!initialData?.tenant_id) return null;
    return {
      id: initialData.tenant_id,
      name: initialData.nama_gerai ?? '',
      floor: '',
      lot: '',
      category: '',
      pic: initialData.pic_name ?? '',
      picTelp: initialData.pic_phone ?? '',
      logo: '',
      status: '',
      participantEvoucher: '',
    };
  });
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
      const msg = 'Pilih tenant dari daftar, bukan ketik bebas.';
      setFieldLevelErrors({ nama_gerai: msg });
      setErrors([msg]);
      return;
    }

    const data = buildFormData();
    // Spread membuat object literal baru → assignable ke Record<string, unknown>
    // tanpa `as unknown as` yang mematikan pemeriksaan tipe.
    const validation = validateTenantSurvey({ ...data }, isDraft);

    if (!validation.valid) {
      const fieldErrs: Record<string, string> = {};
      const patterns: Array<[RegExp, string]> = [
        [/[Nn]ama tenant|[Pp]ilih tenant/i, 'nama_gerai'],
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
      <div className="rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--wf-accent-soft)]">
            <Building2 className="h-5 w-5 text-[var(--wf-accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="truncate text-sm font-bold text-[var(--wf-ink)]">
              {event.acara}
            </h2>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--wf-ink-muted)]">
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
            <span className="text-[var(--wf-ink-muted)]">Progress</span>
            <span className="font-semibold text-[var(--wf-ink)]">{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--wf-board-2)]">
            <div
              className="h-full rounded-full bg-[var(--wf-accent)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top-level errors */}
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-600/10 p-4"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
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

      {/* Section 1: Informasi Tenant */}
      <section className="rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4">
        <h3 className="mb-1 text-sm font-bold text-[var(--wf-ink)]">
          Informasi Tenant
        </h3>
        <p className="mb-4 text-xs text-[var(--wf-ink-muted)]">
          Isi data tenant Anda di Metropolitan Mall Bekasi.
        </p>

        <div className="space-y-4">
          {/* Tenant search */}
          <div>
            <label htmlFor="ts-form-tenant" className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--wf-ink-muted)]">
              <Building2 className="h-3.5 w-3.5" />
              Nama Tenant
              <span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </label>
            <TenantSearchSelect
              id="ts-form-tenant"
              value={selectedTenant?.name || formData.nama_gerai}
              onChange={updateField('nama_gerai')}
              onTenantSelect={handleTenantSelect}
              disabled={disabled}
              required
              error={fieldLevelErrors.nama_gerai}
            />
            {selectedTenant && (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-live)]/10 px-3 py-2">
                {selectedTenant.logo ? (
                  <img src={selectedTenant.logo} alt="" className="h-8 w-8 shrink-0 rounded-md border border-[var(--wf-rule)] object-cover" onError={(e) => { (e.currentTarget.style.display = 'none'); }} />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--wf-live)]/10 text-[10px] font-bold text-[var(--wf-live)]">
                    {selectedTenant.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[var(--wf-live)]">{selectedTenant.name}</p>
                  <p className="truncate text-[10px] text-[var(--wf-live)]">
                    {selectedTenant.category}{selectedTenant.floor ? ` • ${selectedTenant.floor}` : ''}{selectedTenant.lot ? ` • Lot ${selectedTenant.lot}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Auto-detect warnings */}
          {selectedTenant && !formData.lokasi_zona && (
            <div className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-action)]/10 px-3 py-2 text-xs text-[var(--wf-action)]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Lokasi tidak terdeteksi. Silakan pilih manual dari dropdown.</span>
              </div>
            </div>
          )}
          {selectedTenant && !formData.kategori && (
            <div className="rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-action)]/10 px-3 py-2 text-xs text-[var(--wf-action)]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Kategori tidak terdeteksi. Silakan pilih manual.</span>
              </div>
            </div>
          )}

          {/* Lokasi / Zona */}
          <div className="relative">
            <label htmlFor="ts-form-lokasi" className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--wf-ink-muted)]">
              <MapPin className="h-3.5 w-3.5" />
              Lokasi / Zona
              <span className="text-red-500" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
              {autoFilled.lokasi_zona && (
                <span className="ml-1 rounded-full bg-[var(--wf-live)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--wf-live)] ring-1 ring-[var(--wf-rule)]">Auto</span>
              )}
            </label>
            <MdSelect
              id="ts-form-lokasi"
              value={formData.lokasi_zona}
              onChange={updateField('lokasi_zona')}
              disabled={disabled}
              required
              ariaLabel="Lokasi / Zona"
              error={!!fieldLevelErrors.lokasi_zona}
              errorText={fieldLevelErrors.lokasi_zona}
              options={[
                { value: '', label: 'Pilih lokasi / zona' },
                ...SURVEY_OPTIONS.lokasi_zona.map((z) => ({ value: z, label: z })),
              ]}
              className="w-full"
            />
          </div>

          {/* Kategori */}
          {autoFilled.kategori && (
            <div className="mb-1">
              <span className="rounded-full bg-[var(--wf-live)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--wf-live)] ring-1 ring-[var(--wf-rule)]">Auto - terdeteksi dari data tenant</span>
            </div>
          )}
          <RadioGroup
            label="Kategori Tenant"
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
      <section className="rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4">
        <h3 className="mb-1 text-sm font-bold text-[var(--wf-ink)]">
          Evaluasi Traffic &amp; Sales
        </h3>
        <p className="mb-4 text-xs text-[var(--wf-ink-muted)]">
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
        <div className="rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4">
          <h3 className="mb-3 text-sm font-bold text-[var(--wf-ink)]">
            Informasi PIC (opsional)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ts-form-pic-name" className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--wf-ink-muted)]">
                <Building2 className="h-3.5 w-3.5" />
                Nama PIC
              </label>
              <MdTextField
                id="ts-form-pic-name"
                type="text"
                value={formData.pic_name}
                onChange={updateField('pic_name')}
                placeholder="Nama penanggung jawab"
                maxLength={100}
                disabled={disabled}
                ariaLabel="Nama PIC"
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="ts-form-pic-phone" className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--wf-ink-muted)]">
                <Phone className="h-3.5 w-3.5" />
                No. Telepon PIC
              </label>
              <MdTextField
                id="ts-form-pic-phone"
                type="tel"
                value={formData.pic_phone}
                onChange={updateField('pic_phone')}
                placeholder="08xxx"
                maxLength={20}
                disabled={disabled}
                ariaLabel="No. Telepon PIC"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4">
          <h3 className="mb-3 text-sm font-bold text-[var(--wf-ink)]">
            Umpan Balik (Opsional)
          </h3>
          <div>
            <MdTextField
              type="textarea"
              ariaLabel="Masukan / Feedback"
              value={formData.feedback_teks}
              onChange={updateField('feedback_teks')}
              placeholder="Ceritakan kesan atau saran Anda tentang event ini (opsional)"
              rows={5}
              maxLength={2000}
              disabled={disabled}
              className="w-full"
            />
            <p className="mt-1 text-right text-[10px] text-[var(--wf-ink-muted)]">
              {2000 - formData.feedback_teks.length} karakter tersisa
            </p>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="space-y-1.5">
        <MdLinearProgress value={progress / 100} ariaLabel={`Progres pengisian ${progress}%`} />
        <div className="flex items-center justify-between text-[10px] text-[var(--wf-ink-muted)]">
          <span role="status" aria-live="polite">{progress}% selesai</span>
          <span>{filledCount} dari {requiredCount} bagian wajib terisi</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <MdButton variant="outlined" onClick={onCancel} disabled={isSubmitting}>
          <ChevronLeft className="h-4 w-4" />
          Batal
        </MdButton>
        <MdButton variant="outlined" onClick={() => handleSubmit(true)} disabled={isSubmitting || disabled}>
          <Save className="h-4 w-4" />
          Simpan Draft
        </MdButton>
        <MdButton type="submit" variant="filled" disabled={isSubmitting || disabled}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Kirim Survey
        </MdButton>
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-live)]/10 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--wf-live)]/10">
        <CheckCircle2 className="h-8 w-8 text-[var(--wf-live)]" />
      </div>
      <h2 className="text-lg font-bold text-[var(--wf-ink)]">Survey Terkirim!</h2>
      <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">
        Terima kasih telah mengirimkan self-assessment untuk event
      </p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--wf-accent)]">
        "{eventName}"
      </p>
      <p className="mt-4 max-w-md text-xs text-[var(--wf-ink-muted)]">
        Masukan Anda sangat berharga untuk meningkatkan kualitas kerjasama dan pelayanan kami.
      </p>
      <MdButton variant="filled" className="mt-6" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Dashboard
      </MdButton>
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-action)]/10 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--wf-action)]/10">
        <CheckCircle2 className="h-8 w-8 text-[var(--wf-action)]" />
      </div>
      <h2 className="text-lg font-bold text-[var(--wf-ink)]">
        Anda Sudah Mengisi Survey
      </h2>
      <p className="mt-2 max-w-md text-sm text-[var(--wf-ink-muted)]">
        Anda sudah pernah mengirimkan self-assessment untuk event
        <span className="mx-1 font-semibold text-[var(--wf-accent)]">
          "{eventName}"
        </span>
        Setiap tenant hanya dapat mengirimkan satu survey per event.
      </p>
      <div className="mt-6 flex gap-3">
        {onViewExisting && (
          <MdButton variant="outlined" onClick={onViewExisting}>
            Lihat Survey
          </MdButton>
        )}
        <MdButton variant="filled" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </MdButton>
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-600/10 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/10">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-[var(--wf-ink)]">Terjadi Kesalahan</h2>
      <p className="mt-2 max-w-md text-sm text-[var(--wf-ink-muted)]">
        {message}
      </p>
      <div className="mt-6 flex gap-3">
        {onRetry && (
          <MdButton variant="outlined" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </MdButton>
        )}
        {onBack && (
          <MdButton variant="filled" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </MdButton>
        )}
      </div>
    </div>
  );
}

export function TenantSurveyLoading({ message = 'Memuat survey…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-12">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--wf-accent)]" />
      <p className="mt-3 text-sm text-[var(--wf-ink-muted)]">{message}</p>
    </div>
  );
}