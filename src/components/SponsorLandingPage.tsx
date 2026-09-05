import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, Handshake, MapPin, Moon, RefreshCw, SunMedium } from 'lucide-react';
import type { EventProposalEvent } from '../types';
import { fetchSponsorEventsWithProposals, submitSponsorLead } from '../utils/supabaseApi';
import { SupabaseApiError } from '../utils/api/_shared';
import { validateEmail, validatePhone } from '../utils/validation';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';
import { usePageMeta } from '../utils/pageMeta';

function formatEventDate(value?: string): string {
  if (!value) return '';
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

interface LeadForm {
  eventId: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  message: string;
}

const INITIAL_FORM: LeadForm = { eventId: '', companyName: '', contactName: '', phone: '', email: '', message: '' };

const inputClass =
  'w-full rounded-2xl border border-slate-200/80 bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca-soft)] dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500';

const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5';

export function SponsorLandingPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Mitra & Sponsor — Metropolitan Mall Bekasi',
    description: 'Ajukan proposal event dan jadi mitra sponsor Metropolitan Mall Bekasi.',
  });

  const navigate = useNavigate();
  const [items, setItems] = useState<EventProposalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [form, setForm] = useState<LeadForm>({ ...INITIAL_FORM });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const eventsWithProposals = useMemo(() => items.filter(i => i.proposal.fileUrl), [items]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setFetchError(false);
    fetchSponsorEventsWithProposals()
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => {
        if (!cancelled) { setItems([]); setFetchError(true); }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [retryCount]);

  const setField = (key: keyof LeadForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSubmitError('');
    setFieldErrors(prev => {
      if (!prev[key]) return prev;
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.eventId) errors.eventId = 'Pilih event terlebih dahulu.';
    if (!form.companyName.trim()) errors.companyName = 'Nama brand / perusahaan wajib diisi.';
    else if (form.companyName.trim().length > 200) errors.companyName = 'Terlalu panjang (maksimal 200 karakter).';
    if (!form.contactName.trim()) errors.contactName = 'Nama PIC wajib diisi.';
    if (!form.phone.trim()) errors.phone = 'Nomor WhatsApp wajib diisi.';
    else {
      const phoneResult = validatePhone(form.phone);
      if (!phoneResult.valid && phoneResult.error) errors.phone = phoneResult.error;
    }
    if (form.email.trim()) {
      const emailResult = validateEmail(form.email);
      if (!emailResult.valid && emailResult.error) errors.email = emailResult.error;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('Periksa kolom yang ditandai, lalu kirim ulang.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitSponsorLead({
        eventId: form.eventId,
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        message: form.message.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      // 400 validasi / 429 rate limit / 500 — tampilkan pesan dari server
      setSubmitError(err instanceof SupabaseApiError ? err.message : 'Gagal mengirim minat support. Coba lagi nanti.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ui-dashboard-page min-h-screen bg-[#fbfaf7] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* Header */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-tosca)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Langsung ke konten
      </a>

      <header className="ui-dashboard-chrome sticky top-0 z-40 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto shrink-0" />
            <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700 sm:block" />
            <span className="hidden truncate text-[11px] font-bold uppercase tracking-widest ui-text-muted sm:inline">Sponsorship</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onToggleDark}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />Kembali
            </button>
          </div>
        </div>
      </header>

      <main id="konten-utama" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        <div className="mb-10 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-primary-500">Sponsorship</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Dukungan Sponsorship</h1>
          <p className="mt-3 text-base leading-7 ui-text-muted">
            Dapatkan dukungan sponsorship untuk event komunitasmu. Kami bantu hubungkan dengan brand dan tenant yang relevan.
          </p>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                <div className="p-5">
                  <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-700/60" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && fetchError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <RefreshCw className="h-7 w-7 text-red-500 dark:text-red-400" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Gagal memuat data</p>
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-primary-700"
            >
              <RefreshCw className="h-4 w-4" />
              Coba lagi
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && eventsWithProposals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Handshake className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Belum ada event dengan proposal sponsor</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Peluang sponsorship akan muncul di sini.</p>
          </div>
        )}

        {/* Event grid */}
        {!isLoading && !fetchError && eventsWithProposals.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eventsWithProposals.map(({ event, proposal }) => (
              <div key={event.id} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-lg dark:bg-slate-800">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5 text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
                  {formatEventDate(event.dateStr)}
                </div>
                <h2 className="mt-2 text-lg font-bold leading-snug text-slate-900 dark:text-white">{event.acara}</h2>
                {event.lokasi && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3 w-3" aria-hidden="true" /> {event.lokasi}
                  </p>
                )}
                <div className="mt-auto pt-4">
                  <a
                    href={proposal.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Lihat Proposal
                  </a>
                  <a
                    href="#sponsor-form"
                    onClick={() => setField('eventId', event.id)}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-tosca-dark)]"
                  >
                    <Handshake className="h-4 w-4" aria-hidden="true" />
                    Saya Tertarik Support
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        {!isLoading && !fetchError && eventsWithProposals.length > 0 && (
          <div id="sponsor-form" className="mx-auto mt-14 max-w-2xl scroll-mt-24">
            <div className="mb-6 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-primary-500">Minat Support</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Tertarik Support Event?</h2>
              <p className="mt-2 text-sm leading-6 ui-text-muted">
                Isi form di bawah. Tim Marcomm Metropolitan Mall Bekasi akan menghubungi Anda dalam 5 hari kerja.
              </p>
            </div>

            {submitted ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)]">
                  <CheckCircle2 className="h-8 w-8 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" />
                </div>
                <h3 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">Minat Support Terkirim!</h3>
                <p className="mt-3 text-sm leading-7 ui-text-secondary">
                  Terima kasih! Tim Marcomm kami akan meninjau dan menghubungi Anda dalam 5 hari kerja.
                </p>
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setForm({ ...INITIAL_FORM }); }}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Kirim Minat Support Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 sm:p-8">
                {submitError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400" role="alert">
                    {submitError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="sp-event" className={labelClass}>Pilih Event <span className="text-rose-600">*</span></label>
                    <select
                      id="sp-event"
                      value={form.eventId}
                      onChange={e => setField('eventId', e.target.value)}
                      required
                      className={inputClass}
                      aria-invalid={!!fieldErrors.eventId}
                    >
                      <option value="">— pilih event —</option>
                      {eventsWithProposals.map(({ event }) => (
                        <option key={event.id} value={event.id}>
                          {formatEventDate(event.dateStr)} — {event.acara}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.eventId && (
                      <p className="mt-1 text-sm text-rose-600 dark:text-rose-400" role="alert">{fieldErrors.eventId}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="sp-company" className={labelClass}>Nama Brand / Perusahaan <span className="text-rose-600">*</span></label>
                    <input
                      id="sp-company"
                      value={form.companyName}
                      onChange={e => setField('companyName', e.target.value)}
                      placeholder="Nama brand / perusahaan"
                      required
                      className={inputClass}
                      aria-invalid={!!fieldErrors.companyName}
                    />
                    {fieldErrors.companyName && (
                      <p className="mt-1 text-sm text-rose-600 dark:text-rose-400" role="alert">{fieldErrors.companyName}</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="sp-pic" className={labelClass}>Nama PIC <span className="text-rose-600">*</span></label>
                      <input
                        id="sp-pic"
                        value={form.contactName}
                        onChange={e => setField('contactName', e.target.value)}
                        placeholder="Nama penanggung jawab"
                        required
                        className={inputClass}
                        aria-invalid={!!fieldErrors.contactName}
                      />
                      {fieldErrors.contactName && (
                        <p className="mt-1 text-sm text-rose-600 dark:text-rose-400" role="alert">{fieldErrors.contactName}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="sp-phone" className={labelClass}>Nomor WhatsApp <span className="text-rose-600">*</span></label>
                      <input
                        id="sp-phone"
                        value={form.phone}
                        onChange={e => setField('phone', e.target.value)}
                        placeholder="Nomor WhatsApp"
                        type="tel"
                        autoComplete="tel"
                        required
                        className={inputClass}
                        aria-invalid={!!fieldErrors.phone}
                      />
                      {fieldErrors.phone && (
                        <p className="mt-1 text-sm text-rose-600 dark:text-rose-400" role="alert">{fieldErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sp-email" className={labelClass}>Email</label>
                    <input
                      id="sp-email"
                      value={form.email}
                      onChange={e => setField('email', e.target.value)}
                      placeholder="Email (opsional)"
                      type="email"
                      autoComplete="email"
                      className={inputClass}
                      aria-invalid={!!fieldErrors.email}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-sm text-rose-600 dark:text-rose-400" role="alert">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="sp-message" className={labelClass}>Pesan</label>
                    <textarea
                      id="sp-message"
                      value={form.message}
                      onChange={e => setField('message', e.target.value)}
                      rows={4}
                      placeholder="Ceritakan ketertarikan Anda (opsional)"
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-tosca-600)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--brand-tosca-dark)] disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <Handshake className="h-4 w-4" aria-hidden="true" />
                        Kirim Minat Support
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-slate-800">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &mdash; Metland Coloring Life
      </footer>
    </div>
  );
}
