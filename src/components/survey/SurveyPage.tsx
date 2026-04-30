import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles, HeartHandshake, MessageCircle, ShieldCheck,
  Star, ListChecks, Users, Megaphone, ThumbsUp,
  Building2, Loader2, AlertTriangle, ClipboardCheck,
  User, Mail, Phone, Briefcase, Send, ArrowLeft,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDeviceFingerprint } from '../../utils/fingerprint';
import type { SurveyType } from '../../types';
import RatingSlider from './RatingSlider';
import SurveySuccess from './SurveySuccess';

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
  const [surveyType, setSurveyType] = useState<SurveyType | null>(
    (searchParams.get('type') as SurveyType) || null,
  );
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    mall_cleanliness: 0, mall_staff_service: 0, mall_coordination: 0, mall_security: 0,
    eo_event_quality: 0, eo_organization: 0, eo_committee_service: 0, eo_promotion_accuracy: 0, eo_recommendation: 0,
  });
  const [comments, setComments] = useState({ mall: '', eo: '', general: '' });
  const [identity, setIdentity] = useState({ name: '', email: '', phone: '', organization: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  /* ─── Load event + check fingerprint ─────────────────────────── */
  useEffect(() => {
    if (!eventId) { setError('Event ID tidak ditemukan'); setLoading(false); return; }

    let cancelled = false;
    (async () => {
      try {
        // Fetch event
        const { data: ev, error: evErr } = await supabase
          .from('events')
          .select('id, acara, tanggal, lokasi, eo, status')
          .eq('id', eventId)
          .single();

        if (cancelled) return;
        if (evErr || !ev) { setError('Event tidak ditemukan'); setLoading(false); return; }
        setEvent(ev);

        // Check fingerprint
        const fp = getDeviceFingerprint();
        const res = await fetch(`/api/survey?action=check&event_id=${eventId}&fingerprint=${encodeURIComponent(fp)}`);
        const json = await res.json();
        if (!cancelled && json.submitted) setAlreadySubmitted(true);
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
    return true;
  }, [surveyType, ratings]);

  /* ─── Submit ─────────────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    if (!isValid() || !eventId) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/survey?action=submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.already_submitted) {
          setAlreadySubmitted(true);
        } else {
          setSubmitError(json.errors?.join(', ') || json.error || 'Gagal mengirim survey');
        }
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError('Terjadi kesalahan jaringan');
    } finally {
      setSubmitting(false);
    }
  }, [isValid, eventId, surveyType, ratings, comments, identity]);

  /* ─── Render ─────────────────────────────────────────────────── */

  // Loading
  if (loading) {
    return (
      <PageShell onBack={goBack}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="mt-3 text-sm text-slate-500">Memuat survey...</p>
        </div>
      </PageShell>
    );
  }

  // Error
  if (error) {
    return (
      <PageShell onBack={goBack}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="mt-4 text-sm text-violet-600 hover:underline">
            Kembali ke Dashboard
          </button>
        </div>
      </PageShell>
    );
  }

  // Already submitted
  if (alreadySubmitted) {
    return (
      <PageShell onBack={goBack}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardCheck className="h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Anda Sudah Mengisi Survey</h2>
          <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
            Terima kasih! Anda sudah pernah mengisi survey untuk event "{event?.acara}".
          </p>
          <button onClick={() => navigate('/dashboard')} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
            Kembali ke Dashboard
          </button>
        </div>
      </PageShell>
    );
  }

  // Success
  if (submitted) {
    return (
      <PageShell onBack={goBack}>
        <SurveySuccess eventName={event?.acara || ''} onBack={() => navigate('/dashboard')} />
      </PageShell>
    );
  }

  // Survey form
  return (
    <PageShell onBack={goBack}>
      {/* Event info header */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 dark:border-violet-800 dark:from-violet-950/40 dark:to-indigo-950/40">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
            <Building2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{event?.acara}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {event?.tanggal} · {event?.lokasi}
            </p>
            {event?.eo && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Penyelenggara: {event.eo}</p>
            )}
          </div>
        </div>
      </div>

      {/* Survey type selector */}
      {!surveyType && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Anda mengisi sebagai:</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TypeCard
              title="Penyelenggara Event"
              desc="Saya EO / panitia event ini"
              icon={<Briefcase className="h-5 w-5" />}
              onClick={() => setSurveyType('organizer')}
            />
            <TypeCard
              title="Peserta / Pengunjung"
              desc="Saya hadir sebagai peserta"
              icon={<Users className="h-5 w-5" />}
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
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Mengisi sebagai: <span className="font-semibold text-violet-600 dark:text-violet-400">
                {surveyType === 'organizer' ? 'Penyelenggara' : 'Peserta / Pengunjung'}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setSurveyType(null)}
              className="text-xs text-violet-600 hover:underline dark:text-violet-400"
            >
              Ubah
            </button>
          </div>

          {/* Mall ratings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-violet-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Penilaian Pengelola Tempat
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
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
            <textarea
              placeholder="Komentar untuk pengelola tempat (opsional)"
              value={comments.mall}
              onChange={(e) => setComments(prev => ({ ...prev, mall: e.target.value }))}
              maxLength={1000}
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-violet-800"
            />
          </section>

          {/* EO ratings — only for public */}
          {surveyType === 'public' && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Penilaian Penyelenggara Event
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
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
              <textarea
                placeholder="Komentar untuk penyelenggara event (opsional)"
                value={comments.eo}
                onChange={(e) => setComments(prev => ({ ...prev, eo: e.target.value }))}
                maxLength={1000}
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-violet-800"
              />
            </section>
          )}

          {/* General comment */}
          <section className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Komentar Umum <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <textarea
              placeholder="Saran, kritik, atau masukan lainnya..."
              value={comments.general}
              onChange={(e) => setComments(prev => ({ ...prev, general: e.target.value }))}
              maxLength={1000}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-violet-800"
            />
          </section>

          {/* Identity (optional) */}
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Data Diri <span className="font-normal text-slate-400">(opsional)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tidak wajib diisi. Data hanya digunakan untuk keperluan internal.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InputField icon={<User className="h-4 w-4" />} placeholder="Nama" value={identity.name}
                onChange={(v) => setIdentity(prev => ({ ...prev, name: v }))} maxLength={100} />
              <InputField icon={<Mail className="h-4 w-4" />} placeholder="Email" type="email" value={identity.email}
                onChange={(v) => setIdentity(prev => ({ ...prev, email: v }))} maxLength={254} />
              <InputField icon={<Phone className="h-4 w-4" />} placeholder="No. Telepon" type="tel" value={identity.phone}
                onChange={(v) => setIdentity(prev => ({ ...prev, phone: v }))} maxLength={20} />
              {surveyType === 'organizer' && (
                <InputField icon={<Briefcase className="h-4 w-4" />} placeholder="Nama Organisasi" value={identity.organization}
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
          <button
            type="button"
            disabled={!isValid() || submitting}
            onClick={handleSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? 'Mengirim...' : 'Kirim Survey'}
          </button>
        </div>
      )}
    </PageShell>
  );
}


/* ─── Page shell ───────────────────────────────────────────────── */

function PageShell({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <ClipboardCheck className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">Survey Kepuasan</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Metropolitan Mall Bekasi</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-xl space-y-6 px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi
      </footer>
    </div>
  );
}


/* ─── Type selection card ──────────────────────────────────────── */

function TypeCard({ title, desc, icon, onClick }: { title: string; desc: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-violet-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-600"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </button>
  );
}


/* ─── Input field ──────────────────────────────────────────────── */

function InputField({ icon, placeholder, value, onChange, type = 'text', maxLength }: {
  icon: React.ReactNode; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string; maxLength?: number;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-violet-800"
      />
    </div>
  );
}
