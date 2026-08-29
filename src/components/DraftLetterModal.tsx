import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, ChevronLeft, ChevronRight, FileText, Save } from 'lucide-react';
import { LetterRequestItem } from '../types';
import { ModalWrapper } from './ModalWrapper';
import { ModalHeader } from './ui/ModalHeader';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData: Partial<LetterRequestItem> | null;
  onSubmit: (data: LetterRequestItem) => Promise<boolean>;
}

const EMPTY: LetterRequestItem = {
  tanggalSurat: '',
  nomorSurat: '',
  namaEO: '',
  penanggungJawab: '',
  alamatEO: '',
  namaEvent: '',
  lokasi: '',
  hariTanggalPelaksanaan: '',
  waktuPelaksanaan: '',
  nomorTelepon: '',
  hariTanggalLoading: '',
  waktuLoading: '',
};

const HARI_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const STEPS = [
  { title: 'Data Surat', description: 'Nomor dan tanggal surat' },
  { title: 'Data EO & Event', description: 'Informasi penyelenggara dan acara' },
  { title: 'Loading & Review', description: 'Jadwal bongkar muat dan pemeriksaan akhir' },
] as const;

const REQUIRED_FIELDS = new Set<keyof LetterRequestItem>([
  'tanggalSurat',
  'nomorSurat',
  'namaEO',
  'penanggungJawab',
  'alamatEO',
  'namaEvent',
  'lokasi',
  'hariTanggalPelaksanaan',
  'hariTanggalLoading',
  'waktuLoading',
]);

const STEP_FIELDS: Array<Array<keyof LetterRequestItem>> = [
  ['tanggalSurat', 'nomorSurat'],
  ['namaEO', 'penanggungJawab', 'alamatEO', 'namaEvent', 'lokasi', 'hariTanggalPelaksanaan'],
  ['hariTanggalLoading', 'waktuLoading'],
];

const REQUIRED_ERROR_MESSAGES: Record<keyof LetterRequestItem, string> = {
  tanggalSurat: 'Tanggal surat wajib diisi',
  nomorSurat: 'Nomor surat wajib diisi',
  namaEO: 'Nama EO wajib diisi',
  penanggungJawab: 'Penanggung jawab wajib diisi',
  alamatEO: 'Alamat EO wajib diisi',
  namaEvent: 'Nama event wajib diisi',
  lokasi: 'Lokasi wajib diisi',
  hariTanggalPelaksanaan: 'Hari/Tanggal pelaksanaan wajib diisi',
  waktuPelaksanaan: '',
  nomorTelepon: '',
  hariTanggalLoading: 'Hari/Tanggal loading wajib diisi',
  waktuLoading: 'Waktu loading wajib diisi',
};

function parseIsoDate(value: string) {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const [yearStr, monthStr, dayStr] = normalized.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return { date, yearStr, month, dayStr };
}

function formatIndonesianDate(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return value.trim();

  return `${parsed.dayStr} ${BULAN_NAMES[parsed.month - 1]} ${parsed.yearStr}`;
}

function formatIndonesianLongDate(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return value.trim();

  return `${HARI_NAMES[parsed.date.getDay()]}, ${parsed.dayStr} ${BULAN_NAMES[parsed.month - 1]} ${parsed.yearStr}`;
}

