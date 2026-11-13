// ─── Halaman Pengajuan Event Publik (/ajukan-event) ───
// Form publik untuk EO/komunitas mengajukan event: masuk antrian Draft dashboard admin.
// Jalur data: anon client → draft_events INSERT (RLS "Public can insert draft_events")
// via createDraftEvent(payload, 'public') — TANPA service role, sesuai boundary SPEC §7.2.
// Anti-spam v1: honeypot + validasi client. Tanpa rate limit server (batas 12 function Vercel).
import { useState, type FormEvent } from 'react';
import { CalendarPlus, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createDraftEvent } from '../utils/domainApi';
import { validatePhone } from '../utils/validation';
import { CATEGORY_COLORS } from '../utils/eventUtils';
import { usePageMeta } from '../utils/pageMeta';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { RevealSection } from '../components/community/CommunityRevealPrimitives';
import { Button } from '../components/shadcn/button';
import { Input } from '../components/shadcn/input';
import { Label } from '../components/shadcn/label';
import { NativeSelect } from '../components/shadcn/native-select';
import { Textarea } from '../components/shadcn/textarea';
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

const inputClass = 'w-full rounded-xl border bg-[var(--wf-board-2)]! px-3 py-2 text-sm outline-none transition ui-focus-ring h-auto field-sizing-fixed! focus-visible:ring-2! focus-visible:ring-[var(--brand-tosca)]!';
const okInput = 'border-[var(--wf-rule)]! focus-visible:border-[var(--wf-accent)]!';
const errInput = 'border-red-500! focus-visible:border-red-600! dark:focus-visible:border-red-300!';
const labelClass = 'mb-1 block! text-xs font-semibold leading-normal text-[var(--wf-ink-muted)]';

