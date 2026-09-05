// ─── Halaman Pengajuan Event Publik (/ajukan-event) ───
// Form publik untuk EO/komunitas mengajukan event: masuk antrian Draft dashboard admin.
// Jalur data: anon client → draft_events INSERT (RLS "Public can insert draft_events")
// via createDraftEvent(payload, 'public') — TANPA service role, sesuai boundary SPEC §7.2.
// Anti-spam v1: honeypot + validasi client. Tanpa rate limit server (batas 12 function Vercel).
import { useState, type FormEvent } from 'react';
import { ArrowLeft, CalendarPlus, CheckCircle2, Moon, SunMedium } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createDraftEvent } from '../utils/supabaseApi';
import { validatePhone } from '../utils/validation';
import { CATEGORY_COLORS } from '../utils/eventUtils';
import { usePageMeta } from '../utils/pageMeta';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

interface FormState {
  acara: string;
  dateStr: string;
  dateEnd: string;
  jam: string;
  lokasi: string;
  eo: string;
  pic: string;
  phone: string;
  category: string;
  keterangan: string;
  honeypot: string;
}

const EMPTY_FORM: FormState = {
  acara: '',
  dateStr: '',
  dateEnd: '',
  jam: '',
  lokasi: '',
  eo: '',
  pic: '',
  phone: '',
  category: '',
  keterangan: '',
  honeypot: '',
};

const inputClass = 'w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white';
const okInput = 'border-slate-200 focus:border-brand-primary-400 focus:ring-brand-primary-100 dark:border-slate-600';
const errInput = 'border-red-400 focus:ring-red-100';

