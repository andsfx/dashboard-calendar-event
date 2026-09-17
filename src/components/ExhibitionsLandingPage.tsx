import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Handshake, MapPin, Moon, RefreshCw, SunMedium } from 'lucide-react';
import type { Exhibition, ExhibitionActivation, ExhibitionLeadInput } from '../types';
import { fetchPublicExhibitions, fetchPublicExhibition, submitExhibitionLead } from '../utils/domainApi';
import { formatDateRange } from '../utils/eventUtils';
import { validateEmail, validatePhone } from '../utils/validation';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { usePageMeta } from '../utils/pageMeta';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const PARTICIPATION_OPTIONS: { value: ExhibitionLeadInput['participation']; label: string; hint: string }[] = [
  { value: 'booth', label: 'Peserta pameran', hint: 'Mengisi booth selama pameran berlangsung' },
  { value: 'activation', label: 'Pengisi aktivasi', hint: 'Mengadakan kegiatan seperti kelas atau demo' },
  { value: 'both', label: 'Keduanya', hint: 'Booth sekaligus kegiatan aktivasi' },
];

const INITIAL_FORM: ExhibitionLeadInput = {
  exhibitionId: '', organizationName: '', organizationType: 'brand', participation: 'booth',
  contactName: '', phone: '', email: '', proposal: '',
};

const inputClass = 'w-full rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca-soft)] dark:border-slate-600 dark:bg-slate-800 dark:text-white';
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300';