export function EventSubmissionPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Ajukan event - Metropolitan Mall Bekasi',
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
    <div className="events-landing min-h-screen overflow-x-clip bg-[var(--wf-page)] text-[var(--wf-ink)] transition-colors duration-300">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke konten
      </a>

      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 outline-none">
        {submitted ? (
          <RevealSection as="div" refreshKey={submittedName}>
          <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--wf-board)] px-6 py-10 text-center shadow-[var(--shadow-card-soft)] sm:px-10  ">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-[var(--wf-ink)]">
              Pengajuan terkirim!
            </h1>
            {submittedName && (
              <p className="mt-2 text-sm text-[var(--wf-ink-muted)]">
                Event <span className="font-semibold">"{submittedName}"</span> sudah masuk antrean tinjauan.
              </p>
            )}
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--wf-ink-muted)]">
              Tim Marcomm Metropolitan Mall Bekasi akan meninjau pengajuanmu dan menghubungi PIC melalui nomor HP yang terdaftar untuk langkah berikutnya.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                className="h-auto items-center gap-2 rounded-full bg-[var(--wf-accent)]! px-5 py-2.5 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! ui-focus-ring"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Ajukan event lain
              </Button>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[var(--wf-board)] px-5 py-2.5 text-sm font-semibold text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board-2)] ui-focus-ring"
              >
                Jadwal event
              </Link>
            </div>
          </div>
          </RevealSection>
        ) : (
          <>
            <RevealSection as="div" className="mb-7">
              <img src={mallLogo} alt="Logo Metropolitan Mall Bekasi" className="mb-4 h-10 w-auto" />
              <h1 className="font-display text-2xl font-bold leading-tight text-[var(--wf-ink)] sm:text-3xl">
                Ajukan event di Metmal Bekasi
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--wf-ink-muted)]">
                Punya acara bazar, workshop, pameran, atau kegiatan komunitas? Kirim pengajuanmu. Tim Marcomm kami akan meninjau dan menghubungimu.
              </p>
            </RevealSection>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--wf-board)] p-5 shadow-[var(--shadow-card-soft)] sm:p-7  "
            >
              {/* Honeypot — tersembunyi dari manusia, isian bot drop diam-diam */}
              <div className="sr-only" aria-hidden="true">
                <Label htmlFor="sub-website">Website</Label>
                <Input
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
                  <Label htmlFor="sub-acara" className={labelClass}>
                    Nama acara <span className="text-red-500" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span>
                  </Label>
                  <Input
                    id="sub-acara"
                    type="text"
                    value={form.acara}
                    onChange={e => setField('acara', e.target.value)}
                    maxLength={120}
                    aria-invalid={!!errors.acara}
                    className={`${inputClass} ${errors.acara ? errInput : okInput}`}
                    placeholder="Contoh: Workshop Batik Modern"
                  />
                  {errors.acara && <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{errors.acara}</p>}
                </div>

                <div>
                  <Label htmlFor="sub-date" className={labelClass}>
                    Tanggal mulai <span className="text-red-500" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span>
                  </Label>
                  <Input
                    id="sub-date"
                    type="date"
                    value={form.dateStr}
                    onChange={e => setField('dateStr', e.target.value)}
                    aria-invalid={!!errors.dateStr}
                    className={`${inputClass} ${errors.dateStr ? errInput : okInput}`}
                  />
                  {errors.dateStr && <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{errors.dateStr}</p>}
                </div>

                <div>
                  <Label htmlFor="sub-date-end" className={labelClass}>
                    Tanggal selesai (opsional)
                  </Label>
                  <Input
                    id="sub-date-end"
                    type="date"
                    value={form.dateEnd}
                    onChange={e => setField('dateEnd', e.target.value)}
                    min={form.dateStr || undefined}
                    aria-invalid={!!errors.dateEnd}
                    className={`${inputClass} ${errors.dateEnd ? errInput : okInput}`}
                  />
                  {errors.dateEnd && <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{errors.dateEnd}</p>}
                </div>

                <div>
                  <Label htmlFor="sub-jam" className={labelClass}>
                    Jam (opsional)
                  </Label>
                  <Input
                    id="sub-jam"
                    type="text"
                    value={form.jam}
                    onChange={e => setField('jam', e.target.value)}
                    className={`${inputClass} ${okInput}`}
                    placeholder="Contoh: 10:00 - 12:00"
                  />
                </div>

                <div>
                  <Label htmlFor="sub-lokasi" className={labelClass}>
                    Lokasi (opsional)
                  </Label>
                  <Input
                    id="sub-lokasi"
                    type="text"
                    value={form.lokasi}
                    onChange={e => setField('lokasi', e.target.value)}
                    className={`${inputClass} ${okInput}`}
                    placeholder="Contoh: Atrium Utama Lt.1"
                  />
                </div>

                <div>
                  <Label htmlFor="sub-eo" className={labelClass}>
                    Nama organisasi / EO <span className="text-red-500" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span>
                  </Label>
                  <Input
                    id="sub-eo"
                    type="text"
                    value={form.eo}
                    onChange={e => setField('eo', e.target.value)}
                    maxLength={120}
                    aria-invalid={!!errors.eo}
                    className={`${inputClass} ${errors.eo ? errInput : okInput}`}
                  />
                  {errors.eo && <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{errors.eo}</p>}
                </div>

                <div>
                  <Label htmlFor="sub-pic" className={labelClass}>
                    Nama PIC <span className="text-red-500" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span>
                  </Label>
                  <Input
                    id="sub-pic"
                    type="text"
                    value={form.pic}
                    onChange={e => setField('pic', e.target.value)}
                    maxLength={80}
                    aria-invalid={!!errors.pic}
                    className={`${inputClass} ${errors.pic ? errInput : okInput}`}
                  />
                  {errors.pic && <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{errors.pic}</p>}
                </div>

                <div>
                  <Label htmlFor="sub-phone" className={labelClass}>
                    No. HP (WhatsApp) <span className="text-red-500" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span>
                  </Label>
                  <Input
                    id="sub-phone"
                    type="tel"
                    value={form.phone}
                    onChange={e => setField('phone', e.target.value)}
                    aria-invalid={!!errors.phone}
                    className={`${inputClass} ${errors.phone ? errInput : okInput}`}
                    placeholder="Contoh: 0812xxxxxxx"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{errors.phone}</p>}
                </div>

                <div>
                  <Label htmlFor="sub-category" className={labelClass}>
                    Kategori (opsional)
                  </Label>
                  <NativeSelect
                    id="sub-category"
                    value={form.category}
                    onChange={e => setField('category', e.target.value)}
                    className="w-full [&>select]:h-auto [&>select]:rounded-xl [&>select]:border-[var(--wf-rule)]! [&>select]:bg-[var(--wf-board-2)]! [&>select]:py-2 [&>select]:pl-3 [&>select]:focus-visible:border-[var(--wf-accent)]!"
                  >
                    <option value="">Pilih kategori</option>
                    {Object.keys(CATEGORY_COLORS).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="sub-keterangan" className={labelClass}>
                    Keterangan (opsional)
                  </Label>
                  <Textarea
                    id="sub-keterangan"
                    value={form.keterangan}
                    onChange={e => setField('keterangan', e.target.value)}
                    rows={4}
                    maxLength={1000}
                    aria-invalid={!!errors.keterangan}
                    className={`${inputClass} ${errors.keterangan ? errInput : okInput}`}
                    placeholder="Ceritakan singkat tentang acara, target pengunjung, dan kebutuhan area."
                  />
                  {errors.keterangan && <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{errors.keterangan}</p>}
                </div>
              </div>

              {formError && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-900/30 dark:text-red-300" role="alert">
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                variant="ghost"
                disabled={isSubmitting}
                className="mt-6 h-auto w-full items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)]! px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60 ui-focus-ring"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                    Mengirim…
                  </>
                ) : (
                  <>
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                    Kirim pengajuan
                  </>
                )}
              </Button>
              <p className="mt-3 text-center text-xs text-[var(--wf-ink-muted)]">
                Data PIC dan nomor HP hanya dipakai tim Marcomm untuk meninjau pengajuan ini.
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}