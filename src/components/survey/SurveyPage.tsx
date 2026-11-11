import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles, HeartHandshake, MessageCircle, ShieldCheck,
  Star, ListChecks, Users, Megaphone, ThumbsUp,
  Building2, Loader2, AlertTriangle, ClipboardCheck,
  User, Mail, Phone, Briefcase, Send, ArrowLeft,
} from 'lucide-react';
import { apiGet, apiPost, ApiError } from '../../lib/rest';
import { getDeviceFingerprint } from '../../utils/fingerprint';
import { validateEmail } from '../../utils/validation';
import type { SurveyType } from '../../types';
import RatingSlider from './RatingSlider';
import SurveySuccess from './SurveySuccess';
import { Button } from '../shadcn/button';
import { Input } from '../shadcn/input';
import { Label } from '../shadcn/label';
import { Textarea } from '../shadcn/textarea';

/* ─── Mall rating aspects ──────────────────────────────────────── */
const MALL_ASPECTS = [
  { key: 'mall_cleanliness', label: 'Kebersihan & Fasilitas', desc: 'Kondisi venue, toilet, parkir, AC', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'mall_staff_service', label: 'Pelayanan Staff', desc: 'Responsivitas, keramahan, bantuan teknis', icon: <HeartHandshake className="h-4 w-4" /> },
  { key: 'mall_coordination', label: 'Koordinasi & Komunikasi', desc: 'Kemudahan koordinasi sebelum/selama event', icon: <MessageCircle className="h-4 w-4" /> },
  { key: 'mall_security', label: 'Keamanan', desc: 'Security, crowd management, prosedur darurat', icon: <ShieldCheck className="h-4 w-4" /> },
] as const;

/* ─── EO rating aspects ────────────────────────────────────────── */
const EO_ASPECTS = [
  { key: 'eo_event_quality', label: 'Kualitas Acara', desc: 'Kualitas konten, hiburan, pengalaman', icon: <Star className="h-4 w-4" /> },
  { key: 'eo_organization', label: 'Organisasi & Kelancaran', desc: 'Registrasi, antrian, flow pengunjung', icon: <ListChecks className="h-4 w-4" /> },
  { key: 'eo_committee_service', label: 'Pelayanan Panitia', desc: 'Keramahan panitia, bantuan informasi', icon: <Users className="h-4 w-4" /> },
  { key: 'eo_promotion_accuracy', label: 'Kesesuaian Promosi', desc: 'Apakah sesuai ekspektasi dari promosi', icon: <Megaphone className="h-4 w-4" /> },
  { key: 'eo_recommendation', label: 'Rekomendasi', desc: 'Seberapa besar Anda merekomendasikan event ini', icon: <ThumbsUp className="h-4 w-4" /> },
] as const;

type RatingKey = typeof MALL_ASPECTS[number]['key'] | typeof EO_ASPECTS[number]['key'];

interface EventInfo {
  id: string;
  acara: string;
  tanggal: string;
  lokasi: string;
  eo: string;
  status: string;
}

