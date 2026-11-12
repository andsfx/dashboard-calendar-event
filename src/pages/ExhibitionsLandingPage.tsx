import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Handshake, MapPin, RefreshCw } from 'lucide-react';
import type { Exhibition, ExhibitionActivation, ExhibitionLeadInput } from '../types';
import { fetchPublicExhibitions, fetchPublicExhibition, submitExhibitionLead } from '../utils/domainApi';
import { formatDateRange } from '../utils/eventUtils';
import { validateEmail, validatePhone } from '../utils/validation';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { RevealSection } from '../components/community/CommunityRevealPrimitives';
import { Button } from '../components/shadcn/button';
import { Input } from '../components/shadcn/input';
import { Label } from '../components/shadcn/label';
import { NativeSelect } from '../components/shadcn/native-select';
import { Textarea } from '../components/shadcn/textarea';
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

const inputClass = 'w-full rounded-[var(--radius-control)]! border border-[var(--wf-rule)]! bg-[var(--wf-board)]! px-4 py-3 text-sm text-[var(--wf-ink)] outline-none transition h-auto field-sizing-fixed! focus-visible:ring-2! focus-visible:ring-[var(--brand-tosca)]!';
const labelClass = 'mb-1.5 block! text-xs font-semibold leading-normal text-[var(--wf-ink-muted)]';
// NativeSelect menaruh className di pembungkus: token kontrol lama dipindah ke <select> di dalamnya.
const selectClass = 'w-full [&>select]:h-auto [&>select]:rounded-[var(--radius-control)]! [&>select]:border-[var(--wf-rule)]! [&>select]:bg-[var(--wf-board)]! [&>select]:py-3 [&>select]:pl-4 [&>select]:focus-visible:ring-2! [&>select]:focus-visible:ring-[var(--brand-tosca)]!';