export function DraftLetterModal({ isOpen, onClose, initialData, onSubmit }: Props) {
  const [form, setForm] = useState<LetterRequestItem>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof LetterRequestItem, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasAttemptedStepSubmit, setHasAttemptedStepSubmit] = useState(false);
  const defaultData = useMemo<LetterRequestItem>(() => ({
    ...EMPTY,
    ...initialData,
  }), [initialData]);

  useEffect(() => {
    if (isOpen) {
      setForm(defaultData);
      setErrors({});
      setIsSubmitting(false);
      setCurrentStep(0);
      setHasAttemptedStepSubmit(false);
    }
  }, [isOpen, defaultData]);

  if (!isOpen || !initialData) return null;

  const setField = (key: keyof LetterRequestItem, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validateFields = (fields: Array<keyof LetterRequestItem>) => {
    const nextErrors: Partial<Record<keyof LetterRequestItem, string>> = {};

    fields.forEach(field => {
      if (REQUIRED_FIELDS.has(field) && !form[field].trim()) {
        nextErrors[field] = REQUIRED_ERROR_MESSAGES[field];
      }
    });

    return nextErrors;
  };

  const validateAll = () => validateFields(Array.from(REQUIRED_FIELDS));

  const focusFirstError = (field: keyof LetterRequestItem) => {
    requestAnimationFrame(() => {
      document.getElementById(String(field))?.focus();
    });
  };

  const handleNext = () => {
    const stepErrors = validateFields(STEP_FIELDS[currentStep] ?? []);
    setHasAttemptedStepSubmit(true);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...stepErrors }));
      const firstErrorField = STEP_FIELDS[currentStep]?.find(field => stepErrors[field]);
      if (firstErrorField) focusFirstError(firstErrorField);
      return;
    }

    setErrors(prev => {
      const next = { ...prev };
      (STEP_FIELDS[currentStep] ?? []).forEach(field => {
        delete next[field];
      });
      return next;
    });
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    setHasAttemptedStepSubmit(false);
  };

  const handleBack = () => {
    if (currentStep === 0) {
      onClose();
      return;
    }
    setCurrentStep(prev => Math.max(prev - 1, 0));
    setHasAttemptedStepSubmit(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep < STEPS.length - 1) {
      handleNext();
      return;
    }

    const nextErrors = validateAll();
    setHasAttemptedStepSubmit(true);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstErrorField = Array.from(REQUIRED_FIELDS).find(field => nextErrors[field]);
      if (firstErrorField) focusFirstError(firstErrorField);
      return;
    }

    setIsSubmitting(true);
    const normalizedForm = {
      ...form,
      tanggalSurat: formatIndonesianDate(form.tanggalSurat),
      hariTanggalLoading: formatIndonesianLongDate(form.hariTanggalLoading),
    };
    const success = await onSubmit(normalizedForm);
    setIsSubmitting(false);
    if (success) onClose();
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-[var(--brand-card)] px-4 py-2.5 text-sm outline-none transition focus:border-brand-primary-400 focus:ring-2 focus:ring-brand-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400';
  const errorClass = 'border-red-400 focus:border-red-400 focus:ring-red-100 dark:border-red-400 dark:focus:ring-red-900/30';
  const visibleStepFields = STEP_FIELDS[currentStep] ?? [];
  const visibleErrorCount = visibleStepFields.filter(field => errors[field]).length;
  const totalErrorCount = Object.values(errors).filter(Boolean).length;
  const footerErrorCount = currentStep === STEPS.length - 1 ? totalErrorCount : visibleErrorCount;
  const shouldShowErrorSummary = hasAttemptedStepSubmit && footerErrorCount > 0;
  const currentStepTitle = STEPS[currentStep]?.title ?? STEPS[0].title;

  const fieldProps = (field: keyof LetterRequestItem) => ({
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${String(field)}-error` : undefined,
  });

  const renderLabel = (label: string, field: keyof LetterRequestItem) => (
    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor={String(field)}>
      {label}{REQUIRED_FIELDS.has(field) && <span className="text-red-500"> *</span>}
    </label>
  );

  const renderError = (field: keyof LetterRequestItem) => errors[field] && (
    <p id={`${String(field)}-error`} className="mt-1 text-xs text-red-500" role="alert">{errors[field]}</p>
  );

  const renderInput = (field: keyof LetterRequestItem, label: string, placeholder?: string, type = 'text') => (
    <div>
      {renderLabel(label, field)}
      <input
        id={String(field)}
        type={type}
        value={form[field]}
        onChange={e => setField(field, e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} ${errors[field] ? errorClass : ''}`}
        {...fieldProps(field)}
      />
      {renderError(field)}
    </div>
  );

  const renderTextarea = (field: keyof LetterRequestItem, label: string, placeholder?: string) => (
    <div>
      {renderLabel(label, field)}
      <textarea
        id={String(field)}
        value={form[field]}
        onChange={e => setField(field, e.target.value)}
        rows={3}
        placeholder={placeholder}
        className={`${inputClass} resize-none ${errors[field] ? errorClass : ''}`}
        {...fieldProps(field)}
      />
      {renderError(field)}
    </div>
  );

  const renderStepIndicator = () => (
    <div className="border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
      <div className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, index) => {
          const isActive = currentStep === index;
          const isComplete = currentStep > index;
          return (
            <div
              key={step.title}
              className={`rounded-2xl border p-3 transition ${isActive
                ? 'border-brand-primary-200 bg-brand-primary-50 dark:border-brand-primary-500/50 dark:bg-brand-primary-950/30'
                : isComplete
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/20'
                  : 'border-slate-200 bg-[var(--brand-card)] dark:border-slate-700 dark:bg-slate-900/40'
              }`}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${isComplete
                  ? 'bg-emerald-500 text-white'
                  : isActive
                    ? 'bg-brand-primary-600 text-white'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{step.title}</p>
                  <p className="truncate text-xs ui-text-muted">{step.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderReviewItem = (label: string, value: string) => (
    <div className="rounded-xl border border-slate-100 bg-[var(--brand-card)] p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">
        {value.trim() || <span className="font-medium text-slate-400">Belum diisi</span>}
      </p>
    </div>
  );

  const renderReviewCard = () => (
    <aside className="rounded-2xl border border-brand-primary-100 bg-brand-primary-50/60 p-4 dark:border-brand-primary-500/30 dark:bg-brand-primary-950/20">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary-600 shadow-md shadow-brand-primary-200 dark:shadow-brand-primary-900/30">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Review Draft Surat</h3>
          <p className="text-xs ui-text-muted">Pastikan data sudah benar sebelum dikirim ke AutoCrat.</p>
        </div>
      </div>
      <div className="space-y-2">
        {renderReviewItem('Nomor Surat', form.nomorSurat)}
        {renderReviewItem('Tanggal Surat', formatIndonesianDate(form.tanggalSurat))}
        {renderReviewItem('EO / PIC', [form.namaEO, form.penanggungJawab].filter(Boolean).join(' · '))}
        {renderReviewItem('Event', [form.namaEvent, form.lokasi].filter(Boolean).join(' · '))}
        {renderReviewItem('Pelaksanaan', [form.hariTanggalPelaksanaan, form.waktuPelaksanaan].filter(Boolean).join(' · '))}
        {renderReviewItem('Loading', [formatIndonesianLongDate(form.hariTanggalLoading), form.waktuLoading].filter(Boolean).join(' · '))}
        {renderReviewItem('Nomor Telepon', form.nomorTelepon)}
      </div>
    </aside>
  );

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-[var(--brand-card-light)] p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Data Surat</h3>
            <p className="text-xs ui-text-muted">Isi identitas surat utama sebelum lanjut ke detail event.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {renderInput('tanggalSurat', 'Tanggal Surat', undefined, 'date')}
            <div>
              {renderInput('nomorSurat', 'Nomor Surat', '090/MMB/MKT.MC/II/2026')}
              <p className="mt-1 text-xs text-slate-400">Format contoh: 090/MMB/MKT.MC/II/2026</p>
            </div>
          </div>
        </section>
      );
    }

    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-[var(--brand-card-light)] p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Penyelenggara</h3>
              <p className="text-xs ui-text-muted">Data EO dan PIC yang bertanggung jawab.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {renderInput('namaEO', 'Nama EO')}
              {renderInput('penanggungJawab', 'Penanggung Jawab')}
            </div>
            {renderTextarea('alamatEO', 'Alamat EO', 'Alamat lengkap EO')}
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-[var(--brand-card-light)] p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Detail Event</h3>
              <p className="text-xs ui-text-muted">Informasi acara yang akan masuk ke surat konfirmasi.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {renderInput('namaEvent', 'Nama Event')}
              {renderInput('lokasi', 'Lokasi')}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {renderInput('hariTanggalPelaksanaan', 'Hari / Tanggal Pelaksanaan', 'Sabtu, 25 April 2026')}
              {renderInput('waktuPelaksanaan', 'Waktu Pelaksanaan', '10.00 - 22.00')}
            </div>
            {renderInput('nomorTelepon', 'Nomor Telepon', 'Nomor PIC yang bisa dihubungi')}
          </section>
        </div>
      );
    }

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-[var(--brand-card-light)] p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Jadwal Loading</h3>
            <p className="text-xs ui-text-muted">Lengkapi kebutuhan loading sesuai koordinasi event.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {renderInput('hariTanggalLoading', 'Hari/Tanggal Loading', undefined, 'date')}
            <div>
              {renderInput('waktuLoading', 'Waktu Loading', '06.00 - 20.00')}
              <p className="mt-1 text-xs text-slate-400">Contoh: 06.00 - 20.00</p>
            </div>
          </div>
        </section>
        {renderReviewCard()}
      </div>
    );
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl" ariaLabelledBy="draft-letter-title">
      <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-[var(--brand-card-light)] shadow-2xl dark:bg-slate-900">
        <ModalHeader
          titleId="draft-letter-title"
          title="Form Surat Izin Konfirmasi Event"
          subtitle="Data dikirim ke spreadsheet AutoCrat untuk proses dokumen."
          icon={<FileText />}
          onClose={onClose}
          closeAriaLabel="Tutup form surat"
          className="bg-[var(--brand-card-light)] dark:bg-slate-800"
        />

        {renderStepIndicator()}

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {renderStepContent()}
          </div>

          <footer className="border-t border-slate-100 bg-[var(--brand-card-light)]/95 px-4 py-4 backdrop-blur sm:px-6 dark:border-slate-700 dark:bg-slate-800/95">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-h-[2rem]">
                <p className="text-xs font-semibold ui-text-muted">Langkah {currentStep + 1} dari {STEPS.length}: {currentStepTitle}</p>
                {shouldShowErrorSummary && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-300" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Lengkapi {footerErrorCount} field wajib sebelum {currentStep === STEPS.length - 1 ? 'membuat draft' : 'lanjut'}.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:min-w-[360px]">
                <button type="button" onClick={handleBack} disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                  {currentStep > 0 && <ChevronLeft className="h-4 w-4" />}
                  {currentStep === 0 ? 'Batal' : 'Kembali'}
                </button>
                <button type="submit" disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-primary-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-primary-200 transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-brand-primary-900/30">
                  {currentStep === STEPS.length - 1 ? (
                    <>
                      <Save className="h-4 w-4" />
                      {isSubmitting ? 'Membuat draft...' : 'Buat Draft Surat'}
                    </>
                  ) : (
                    <>
                      Lanjut
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </footer>
        </form>
      </div>
    </ModalWrapper>
  );
}
