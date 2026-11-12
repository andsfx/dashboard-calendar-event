import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, FileText, Handshake, MapPin, RefreshCw } from 'lucide-react';
import type { EventProposalEvent } from '../types';
import { fetchSponsorEventsWithProposals, submitSponsorLead } from '../utils/domainApi';
import { ApiError } from '../lib/rest';
import { validateEmail, validatePhone } from '../utils/validation';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { RevealSection } from '../components/community/CommunityRevealPrimitives';
import { Button } from '../components/shadcn/button';
import { Input } from '../components/shadcn/input';
import { Label } from '../components/shadcn/label';
import { NativeSelect } from '../components/shadcn/native-select';
import { Textarea } from '../components/shadcn/textarea';
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
  'w-full rounded-2xl border border-[var(--wf-rule)]! bg-[var(--wf-board-2)]! px-4 py-3 text-sm text-[var(--wf-ink)] outline-none transition h-auto field-sizing-fixed! focus-visible:ring-2! focus-visible:ring-[var(--brand-tosca)]! dark:placeholder-slate-500';

const labelClass = 'mb-1.5 block! text-xs font-semibold leading-normal text-[var(--wf-ink-muted)]';

export function SponsorLandingPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Mitra dan sponsor - Metropolitan Mall Bekasi',
    description: 'Ajukan proposal event dan jadi mitra sponsor Metropolitan Mall Bekasi.',
  });

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
      setSubmitError(err instanceof ApiError ? err.message : 'Gagal mengirim minat dukungan. Coba lagi nanti.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ui-dashboard-page min-h-screen bg-[var(--wf-page)] text-[var(--wf-ink)] transition-colors duration-300">
      {/* Header */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke konten
      </a>

      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 outline-none">
        {/* Hero */}
        <RevealSection as="div" className="mb-10 max-w-3xl" refreshKey={eventsWithProposals.length}>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dukungan sponsorship</h1>
          <p className="mt-3 text-base leading-7 text-[var(--wf-ink-muted)]">
            Dapatkan dukungan sponsorship untuk event komunitasmu. Kami bantu hubungkan dengan brand dan tenant yang relevan.
          </p>
        </RevealSection>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-[var(--wf-board)] shadow-sm ">
                <div className="p-5">
                  <div className="h-4 w-1/2 rounded bg-[var(--wf-rule)]" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-[var(--wf-board-2)]" />
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
            <p className="mt-4 text-lg font-semibold text-[var(--wf-ink-muted)]">Gagal memuat data</p>
            <Button
              variant="ghost"
              onClick={() => setRetryCount(c => c + 1)}
              className="mt-6 h-auto items-center gap-2 rounded-full bg-[var(--wf-accent)]! px-5 py-2.5 text-sm font-medium text-[var(--wf-accent-ink)] shadow-sm transition hover:bg-[var(--wf-accent)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0!"
            >
              <RefreshCw className="h-4 w-4" />
              Coba lagi
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && eventsWithProposals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--wf-board-2)]">
              <Handshake className="h-7 w-7 text-[var(--wf-ink-muted)]" />
            </div>
            <p className="mt-4 text-lg font-semibold text-[var(--wf-ink-muted)]">Belum ada event dengan proposal sponsor</p>
            <p className="mt-1 max-w-md text-sm text-[var(--wf-ink-muted)]">Peluang sponsorship akan muncul di sini. Sementara itu, hubungi tim Marcomm Metropolitan Mall Bekasi untuk penawaran kerja sama.</p>
          </div>
        )}

        {/* Event grid */}
        {!isLoading && !fetchError && eventsWithProposals.length > 0 && (
          <RevealSection as="div" refreshKey={`${eventsWithProposals.length}:${eventsWithProposals[0]?.event.id ?? ''}`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eventsWithProposals.map(({ event, proposal }) => (
              <div key={event.id} data-reveal-item className="flex flex-col rounded-2xl bg-[var(--wf-board)] p-5 shadow-sm transition hover:shadow-lg ">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--wf-ink-muted)]">
                  <CalendarDays className="h-3.5 w-3.5 text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
                  {formatEventDate(event.dateStr)}
                </div>
                <h2 className="mt-2 text-lg font-bold leading-snug text-[var(--wf-ink)]">{event.acara}</h2>
                {event.lokasi && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--wf-ink-muted)]">
                    <MapPin className="h-3 w-3" aria-hidden="true" /> {event.lokasi}
                  </p>
                )}
                <div className="mt-auto pt-4">
                  <a
                    href={proposal.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-semibold text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board-2)]"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Lihat proposal
                  </a>
                  <a
                    href="#sponsor-form"
                    onClick={() => setField('eventId', event.id)}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)] px-4 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]"
                  >
                    <Handshake className="h-4 w-4" aria-hidden="true" />
                    Saya tertarik mendukung event
                  </a>
                </div>
              </div>
            ))}
          </div>
          </RevealSection>
        )}

        {/* Form */}
        {!isLoading && !fetchError && eventsWithProposals.length > 0 && (
          <RevealSection as="div" id="sponsor-form" className="mx-auto mt-14 max-w-2xl scroll-mt-24">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Tertarik mendukung event?</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--wf-ink-muted)]">
                Isi form di bawah. Tim Marcomm Metropolitan Mall Bekasi akan menghubungi kamu dalam 5 hari kerja.
              </p>
            </div>

            {submitted ? (
              <div className="rounded-3xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)]">
                  <CheckCircle2 className="h-8 w-8 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" />
                </div>
                <h3 className="mt-5 text-2xl font-bold text-[var(--wf-ink)]">Minat dukungan terkirim!</h3>
                <p className="mt-3 text-sm leading-7 ui-text-secondary">
                  Terima kasih! Tim Marcomm kami akan meninjau dan menghubungi kamu dalam 5 hari kerja.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setSubmitted(false); setForm({ ...INITIAL_FORM }); }}
                  className="mt-6 h-auto items-center gap-2 rounded-full border! border-[var(--wf-rule)]! px-5 py-2.5 text-sm font-semibold text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board-2)]! hover:text-[var(--wf-ink-muted)]! active:translate-y-0!"
                >
                  Kirim minat dukungan lain
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="rounded-3xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-6 sm:p-8">
                {submitError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400" role="alert">
                    {submitError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sp-event" className={labelClass}>Pilih event <span className="text-rose-600" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span></Label>
                    <NativeSelect
                      id="sp-event"
                      value={form.eventId}
                      onChange={e => setField('eventId', e.target.value)}
                      required
                      className="w-full [&>select]:h-auto [&>select]:rounded-2xl [&>select]:border-[var(--wf-rule)]! [&>select]:bg-[var(--wf-board-2)]! [&>select]:py-3 [&>select]:pl-4 [&>select]:focus-visible:ring-2! [&>select]:focus-visible:ring-[var(--brand-tosca)]!"
                      aria-invalid={!!fieldErrors.eventId}
                    >
                      <option value="">Pilih event…</option>
                      {eventsWithProposals.map(({ event }) => (
                        <option key={event.id} value={event.id}>
                          {formatEventDate(event.dateStr)} · {event.acara}
                        </option>
                      ))}
                    </NativeSelect>
                    {fieldErrors.eventId && (
                      <p className="mt-1 text-sm text-rose-600 dark:text-rose-400" role="alert">{fieldErrors.eventId}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="sp-company" className={labelClass}>Nama brand / perusahaan <span className="text-rose-600" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span></Label>
                    <Input
                      id="sp-company"
                      value={form.companyName}
                      onChange={e => setField('companyName', e.target.value)}
                      placeholder="Contoh: PT Maju Jaya"
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
                      <Label htmlFor="sp-pic" className={labelClass}>Nama PIC <span className="text-rose-600" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span></Label>
                      <Input
                        id="sp-pic"
                        value={form.contactName}
                        onChange={e => setField('contactName', e.target.value)}
                        placeholder="Contoh: Rani Putri"
                        required
                        className={inputClass}
                        aria-invalid={!!fieldErrors.contactName}
                      />
                      {fieldErrors.contactName && (
                        <p className="mt-1 text-sm text-rose-600 dark:text-rose-400" role="alert">{fieldErrors.contactName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="sp-phone" className={labelClass}>Nomor WhatsApp <span className="text-rose-600" aria-hidden="true">* <span className="sr-only">(wajib diisi)</span></span></Label>
                      <Input
                        id="sp-phone"
                        value={form.phone}
                        onChange={e => setField('phone', e.target.value)}
                        placeholder="Contoh: 08123456789"
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
                    <Label htmlFor="sp-email" className={labelClass}>Email</Label>
                    <Input
                      id="sp-email"
                      value={form.email}
                      onChange={e => setField('email', e.target.value)}
                      placeholder="Contoh: rani@perusahaan.com"
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
                    <Label htmlFor="sp-message" className={labelClass}>Pesan</Label>
                    <Textarea
                      id="sp-message"
                      value={form.message}
                      onChange={e => setField('message', e.target.value)}
                      rows={4}
                      placeholder="Ceritakan ketertarikan kamu (opsional)"
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="ghost"
                    disabled={submitting}
                    className="h-auto w-full items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)]! px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Mengirim…
                      </>
                    ) : (
                      <>
                        <Handshake className="h-4 w-4" aria-hidden="true" />
                        Kirim minat dukungan
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </RevealSection>
        )}
      </main>

      <footer className="border-t border-[var(--wf-rule)] py-8 text-center text-xs text-[var(--wf-ink-muted)]">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &middot; Metland Coloring Life
      </footer>
    </div>
  );
}