export function ExhibitionsLandingPage({ isDark, onToggleDark }: Props) {
  const { id } = useParams<{ id: string }>();
  usePageMeta({
    title: 'Pameran & Kolaborasi — Metropolitan Mall Bekasi',
    description: 'Ajak brand dan EO berkolaborasi mengisi pameran serta aktivasi di Metropolitan Mall Bekasi.',
  });

  const [list, setList] = useState<Exhibition[]>([]);
  const [detail, setDetail] = useState<{ exhibition: Exhibition; activations: ExhibitionActivation[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const [form, setForm] = useState<ExhibitionLeadInput>({ ...INITIAL_FORM });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    setLoadError('');
    const load = id ? fetchPublicExhibition(id) : fetchPublicExhibitions();
    load
      .then(result => {
        if (!alive) return;
        if (Array.isArray(result)) { setList(result); setDetail(null); }
        else { setDetail(result); setForm(prev => ({ ...prev, exhibitionId: result.exhibition.id })); }
      })
      .catch(err => {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat pameran');
      })
      .finally(() => { if (alive) setIsLoading(false); });
    return () => { alive = false; };
  }, [id, retryCount]);

  const openExhibitions = useMemo(() => list.filter(item => item.acceptingApplications), [list]);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.organizationName.trim().length < 3) errs.organizationName = 'Nama brand/EO minimal 3 karakter';
    if (form.contactName.trim().length < 3) errs.contactName = 'Nama PIC minimal 3 karakter';
    const phoneCheck = validatePhone(form.phone);
    if (!phoneCheck.valid) errs.phone = phoneCheck.error || 'Format nomor telepon tidak valid';
    if (form.email) {
      const emailCheck = validateEmail(form.email);
      if (!emailCheck.valid) errs.email = emailCheck.error || 'Format email tidak valid';
    }
    if (form.participation !== 'booth' && form.proposal.trim().length < 10) {
      errs.proposal = 'Jelaskan konsep aktivasi minimal 10 karakter';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitError('');
    setSubmitting(true);
    try {
      await submitExhibitionLead(form);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal mengirim pengajuan kolaborasi');
    } finally {
      setSubmitting(false);
    }
  };

  const exhibition = detail?.exhibition;

  return (
    <div className="ui-dashboard-page min-h-screen bg-[var(--brand-paper)] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <header className="ui-dashboard-chrome sticky top-0 z-40 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto shrink-0" />
            <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700 sm:block" />
            <span className="hidden truncate text-[11px] font-bold uppercase tracking-widest ui-text-muted sm:inline">Pameran &amp; Kolaborasi</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-brand-primary-700 dark:text-slate-300 dark:hover:text-brand-primary-300">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Beranda
            </Link>
            <button type="button" onClick={onToggleDark} aria-label={isDark ? 'Mode terang' : 'Mode gelap'} className="ui-focus-ring rounded-lg border border-slate-200 p-2 dark:border-slate-600">
              {isDark ? <SunMedium className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <main id="konten-utama" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {isLoading && <p className="text-sm text-slate-600 dark:text-slate-300">Memuat pameran…</p>}

        {!isLoading && loadError && (
          <div className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/40">
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
            <button type="button" onClick={() => setRetryCount(c => c + 1)} className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-primary-600 px-4 py-2 text-sm font-bold text-white">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Coba lagi
            </button>
          </div>
        )}

        {!isLoading && !loadError && !id && (
          <>
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Kolaborasi Pameran</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Metropolitan Mall Bekasi mengajak brand dan event organizer mengisi pameran bersama tim Casual Leasing dan Marcomm — baik sebagai peserta booth maupun pengisi aktivasi.
            </p>

            {list.length === 0 && (
              <p className="mt-8 text-sm text-slate-600 dark:text-slate-300">Belum ada pameran yang dibuka. Silakan cek kembali nanti.</p>
            )}

            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {list.map(item => (
                <li key={item.id} className="rounded-[var(--radius-campaign-card)] border border-[var(--border-subtle)] bg-[var(--brand-card)] p-5 dark:border-slate-700 dark:bg-slate-900">
                  <h2 className="font-display text-xl font-bold">{item.title}</h2>
                  {item.theme && <p className="mt-1 text-sm font-medium text-brand-primary-700 dark:text-brand-primary-300">{item.theme}</p>}
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDateRange(item.dateStart, item.dateEnd)}</span>
                    {item.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{item.location}</span>}
                  </p>
                  {item.description && <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>}
                  <Link to={`/pameran/${item.id}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-primary-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-tosca-dark)]">
                    <Handshake className="h-4 w-4" aria-hidden="true" />
                    {item.acceptingApplications ? 'Ajukan Kolaborasi' : 'Lihat Detail'}
                  </Link>
                </li>
              ))}
            </ul>

            {list.length > 0 && openExhibitions.length === 0 && (
              <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
                Saat ini belum ada pameran yang membuka pengajuan kolaborasi baru.
              </p>
            )}
          </>
        )}

        {!isLoading && !loadError && id && exhibition && (
          <>
            <Link to="/pameran" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Semua pameran
            </Link>
            <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">{exhibition.title}</h1>
            {exhibition.theme && <p className="mt-1 text-base font-medium text-brand-primary-700 dark:text-brand-primary-300">{exhibition.theme}</p>}
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDateRange(exhibition.dateStart, exhibition.dateEnd)}</span>
              {exhibition.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{exhibition.location}</span>}
            </p>
            {exhibition.description && <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">{exhibition.description}</p>}

            {exhibition.collaborationBrief && (
              <section className="mt-8 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--brand-card)] p-5 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="font-display text-lg font-bold">Yang Kami Cari</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{exhibition.collaborationBrief}</p>
              </section>
            )}

            <section className="mt-8">
              <h2 className="font-display text-lg font-bold">Agenda Aktivasi</h2>
              {detail && detail.activations.length === 0 && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Agenda aktivasi belum diumumkan. Konsep kegiatan dari mitra masih kami kurasi.
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {detail?.activations.map(activation => (
                  <li key={activation.eventId} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <p className="font-semibold">{activation.title}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {formatDateRange(activation.dateStart, activation.dateEnd)}
                      {activation.time && ` · ${activation.time}`}
                      {activation.location && ` · ${activation.location}`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section id="ajukan" className="mt-10 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--brand-card)] p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <h2 className="font-display text-lg font-bold">Ajukan Kolaborasi</h2>

              {!exhibition.acceptingApplications && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Pengajuan kolaborasi untuk pameran ini sedang ditutup.
                </p>
              )}

              {exhibition.acceptingApplications && submitted && (
                <div className="mt-3 flex items-start gap-3 rounded-[var(--radius-card)] bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <p>Pengajuan terkirim. Tim kami akan meninjau dan menghubungi Anda. Pengajuan ini belum berarti booth atau jadwal sudah dikonfirmasi.</p>
                </div>
              )}

              {exhibition.acceptingApplications && !submitted && (
                <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="lead-org">
                      Nama brand / EO <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </label>
                    <input id="lead-org" className={inputClass} value={form.organizationName} onChange={e => setForm({ ...form, organizationName: e.target.value })} aria-invalid={!!fieldErrors.organizationName} aria-describedby={fieldErrors.organizationName ? 'lead-org-err' : undefined} />
                    {fieldErrors.organizationName && <p id="lead-org-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.organizationName}</p>}
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="lead-type">Jenis organisasi</label>
                    <select id="lead-type" className={inputClass} value={form.organizationType} onChange={e => setForm({ ...form, organizationType: e.target.value as ExhibitionLeadInput['organizationType'] })}>
                      <option value="brand">Brand</option>
                      <option value="eo">Event Organizer</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="lead-participation">Bentuk kontribusi</label>
                    <select id="lead-participation" className={inputClass} value={form.participation} onChange={e => setForm({ ...form, participation: e.target.value as ExhibitionLeadInput['participation'] })}>
                      {PARTICIPATION_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label} — {option.hint}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="lead-contact">
                      Nama PIC <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </label>
                    <input id="lead-contact" className={inputClass} value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} aria-invalid={!!fieldErrors.contactName} aria-describedby={fieldErrors.contactName ? 'lead-contact-err' : undefined} />
                    {fieldErrors.contactName && <p id="lead-contact-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.contactName}</p>}
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="lead-phone">
                      Nomor WhatsApp <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </label>
                    <input id="lead-phone" className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'lead-phone-err' : undefined} />
                    {fieldErrors.phone && <p id="lead-phone-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.phone}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="lead-email">Email</label>
                    <input id="lead-email" className={inputClass} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'lead-email-err' : undefined} />
                    {fieldErrors.email && <p id="lead-email-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="lead-proposal">Konsep kontribusi</label>
                    <textarea id="lead-proposal" rows={4} className={inputClass} value={form.proposal} onChange={e => setForm({ ...form, proposal: e.target.value })} placeholder="Contoh: beauty class 60 menit untuk 30 peserta." aria-invalid={!!fieldErrors.proposal} aria-describedby={fieldErrors.proposal ? 'lead-proposal-err' : undefined} />
                    {fieldErrors.proposal && <p id="lead-proposal-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.proposal}</p>}
                  </div>

                  {submitError && <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{submitError}</p>}

                  <div className="sm:col-span-2">
                    <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-full bg-brand-primary-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--brand-tosca-dark)] disabled:opacity-60">
                      <Handshake className="h-4 w-4" aria-hidden="true" />
                      {submitting ? 'Mengirim…' : 'Kirim Pengajuan'}
                    </button>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Data kontak hanya dipakai tim Metropolitan Mall Bekasi untuk menindaklanjuti pengajuan ini.
                    </p>
                  </div>
                </form>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