export default function SurveyPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [error, setError] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [surveyType, setSurveyType] = useState<SurveyType | null>(() => {
    // Validasi runtime: query string apa pun tidak boleh dipaksa ke union.
    const t = searchParams.get('type');
    return t === 'organizer' || t === 'public' ? t : null;
  });
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    mall_cleanliness: 0, mall_staff_service: 0, mall_coordination: 0, mall_security: 0,
    eo_event_quality: 0, eo_organization: 0, eo_committee_service: 0, eo_promotion_accuracy: 0, eo_recommendation: 0,
  });
  const [comments, setComments] = useState({ mall: '', eo: '', general: '' });
  const [identity, setIdentity] = useState({ name: '', email: '', phone: '', organization: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  /* ─── Load event + check fingerprint ─────────────────────────── */
  useEffect(() => {
    if (!eventId) { setError('Event ID tidak ditemukan'); setLoading(false); return; }

    let cancelled = false;
    (async () => {
      try {
        // Fetch event — REST publik (Opsi B), envelope {success,data} → apiGet unwrap.
        const ev = await apiGet<EventInfo | null>(`/events/${encodeURIComponent(eventId)}`);

        if (cancelled) return;
        if (!ev) { setError('Event tidak ditemukan'); setLoading(false); return; }
        setEvent(ev);

        // Check fingerprint — GET /api/v1/survey/check (apiGet unwrap → data.submitted).
        const fp = getDeviceFingerprint();
        const checked = await apiGet<{ submitted?: boolean }>(
          `/survey/check?event_id=${encodeURIComponent(eventId)}&fingerprint=${encodeURIComponent(fp)}`,
        );
        if (!cancelled && checked?.submitted) setAlreadySubmitted(true);
      } catch {
        if (!cancelled) setError('Gagal memuat data event');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  /* ─── Set rating ─────────────────────────────────────────────── */
  const setRating = useCallback((key: RatingKey, val: number) => {
    setRatings(prev => ({ ...prev, [key]: val }));
  }, []);

  /* ─── Validate ───────────────────────────────────────────────── */
  const isValid = useCallback(() => {
    if (!surveyType) return false;
    // All mall ratings must be set
    for (const a of MALL_ASPECTS) {
      if (ratings[a.key] === 0) return false;
    }
    // If public, all EO ratings must be set
    if (surveyType === 'public') {
      for (const a of EO_ASPECTS) {
        if (ratings[a.key] === 0) return false;
      }
    }
    // Validate email format if provided
    if (identity.email) {
      const emailResult = validateEmail(identity.email);
      if (!emailResult.valid) return false;
    }
    return true;
  }, [surveyType, ratings, identity.email]);

  /* ─── Submit ─────────────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    if (!isValid() || !eventId) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      // POST /api/v1/survey/submit — 201 {success,id}; 409 {already_submitted}
      // diteruskan via ApiError.payload; 400 {errors[]} via payload.
      await apiPost<{ success: boolean; id?: string }>('/survey/submit', {
        event_id: eventId,
        survey_type: surveyType,
        ...ratings,
        mall_comment: comments.mall,
        eo_comment: comments.eo,
        general_comment: comments.general,
        respondent_name: identity.name,
        respondent_email: identity.email,
        respondent_phone: identity.phone,
        respondent_organization: identity.organization,
        device_fingerprint: getDeviceFingerprint(),
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.payload?.already_submitted === true) {
        setAlreadySubmitted(true);
        return;
      }
      const errs = err instanceof ApiError ? (err.payload?.errors as string[] | undefined) : undefined;
      setSubmitError(
        (Array.isArray(errs) ? errs.join(', ') : undefined)
        || (err instanceof Error ? err.message : 'Gagal mengirim survey'),
      );
    } finally {
      setSubmitting(false);
    }
  }, [isValid, eventId, surveyType, ratings, comments, identity]);

  /* ─── Render ─────────────────────────────────────────────────── */

  // Loading
  if (loading) {
    // Catatan konversi: sufiks `!` pada className menaklukkan default primitif
    // (h-8/px-2.5/border-input/bg-primary/…) yang urutannya lebih akhir di CSS;
    // warna & ukuran asli --wf-* tetap dipakai apa adanya.
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--wf-accent)]" />
          <p className="mt-3 text-sm text-[var(--wf-ink-muted)]">Memuat survey…</p>
        </div>
      </PageShell>
    );
  }

  // Error
  if (error) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-rose-500" />
          <p className="mt-3 text-sm font-medium text-[var(--wf-ink-muted)]">{error}</p>
          <Button variant="link" onClick={() => navigate('/dashboard')} className="mt-4 h-auto px-0! text-sm font-normal text-[var(--wf-accent)]">
            Kembali ke Dashboard
          </Button>
        </div>
      </PageShell>
    );
  }

  // Already submitted
  if (alreadySubmitted) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardCheck className="h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-lg font-bold text-[var(--wf-ink)]">Anda Sudah Mengisi Survey</h2>
          <p className="mt-2 max-w-xs text-sm text-[var(--wf-ink-muted)]">
            Terima kasih! Anda sudah pernah mengisi survey untuk event "{event?.acara}".
          </p>
          <Button onClick={() => navigate('/dashboard')} className="mt-6 h-auto inline-flex items-center gap-2 rounded-xl bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--wf-accent-ink)] hover:bg-[var(--wf-accent)]!">
            Kembali ke Dashboard
          </Button>
        </div>
      </PageShell>
    );
  }

  // Success
  if (submitted) {
    return (
      <PageShell>
        <SurveySuccess eventName={event?.acara || ''} onBack={() => navigate('/dashboard')} />
      </PageShell>
    );
  }

  // Survey form
  return (
    <PageShell>
      {/* Event info header */}
      <div className="rounded-2xl border border-[var(--wf-accent)]/40 bg-[var(--wf-accent-soft)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--wf-accent-soft)]">
            <Building2 className="h-5 w-5 text-[var(--wf-accent)]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--wf-ink)]">{event?.acara}</h2>
            <p className="text-xs text-[var(--wf-ink-muted)]">
              {event?.tanggal} · {event?.lokasi}
            </p>
            {event?.eo && (
              <p className="text-xs text-[var(--wf-ink-muted)]">Penyelenggara: {event.eo}</p>
            )}
          </div>
        </div>
      </div>

      {/* Survey type selector */}
      {!surveyType && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--wf-ink)]">Anda mengisi sebagai:</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TypeCard
              title="Penyelenggara Event"
              desc="Saya EO / panitia event ini"
              icon={<Briefcase className="size-5" />}
              onClick={() => setSurveyType('organizer')}
            />
            <TypeCard
              title="Peserta / Pengunjung"
              desc="Saya hadir sebagai peserta"
              icon={<Users className="size-5" />}
              onClick={() => setSurveyType('public')}
            />
          </div>
        </div>
      )}

      {/* Form sections — only show after type selected */}
      {surveyType && (
        <div className="space-y-6">
          {/* Type indicator */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--wf-ink-muted)]">
              Mengisi sebagai: <span className="font-semibold text-[var(--wf-accent)]">
                {surveyType === 'organizer' ? 'Penyelenggara' : 'Peserta / Pengunjung'}
              </span>
            </p>
            <Button
              type="button"
              variant="link"
              onClick={() => setSurveyType(null)}
              className="h-auto px-0! text-xs font-normal text-[var(--wf-accent)]"
            >
              Ubah
            </Button>
          </div>

          {/* Mall ratings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-[var(--wf-accent)]" />
              <h3 className="text-sm font-bold text-[var(--wf-ink)]">
                Penilaian Pengelola Tempat
              </h3>
            </div>
            <p className="text-xs text-[var(--wf-ink-muted)]">
              Berikan penilaian Anda terhadap Metropolitan Mall Bekasi
            </p>
            <div className="space-y-5">
              {MALL_ASPECTS.map((a) => (
                <RatingSlider
                  key={a.key}
                  label={a.label}
                  description={a.desc}
                  icon={a.icon}
                  value={ratings[a.key]}
                  onChange={(v) => setRating(a.key, v)}
                />
              ))}
            </div>
            {/* Mall comment */}
            <Label htmlFor="survey-mall-comment" className="sr-only">Komentar untuk pengelola tempat</Label>
            <Textarea
              id="survey-mall-comment"
              placeholder="Komentar untuk pengelola tempat (opsional)"
              value={comments.mall}
              onChange={(e) => setComments(prev => ({ ...prev, mall: e.target.value }))}
              maxLength={1000}
              rows={2}
              className="min-h-0! field-sizing-fixed w-full rounded-xl border border-[var(--wf-rule)]! bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)]! ui-focus-ring focus-visible:border-[var(--wf-accent)]!"
            />
          </section>

          {/* EO ratings — only for public */}
          {surveyType === 'public' && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-[var(--wf-accent)]" />
                <h3 className="text-sm font-bold text-[var(--wf-ink)]">
                  Penilaian Penyelenggara Event
                </h3>
              </div>
              <p className="text-xs text-[var(--wf-ink-muted)]">
                Berikan penilaian Anda terhadap penyelenggara event: {event?.eo || '-'}
              </p>
              <div className="space-y-5">
                {EO_ASPECTS.map((a) => (
                  <RatingSlider
                    key={a.key}
                    label={a.label}
                    description={a.desc}
                    icon={a.icon}
                    value={ratings[a.key]}
                    onChange={(v) => setRating(a.key, v)}
                  />
                ))}
              </div>
              {/* EO comment */}
              <Label htmlFor="survey-eo-comment" className="sr-only">Komentar untuk penyelenggara event</Label>
              <Textarea
                id="survey-eo-comment"
                placeholder="Komentar untuk penyelenggara event (opsional)"
                value={comments.eo}
                onChange={(e) => setComments(prev => ({ ...prev, eo: e.target.value }))}
                maxLength={1000}
                rows={2}
                className="min-h-0! field-sizing-fixed w-full rounded-xl border border-[var(--wf-rule)]! bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)]! ui-focus-ring focus-visible:border-[var(--wf-accent)]!"
              />
            </section>
          )}

          {/* General comment */}
          <section className="space-y-2">
            <Label htmlFor="survey-general-comment" className="block text-sm font-semibold leading-normal text-[var(--wf-ink)]">
              Komentar Umum <span className="font-normal text-[var(--wf-ink-muted)]">(opsional)</span>
            </Label>
            <Textarea
              id="survey-general-comment"
              placeholder="Saran, kritik, atau masukan lainnya…"
              value={comments.general}
              onChange={(e) => setComments(prev => ({ ...prev, general: e.target.value }))}
              maxLength={1000}
              rows={3}
              className="min-h-0! field-sizing-fixed w-full rounded-xl border border-[var(--wf-rule)]! bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)]! ui-focus-ring focus-visible:border-[var(--wf-accent)]!"
            />
          </section>

          {/* Identity (optional) */}
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--wf-ink)]">
                Data Diri <span className="font-normal text-[var(--wf-ink-muted)]">(opsional)</span>
              </h3>
              <p className="text-xs text-[var(--wf-ink-muted)]">
                Tidak wajib diisi. Data hanya digunakan untuk keperluan internal.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InputField id="survey-name" label="Nama" icon={<User className="h-4 w-4" />} placeholder="Nama" value={identity.name}
                onChange={(v) => setIdentity(prev => ({ ...prev, name: v }))} maxLength={100} />
              <InputField id="survey-email" label="Email" icon={<Mail className="h-4 w-4" />} placeholder="Email" type="email" value={identity.email}
                onChange={(v) => setIdentity(prev => ({ ...prev, email: v }))} maxLength={254} />
              <InputField id="survey-phone" label="No. Telepon" icon={<Phone className="h-4 w-4" />} placeholder="No. Telepon" type="tel" value={identity.phone}
                onChange={(v) => setIdentity(prev => ({ ...prev, phone: v }))} maxLength={20} />
              {surveyType === 'organizer' && (
                <InputField id="survey-organization" label="Nama Organisasi" icon={<Briefcase className="h-4 w-4" />} placeholder="Nama Organisasi" value={identity.organization}
                  onChange={(v) => setIdentity(prev => ({ ...prev, organization: v }))} maxLength={200} />
              )}
            </div>
          </section>

          {/* Submit error */}
          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {submitError}
            </div>
          )}

          {/* Submit button */}
          <Button
            type="button"
            disabled={!isValid() || submitting}
            onClick={handleSubmit}
            className="flex! h-auto w-full items-center justify-center gap-2 rounded-xl bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] shadow-lg shadow-brand-primary-200 transition-colors hover:bg-[var(--wf-accent)]! focus:outline-none focus-visible:ring-2! focus-visible:ring-[var(--wf-accent)]! focus-visible:ring-offset-2 disabled:pointer-events-auto! disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? 'Mengirim…' : 'Kirim Survey'}
          </Button>
        </div>
      )}
    </PageShell>
  );
}