export function EventSubmissionPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Ajukan Event — Metropolitan Mall Bekasi',
    description: 'Ajukan event atau kegiatan komunitasmu untuk diselenggarakan di Metropolitan Mall Bekasi.',
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState('');

  const setField = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.acara.trim()) next.acara = 'Nama acara wajib diisi.';
    else if (form.acara.trim().length > 120) next.acara = 'Nama acara maksimal 120 karakter.';
    if (!form.dateStr) next.dateStr = 'Tanggal mulai wajib diisi.';
    if (form.dateEnd && form.dateStr && form.dateEnd < form.dateStr) {
      next.dateEnd = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
    }
    if (!form.eo.trim()) next.eo = 'Nama organisasi / EO wajib diisi.';
    if (!form.pic.trim()) next.pic = 'Nama PIC wajib diisi.';
    if (!form.phone.trim()) next.phone = 'Nomor HP wajib diisi.';
    else {
      const phoneResult = validatePhone(form.phone);
      if (!phoneResult.valid && phoneResult.error) next.phone = phoneResult.error;
    }
    if (form.keterangan.length > 1000) next.keterangan = 'Keterangan maksimal 1000 karakter.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (form.honeypot.trim()) {
      // Bot terdeteksi — sukses palsu tanpa insert.
      setSubmitted(true);
      setSubmittedName('');
      return;
    }
    if (!validate()) {
      setFormError('Periksa kolom yang ditandai, lalu kirim ulang.');
      return;
    }
    setIsSubmitting(true);
    try {
      const dateEnd = form.dateEnd || undefined;
      await createDraftEvent({
        acara: form.acara.trim(),
        dateStr: form.dateStr,
        dateEnd,
        day: '',
        tanggal: '',
        month: '',
        jam: form.jam.trim(),
        lokasi: form.lokasi.trim(),
        eo: form.eo.trim(),
        pic: form.pic.trim(),
        phone: form.phone.trim(),
        keterangan: form.keterangan.trim(),
        category: form.category || 'Umum',
        categories: form.category ? [form.category] : [],
        priority: 'medium',
        eventModel: '',
        eventNominal: '',
        eventModelNotes: '',
        progress: 'draft',
        eventType: dateEnd ? 'multi_day' : 'single',
        isMultiDay: Boolean(dateEnd),
        dayTimeSlots: [],
        internalNote: '',
      }, 'public');
      setSubmitted(true);
      setSubmittedName(form.acara.trim());
    } catch {
      setFormError('Gagal mengirim pengajuan. Coba lagi nanti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError('');
    setSubmitted(false);
    setSubmittedName('');
  };

  return (
    <div className="events-landing min-h-screen overflow-x-clip bg-[var(--color-neutral-page)] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-50 border-b border-black/6 bg-[var(--color-neutral-page)]/96 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/96">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
          <Link to="/events" className="flex shrink-0 items-center gap-2 rounded-lg outline-none ui-focus-ring" aria-label="Kembali ke Jadwal Event">
            <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Jadwal Event</span>
          </Link>
          <button
            type="button"
            onClick={onToggleDark}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 ui-focus-ring"
            aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
          >
            {isDark ? <SunMedium className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {submitted ? (
          <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-white px-6 py-10 text-center shadow-[var(--shadow-card-soft)] sm:px-10 dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-slate-900 dark:text-white">
              Pengajuan Terkirim!
            </h1>
            {submittedName && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Event <span className="font-semibold">"{submittedName}"</span> sudah masuk antrian review.
              </p>
            )}
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Tim Marcomm Metropolitan Mall Bekasi akan meninjau pengajuanmu dan menghubungi PIC melalui nomor HP yang terdaftar untuk langkah berikutnya.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-tosca)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-tosca-dark)] ui-focus-ring"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Ajukan event lain
              </button>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ui-focus-ring"
              >
                Lihat jadwal event
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <img src={mallLogo} alt="Logo Metropolitan Mall Bekasi" className="mb-4 h-10 w-auto" />
              <h1 className="font-display text-2xl font-bold leading-tight text-slate-900 sm:text-3xl dark:text-white">
                Ajukan Event di Metmal Bekasi
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Punya acara bazar, workshop, pameran, atau kegiatan komunitas? Kirim pengajuanmu — tim Marcomm kami akan mereview dan menghubungimu.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-[2rem] border border-[var(--border-subtle)] bg-white p-5 shadow-[var(--shadow-card-soft)] sm:p-7 dark:border-slate-700 dark:bg-slate-900"
            >
              {/* Honeypot — tersembunyi dari manusia, isian bot drop diam-diam */}
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="sub-website">Website</label>
                <input
                  id="sub-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.honeypot}
                  onChange={e => setField('honeypot', e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="sub-acara" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Nama Acara <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="sub-acara"
                    type="text"
                    value={form.acara}
                    onChange={e => setField('acara', e.target.value)}
                    maxLength={120}
                    aria-invalid={!!errors.acara}
                    className={`${inputClass} ${errors.acara ? errInput : okInput}`}
                    placeholder="Contoh: Workshop Batik Modern"
                  />
                  {errors.acara && <p className="mt-1 text-xs text-red-500" role="alert">{errors.acara}</p>}
                </div>

                <div>
                  <label htmlFor="sub-date" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Tanggal Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="sub-date"
                    type="date"
                    value={form.dateStr}
                    onChange={e => setField('dateStr', e.target.value)}
                    aria-invalid={!!errors.dateStr}
                    className={`${inputClass} ${errors.dateStr ? errInput : okInput}`}
                  />
                  {errors.dateStr && <p className="mt-1 text-xs text-red-500" role="alert">{errors.dateStr}</p>}
                </div>

                <div>
                  <label htmlFor="sub-date-end" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Tanggal Selesai (opsional)
                  </label>
                  <input
                    id="sub-date-end"
                    type="date"
                    value={form.dateEnd}
                    onChange={e => setField('dateEnd', e.target.value)}
                    min={form.dateStr || undefined}
                    aria-invalid={!!errors.dateEnd}
                    className={`${inputClass} ${errors.dateEnd ? errInput : okInput}`}
                  />
                  {errors.dateEnd && <p className="mt-1 text-xs text-red-500" role="alert">{errors.dateEnd}</p>}
                </div>

                <div>
                  <label htmlFor="sub-jam" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Jam (opsional)
                  </label>
                  <input
                    id="sub-jam"
                    type="text"
                    value={form.jam}
                    onChange={e => setField('jam', e.target.value)}
                    className={`${inputClass} ${okInput}`}
                    placeholder="Contoh: 10:00 - 12:00"
                  />
                </div>

                <div>
                  <label htmlFor="sub-lokasi" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Lokasi (opsional)
                  </label>
                  <input
                    id="sub-lokasi"
                    type="text"
                    value={form.lokasi}
                    onChange={e => setField('lokasi', e.target.value)}
                    className={`${inputClass} ${okInput}`}
                    placeholder="Contoh: Atrium Utama Lt.1"
                  />
                </div>

                <div>
                  <label htmlFor="sub-eo" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Nama Organisasi / EO <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="sub-eo"
                    type="text"
                    value={form.eo}
                    onChange={e => setField('eo', e.target.value)}
                    maxLength={120}
                    aria-invalid={!!errors.eo}
                    className={`${inputClass} ${errors.eo ? errInput : okInput}`}
                  />
                  {errors.eo && <p className="mt-1 text-xs text-red-500" role="alert">{errors.eo}</p>}
                </div>

                <div>
                  <label htmlFor="sub-pic" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Nama PIC <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="sub-pic"
                    type="text"
                    value={form.pic}
                    onChange={e => setField('pic', e.target.value)}
                    maxLength={80}
                    aria-invalid={!!errors.pic}
                    className={`${inputClass} ${errors.pic ? errInput : okInput}`}
                  />
                  {errors.pic && <p className="mt-1 text-xs text-red-500" role="alert">{errors.pic}</p>}
                </div>

                <div>
                  <label htmlFor="sub-phone" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    No. HP (WhatsApp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="sub-phone"
                    type="tel"
                    value={form.phone}
                    onChange={e => setField('phone', e.target.value)}
                    aria-invalid={!!errors.phone}
                    className={`${inputClass} ${errors.phone ? errInput : okInput}`}
                    placeholder="Contoh: 0812xxxxxxx"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-500" role="alert">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="sub-category" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Kategori (opsional)
                  </label>
                  <select
                    id="sub-category"
                    value={form.category}
                    onChange={e => setField('category', e.target.value)}
                    className={`${inputClass} ${okInput}`}
                  >
                    <option value="">Pilih kategori</option>
                    {Object.keys(CATEGORY_COLORS).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="sub-keterangan" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Keterangan (opsional)
                  </label>
                  <textarea
                    id="sub-keterangan"
                    value={form.keterangan}
                    onChange={e => setField('keterangan', e.target.value)}
                    rows={4}
                    maxLength={1000}
                    aria-invalid={!!errors.keterangan}
                    className={`${inputClass} ${errors.keterangan ? errInput : okInput}`}
                    placeholder="Ceritakan singkat tentang acara, target pengunjung, dan kebutuhan area."
                  />
                  {errors.keterangan && <p className="mt-1 text-xs text-red-500" role="alert">{errors.keterangan}</p>}
                </div>
              </div>

              {formError && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-900/30 dark:text-red-300" role="alert">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-tosca)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--brand-tosca-dark)] disabled:opacity-60 ui-focus-ring"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                    Mengirim…
                  </>
                ) : (
                  <>
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                    Kirim Pengajuan
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
                Data PIC dan nomor HP hanya digunakan untuk proses review oleh tim Marcomm.
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}