export function ExhibitionsLandingPage({ isDark, onToggleDark }: Props) {
  const { id } = useParams<{ id: string }>();
  usePageMeta({
    title: 'Pameran dan kolaborasi - Metropolitan Mall Bekasi',
    description: 'Ajak brand dan EO bekerja sama mengisi pameran serta aktivasi di Metropolitan Mall Bekasi.',
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
    if (!phoneCheck.valid) errs.phone = phoneCheck.error || 'Nomor telepon belum sesuai format. Gunakan 08xxx, +628xxx, atau 628xxx.';
    if (form.email) {
      const emailCheck = validateEmail(form.email);
      if (!emailCheck.valid) errs.email = emailCheck.error || 'Email belum sesuai format. Contoh yang benar: nama@email.com';
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
    <div className="ui-dashboard-page min-h-screen bg-[var(--wf-page)] text-[var(--wf-ink)] transition-colors duration-300">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke konten
      </a>
      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 outline-none">
        {isLoading && <p className="text-sm text-[var(--wf-ink-muted)]">Memuat pameran…</p>}

        {!isLoading && loadError && (
          <div className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/40">
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRetryCount(c => c + 1)}
              className="mt-3 h-auto items-center gap-2 rounded-full bg-[var(--wf-accent)]! px-4 py-2 text-sm font-bold! text-[var(--wf-accent-ink)] hover:bg-[var(--wf-accent)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0!"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Coba lagi
            </Button>
          </div>
        )}

        {!isLoading && !loadError && !id && (
          <RevealSection as="div" refreshKey={`${list.length}:${list[0]?.id ?? ''}`}>
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Kolaborasi pameran</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--wf-ink-muted)]">
              Metropolitan Mall Bekasi mengajak brand dan event organizer mengisi pameran bersama tim Casual Leasing dan Marcomm, baik sebagai peserta booth maupun pengisi aktivasi.
            </p>

            {list.length === 0 && (
              <p className="mt-8 text-sm text-[var(--wf-ink-muted)]">Belum ada pameran yang dibuka. Silakan cek kembali nanti.</p>
            )}

            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {list.map(item => (
                <li key={item.id} data-reveal-item className="rounded-[var(--radius-campaign-card)] border border-[var(--border-subtle)] bg-[var(--wf-board)] p-5">
                  <h2 className="font-display text-xl font-bold">{item.title}</h2>
                  {item.theme && <p className="mt-1 text-sm font-medium text-[var(--wf-accent)]">{item.theme}</p>}
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--wf-ink-muted)]">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDateRange(item.dateStart, item.dateEnd)}</span>
                    {item.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{item.location}</span>}
                  </p>
                  {item.description && <p className="mt-3 text-sm leading-6 text-[var(--wf-ink-muted)]">{item.description}</p>}
                  <Link to={`/pameran/${item.id}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]">
                    <Handshake className="h-4 w-4" aria-hidden="true" />
                    {item.acceptingApplications ? 'Ajukan kolaborasi' : 'Lihat detail'}
                  </Link>
                </li>
              ))}
            </ul>

            {list.length > 0 && openExhibitions.length === 0 && (
              <p className="mt-6 text-sm text-[var(--wf-ink-muted)]">
                Saat ini belum ada pameran yang membuka pengajuan kolaborasi baru.
              </p>
            )}
          </RevealSection>
        )}

        {!isLoading && !loadError && id && exhibition && (
          <>
            <RevealSection as="div" refreshKey={`${exhibition.id}:${detail?.activations.length ?? 0}`}>
            <Link to="/pameran" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--wf-ink-muted)]">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Semua pameran
            </Link>
            <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">{exhibition.title}</h1>
            {exhibition.theme && <p className="mt-1 text-base font-medium text-[var(--wf-accent)]">{exhibition.theme}</p>}
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--wf-ink-muted)]">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDateRange(exhibition.dateStart, exhibition.dateEnd)}</span>
              {exhibition.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{exhibition.location}</span>}
            </p>
            {exhibition.description && <p className="mt-4 text-base leading-7 text-[var(--wf-ink-muted)]">{exhibition.description}</p>}
            </RevealSection>

            {exhibition.collaborationBrief && (
              <RevealSection className="mt-8 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--wf-board)] p-5">
                <h2 className="font-display text-lg font-bold">Yang kami cari</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--wf-ink-muted)]">{exhibition.collaborationBrief}</p>
              </RevealSection>
            )}

            <RevealSection className="mt-8" refreshKey={detail?.activations.length ?? 0}>
              <h2 className="font-display text-lg font-bold">Agenda aktivasi</h2>
              {detail && detail.activations.length === 0 && (
                <p className="mt-2 text-sm text-[var(--wf-ink-muted)]">
                  Agenda aktivasi belum diumumkan. Konsep kegiatan dari mitra masih kami kurasi.
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {detail?.activations.map(activation => (
                  <li key={activation.eventId} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--wf-board)] p-4  ">
                    <p className="font-semibold">{activation.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--wf-ink-muted)]">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDateRange(activation.dateStart, activation.dateEnd)}</span>
                      {activation.time && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden="true" />{activation.time}</span>}
                      {activation.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{activation.location}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </RevealSection>

            <section id="ajukan" className="mt-10 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--wf-board)] p-5 sm:p-6">
              <RevealSection as="div">
                <h2 className="font-display text-lg font-bold">Ajukan kolaborasi</h2>
              </RevealSection>

              {!exhibition.acceptingApplications && (
                <p className="mt-2 text-sm text-[var(--wf-ink-muted)]">
                  Pengajuan kolaborasi untuk pameran ini sedang ditutup.
                </p>
              )}

              {exhibition.acceptingApplications && submitted && (
                <div className="mt-3 flex items-start gap-3 rounded-[var(--radius-card)] bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <p>Pengajuan terkirim. Tim kami akan meninjau dan menghubungi kamu. Pengajuan ini belum berarti booth atau jadwal sudah dikonfirmasi.</p>
                </div>
              )}

              {exhibition.acceptingApplications && !submitted && (
                <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
                  <div className="sm:col-span-2">
                    <Label className={labelClass} htmlFor="lead-org">
                      Nama brand / EO <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </Label>
                    <Input id="lead-org" className={inputClass} value={form.organizationName} onChange={e => setForm({ ...form, organizationName: e.target.value })} aria-invalid={!!fieldErrors.organizationName} aria-describedby={fieldErrors.organizationName ? 'lead-org-err' : undefined} />
                    {fieldErrors.organizationName && <p id="lead-org-err" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{fieldErrors.organizationName}</p>}
                  </div>

                  <div>
                    <Label className={labelClass} htmlFor="lead-type">Jenis organisasi</Label>
                    <NativeSelect id="lead-type" className={selectClass} value={form.organizationType} onChange={e => setForm({ ...form, organizationType: e.target.value as ExhibitionLeadInput['organizationType'] })}>
                      <option value="brand">Brand</option>
                      <option value="eo">Event organizer</option>
                    </NativeSelect>
                  </div>

                  <div>
                    <Label className={labelClass} htmlFor="lead-participation">Bentuk kontribusi</Label>
                    <NativeSelect id="lead-participation" className={selectClass} value={form.participation} onChange={e => setForm({ ...form, participation: e.target.value as ExhibitionLeadInput['participation'] })}>
                      {PARTICIPATION_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label} · {option.hint}</option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div>
                    <Label className={labelClass} htmlFor="lead-contact">
                      Nama PIC <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </Label>
                    <Input id="lead-contact" className={inputClass} value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} aria-invalid={!!fieldErrors.contactName} aria-describedby={fieldErrors.contactName ? 'lead-contact-err' : undefined} />
                    {fieldErrors.contactName && <p id="lead-contact-err" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{fieldErrors.contactName}</p>}
                  </div>

                  <div>
                    <Label className={labelClass} htmlFor="lead-phone">
                      Nomor WhatsApp <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </Label>
                    <Input id="lead-phone" className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'lead-phone-err' : undefined} />
                    {fieldErrors.phone && <p id="lead-phone-err" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{fieldErrors.phone}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <Label className={labelClass} htmlFor="lead-email">Email</Label>
                    <Input id="lead-email" className={inputClass} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'lead-email-err' : undefined} />
                    {fieldErrors.email && <p id="lead-email-err" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{fieldErrors.email}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <Label className={labelClass} htmlFor="lead-proposal">Konsep kontribusi</Label>
                    <Textarea id="lead-proposal" rows={4} className={inputClass} value={form.proposal} onChange={e => setForm({ ...form, proposal: e.target.value })} placeholder="Contoh: beauty class 60 menit untuk 30 peserta." aria-invalid={!!fieldErrors.proposal} aria-describedby={fieldErrors.proposal ? 'lead-proposal-err' : undefined} />
                    {fieldErrors.proposal && <p id="lead-proposal-err" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{fieldErrors.proposal}</p>}
                  </div>

                  {submitError && <p role="alert" className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{submitError}</p>}

                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      variant="ghost"
                      disabled={submitting}
                      className="h-auto items-center gap-2 rounded-full bg-[var(--wf-accent)]! px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60"
                    >
                      <Handshake className="h-4 w-4" aria-hidden="true" />
                      {submitting ? 'Mengirim…' : 'Kirim pengajuan'}
                    </Button>
                    <p className="mt-2 text-xs text-[var(--wf-ink-muted)]">
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