/* ─── Page shell ───────────────────────────────────────────────── */

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--wf-board-2)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--wf-rule)] bg-[var(--wf-board)]/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-3">
          <Link
            to="/events"
className="touch-target relative flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium text-[var(--wf-ink-muted)] transition-colors hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink-muted)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Jadwal Event
          </Link>
          <ClipboardCheck className="h-5 w-5 shrink-0 text-[var(--wf-accent)]" />
          <div>
            <h1 className="text-sm font-bold text-[var(--wf-ink)]">Survey Kepuasan</h1>
            <p className="text-[11px] text-[var(--wf-ink-muted)]">Metropolitan Mall Bekasi</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-xl space-y-6 px-4 py-6 outline-none">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--wf-rule)] py-4 text-center text-xs text-[var(--wf-ink-muted)]">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi
      </footer>
    </div>
  );
}


/* ─── Type selection card ──────────────────────────────────────── */

function TypeCard({ title, desc, icon, onClick }: { title: string; desc: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    /* Container-as-button — seluruh permukaan kartu adalah target klik dan
       membungkus ikon + judul + deskripsi. shadcn `Button` ghost dengan chrome
       primitif dinetralkan: `h-auto!`/`p-4!`/`justify-start!`/`items-start!`
       mematikan h-8/px-2.5/py-1/justify-center/items-center, `font-normal!` &
       `whitespace-normal!` mengembalikan inherit, dan border asli tetap
       (warna `!` agar mengalahkan `border-transparent` primitif, hover-border
       ikut `!` supaya tidak kalah dari border-color istirahat yang `!`). */
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className="flex! h-auto! items-start! justify-start! gap-3 whitespace-normal! rounded-2xl border border-[var(--wf-rule)]! bg-[var(--wf-board)] p-4! text-left! font-normal! transition-colors hover:border-[var(--wf-accent)]! hover:bg-[var(--wf-board)]! hover:shadow-md! focus:outline-none focus-visible:ring-2! focus-visible:ring-[var(--wf-accent)]! active:translate-y-0!"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--wf-ink)]">{title}</p>
        <p className="text-xs text-[var(--wf-ink-muted)]">{desc}</p>
      </div>
    </Button>
  );
}


/* ─── Input field ──────────────────────────────────────────────── */

function InputField({ id, label, icon, placeholder, value, onChange, type = 'text', maxLength }: {
  id: string; label: string;
  icon: React.ReactNode; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string; maxLength?: number;
}) {
  return (
    <div className="relative">
      {/* Placeholder bukan label: pembaca layar butuh nama field yang stabil. */}
      <Label htmlFor={id} className="sr-only">{label}</Label>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--wf-ink-muted)]">{icon}</span>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="h-auto w-full rounded-xl border border-[var(--wf-rule)]! bg-[var(--wf-board)] py-2.5 pl-10 pr-3 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)]! focus:border-[var(--wf-accent)]! focus:outline-none focus:ring-2! focus:ring-[var(--wf-accent)]!"
      />
    </div>
  );
}
