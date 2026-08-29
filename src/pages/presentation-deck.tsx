import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  Calendar,
  Database,
  Globe,
  Code2,
  MessageCircle,
  Layers,
  LayoutDashboard,
  Filter,
  Clock4,
  Store,
  ShieldCheck,
  Camera,
  FileText,
  CalendarPlus,
  BarChart3,
  Mail,
  Phone,
} from 'lucide-react';
import mallLogo from '../assets/brand/LOGOMETMAL2016-01.svg';

type SlideProps = { isActive: boolean };

const TOTAL_SLIDES = 8;

/* ---------- Shared chrome (footer nav + progress) ---------- */

function DeckChrome({
  index,
  onPrev,
  onNext,
}: {
  index: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const atStart = index === 0;
  const atEnd = index === TOTAL_SLIDES - 1;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-4 px-6 py-5 sm:px-10 sm:py-6"
      aria-hidden="true"
    >
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={atStart}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white/85 px-4 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900"
          aria-label="Slide sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          Sebelumnya
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={atEnd}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-primary-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Slide berikutnya"
        >
          Berikutnya
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] ui-text-muted">
          {index + 1} / {TOTAL_SLIDES}
        </span>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={
                i === index
                  ? 'h-1.5 w-6 rounded-full bg-brand-primary-500 transition-all'
                  : 'h-1.5 w-1.5 rounded-full bg-slate-300 transition-all dark:bg-slate-600'
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DeckFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-6 py-5 sm:px-10 sm:py-6">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ui-text-muted">
        {children}
      </div>
    </div>
  );
}

/* ---------- Slide 1 — Cover ---------- */

function SlideCover({ isActive }: SlideProps) {
  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Logo + year */}
      <div className="flex items-start justify-between px-6 pt-6 sm:px-10 sm:pt-9">
        <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-10 w-auto sm:h-12" />
        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-primary-600 dark:text-brand-primary-400">
            Presentasi Internal
          </div>
          <div className="mt-1 font-display text-3xl text-slate-700 dark:text-slate-300 sm:text-4xl">2026</div>
        </div>
      </div>

      {/* Center content */}
      <div className="flex flex-1 items-center justify-center px-6 sm:px-10">
        <div
          className={
            'max-w-5xl text-center transition-all duration-700 ease-out ' +
            (isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')
          }
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-primary-200 bg-brand-primary-50 px-3.5 py-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-brand-primary-700 dark:border-brand-primary-800 dark:bg-brand-primary-950/40 dark:text-brand-primary-300">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
            Marcomm · Metropolitan Mall Bekasi
          </div>
          <h1 className="font-display text-4xl leading-[1.1] text-slate-900 dark:text-white sm:text-6xl md:text-7xl">
            Sistem Manajemen Event
            <br />
            <span className="text-brand-primary-600 dark:text-brand-primary-400">
              Metropolitan Mall Bekasi
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            Inovasi Marcomm dalam Pengelolaan Jadwal Event
          </p>
        </div>
      </div>

      {/* Presenter strip */}
      <div className="px-6 pb-24 sm:px-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-6 py-4 backdrop-blur sm:flex-row sm:gap-6 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-primary-500 text-sm font-bold text-white">
              A
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] ui-text-muted">
                Pemateri
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Marcomm &mdash; Andy Safii
              </div>
            </div>
          </div>
          <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <div className="text-center sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] ui-text-muted">
              Audiens
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Presentasi untuk Pimpinan Unit
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Slide 2 — Pengenalan Project ---------- */

function SlideIntro({ isActive }: SlideProps) {
  const anim = isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2';
  return (
    <SlideFrame
      eyebrow="01 · Pengenalan"
      title="Apa yang kami bangun"
      subtitle="Sebuah dashboard terpusat untuk mengelola dan memantau jadwal event Metropolitan Mall Bekasi."
    >
      <div className={'grid gap-6 lg:grid-cols-12 transition-all duration-500 ' + anim}>
        {/* Left — overview */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/40 dark:text-brand-primary-300">
              <LayoutDashboard className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h3 className="font-display text-xl text-slate-900 dark:text-white">Dashboard terpusat</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Aplikasi internal yang menyatukan seluruh jadwal event Marcomm &mdash; dari
              perencanaan sampai publikasi &mdash; dalam satu tampilan yang konsisten untuk semua
              tim.
            </p>
          </div>
        </div>

        {/* Right — poin utama */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl text-slate-900 dark:text-white">Poin utama</h3>
              <span className="rounded-full bg-brand-secondary-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-secondary-700 dark:bg-brand-secondary-950/40 dark:text-brand-secondary-300">
                Highlights
              </span>
            </div>
            <ul className="space-y-2.5">
              <Point
                icon={<Database className="h-4 w-4" strokeWidth={1.75} />}
                title="Satu sumber data terpusat"
                body="Seluruh jadwal event tersimpan di satu tempat &mdash; tidak lagi tersebar di chat, spreadsheet, atau catatan pribadi."
              />
              <Point
                icon={<Layers className="h-4 w-4" strokeWidth={1.75} />}
                title="Empat tampilan jadwal"
                body="Tabel, kalender, kanban, dan timeline &mdash; pilih sesuai gaya kerja tim."
              />
              <Point
                icon={<Globe className="h-4 w-4" strokeWidth={1.75} />}
                title="Landing page publik"
                body="Halaman publik untuk pengunjung mall melihat event terkini tanpa login."
              />
              <Point
                icon={<Code2 className="h-4 w-4" strokeWidth={1.75} />}
                title="Stack teknologi"
                body="React 19, TypeScript (strict mode), Tailwind CSS v4, dan Supabase sebagai backend."
              />
            </ul>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

function Point({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-brand-primary-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-brand-primary-300 dark:ring-slate-700">
        {icon}
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{body}</p>
      </div>
    </li>
  );
}

/* ---------- Slide 3 — Masalah -> Solusi ---------- */

function SlideProblemSolution({ isActive }: SlideProps) {
  const anim = isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2';
  return (
    <SlideFrame
      eyebrow="02 · Inti inovasi Marcomm"
      title="Dari WhatsApp manual ke sistem terintegrasi"
      subtitle="Pergeseran paling signifikan dalam cara kerja Marcomm mengelola pendaftaran event."
    >
      <div className={'grid gap-5 lg:grid-cols-2 transition-all duration-500 ' + anim}>
        {/* Sebelum */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                <XCircle className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] ui-text-muted">
                  Sebelumnya
                </div>
                <h3 className="font-display text-lg text-slate-900 dark:text-white">Masalah</h3>
              </div>
            </div>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
              Manual
            </span>
          </div>
          <ul className="space-y-3">
            <ProblemItem icon={<MessageCircle className="h-4 w-4" strokeWidth={1.75} />} body="Pendaftaran event manual via WhatsApp &mdash; chat panjang, lampiran tercecer." />
            <ProblemItem icon={<Layers className="h-4 w-4" strokeWidth={1.75} />} body="Data tersebar di banyak tempat, tidak ada satu sumber kebenaran." />
            <ProblemItem icon={<Clock4 className="h-4 w-4" strokeWidth={1.75} />} body="Status event sulit dipantau &mdash; sering baru ketahuan terlambat." />
          </ul>
        </div>

        {/* Sekarang */}
        <div className="rounded-2xl border border-brand-primary-200 bg-gradient-to-br from-brand-primary-50/60 via-white to-white p-6 shadow-sm dark:border-brand-primary-800 dark:from-brand-primary-950/30 dark:via-slate-900 dark:to-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-primary-100 text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300">
                <CheckCircle2 className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-primary-700 dark:text-brand-primary-300">
                  Sekarang
                </div>
                <h3 className="font-display text-lg text-slate-900 dark:text-white">Solusi</h3>
              </div>
            </div>
            <span className="rounded-full bg-brand-primary-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Terintegrasi
            </span>
          </div>
          <ul className="space-y-3">
            <SolutionItem body="Form online terpusat &mdash; setiap pendaftaran langsung masuk ke sistem." />
            <SolutionItem body="Status otomatis: draft &rarr; terbit, dengan jejak yang tercatat." />
            <SolutionItem body="Dashboard real-time untuk seluruh tim Marcomm dan Pimpinan Unit." />
          </ul>
        </div>
      </div>

      {/* Highlight strip */}
      <div
        className={
          'mt-6 rounded-2xl bg-slate-900 px-6 py-4 text-white shadow-lg transition-all duration-700 dark:bg-slate-800 ' +
          (isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')
        }
      >
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-secondary-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            <Sparkles className="h-3 w-3" strokeWidth={2} />
            Highlight
          </span>
          <p className="font-display text-base text-white sm:text-lg">
            <span className="text-brand-secondary-300">Inovasi Marcomm:</span> dari WhatsApp manual ke sistem terintegrasi.
          </p>
        </div>
      </div>
    </SlideFrame>
  );
}

function ProblemItem({ icon, body }: { icon: React.ReactNode; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
        {icon}
      </span>
      <p className="text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-300">{body}</p>
    </li>
  );
}

function SolutionItem({ body }: { body: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-primary-100 text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300">
        <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
      </span>
      <p className="text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-300">{body}</p>
    </li>
  );
}

/* ---------- Slide 4 — Fitur Utama (screenshots) ---------- */

type Shot = {
  src: string;
  caption: string;
  icon: React.ReactNode;
};

const SHOTS: Shot[] = [
  { src: '/screenshots/dashboard-search-filter.png', caption: 'Pencarian & Filter', icon: <Filter className="h-3.5 w-3.5" strokeWidth={1.75} /> },
  { src: '/screenshots/dashboard-table-content.png', caption: 'Tabel Jadwal', icon: <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.75} /> },
  { src: '/screenshots/dashboard-timeline-content.png', caption: 'Timeline', icon: <Clock4 className="h-3.5 w-3.5" strokeWidth={1.75} /> },
  { src: '/screenshots/landing-hero.png', caption: 'Landing Page Publik', icon: <Globe className="h-3.5 w-3.5" strokeWidth={1.75} /> },
  { src: '/screenshots/landing-upcoming-events.png', caption: 'Event Mendatang', icon: <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} /> },
];

function SlideFeatures({ isActive }: SlideProps) {
  return (
    <SlideFrame
      eyebrow="03 · Fitur Utama"
      title="Empat tampilan & satu landing publik"
      subtitle="Tiga tampilan jadwal untuk tim internal, dua tampilan publik untuk pengunjung mall."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:grid-rows-2">
        {/* Featured wide card */}
        <figure
          className={
            'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-500 lg:col-span-3 lg:row-span-2 dark:border-slate-700 dark:bg-slate-900 ' +
            (isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')
          }
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-brand-primary-600 dark:text-brand-primary-300" strokeWidth={1.75} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
                Dashboard internal
              </span>
            </div>
            <span className="rounded-full bg-brand-primary-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Featured
            </span>
          </div>
          <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
            <img
              src={SHOTS[0]?.src}
              alt={SHOTS[0]?.caption ?? ''}
              className="h-full w-full object-cover object-top"
              loading="lazy"
            />
          </div>
          <figcaption className="flex items-center gap-2 px-4 py-3">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/40 dark:text-brand-primary-300">
              {SHOTS[0]?.icon}
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {SHOTS[0]?.caption}
            </span>
          </figcaption>
        </figure>

        {/* Other shots — first hero above, remaining 4 in a 2x2 */}
        {SHOTS.slice(1).map((shot, idx) => (
          <figure
            key={shot.src}
            className={
              'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-500 dark:border-slate-700 dark:bg-slate-900 lg:col-span-3 ' +
              (isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')
            }
            style={{ transitionDelay: `${(idx + 1) * 60}ms` }}
          >
            <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800">
              <img
                src={shot.src}
                alt={shot.caption}
                className="h-full w-full object-cover object-top"
                loading="lazy"
              />
            </div>
            <figcaption className="flex items-center gap-2 px-4 py-3">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/40 dark:text-brand-primary-300">
                {shot.icon}
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {shot.caption}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </SlideFrame>
  );
}

function Search(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/* ---------- Slide 5 — Survey Kepuasan Tenant ---------- */

function SlideSurvey({ isActive }: SlideProps) {
  const anim = isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2';
  return (
    <SlideFrame
      eyebrow="04 · Survey Tenant"
      title="Evaluasi dampak event terhadap gerai"
      subtitle="Self-assessment publik, tanpa login, dengan kontrol duplikat per tenant per event."
    >
      <div className={'grid gap-5 lg:grid-cols-12 transition-all duration-500 ' + anim}>
        {/* Poin penting */}
        <div className="lg:col-span-7">
          <ul className="grid gap-3 sm:grid-cols-2">
            <SurveyPoint
              icon={<Globe className="h-4 w-4" strokeWidth={1.75} />}
              title="Form publik, tanpa login"
              body="Tenant dapat mengisi kapan saja dari link event langsung."
            />
            <SurveyPoint
              icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.75} />}
              title="Self-assessment"
              body="Tenant menilai sendiri dampak event terhadap gerainya."
            />
            <SurveyPoint
              icon={<Store className="h-4 w-4" strokeWidth={1.75} />}
              title="Dampak terukur"
              body="Kenaikan traffic dan kenaikan sales sebagai input utama."
            />
            <SurveyPoint
              icon={<Layers className="h-4 w-4" strokeWidth={1.75} />}
              title="Dikelompokkan per zona"
              body="Hasil diagregasi per area &mdash; timur, barat, lt.1, dll."
            />
            <SurveyPoint
              icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}
              title="Anti-duplikat"
              body="Satu tenant hanya mengirim satu survey per event."
            />
          </ul>
        </div>

        {/* Mock form card */}
        <div className="lg:col-span-5">
          <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-900">
            <div className="absolute -top-2 right-4 rounded-full bg-brand-secondary-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              Mock form
            </div>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-primary-100 text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300">
                <FileText className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] ui-text-muted">
                  Evaluasi Tenant
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Event: Cosplay Spring 2026
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <MockField label="Nama gerai" value="Kedai Kopi Atlas" />
              <MockField label="Zona" value="Lt.1 &mdash; Barat" />

              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Kenaikan traffic</span>
                  <span className="text-brand-primary-600 dark:text-brand-primary-300">+38%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full w-[38%] rounded-full bg-brand-primary-500" />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Kenaikan sales</span>
                  <span className="text-brand-secondary-600 dark:text-brand-secondary-300">+22%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full w-[22%] rounded-full bg-brand-secondary-500" />
                </div>
              </div>

              <button
                type="button"
                disabled
                className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-primary-500 px-4 py-2 text-sm font-semibold text-white opacity-95"
              >
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                Kirim Evaluasi
              </button>
            </div>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

function SurveyPoint({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="rounded-xl border border-slate-100 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/40 dark:text-brand-primary-300">
          {icon}
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{body}</p>
        </div>
      </div>
    </li>
  );
}

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
        {value}
      </div>
    </div>
  );
}

/* ---------- Slide 6 — Implementasi Nyata ---------- */

type ImplItem = {
  title: string;
  body: string;
  status: 'done' | 'partial' | 'planning';
  icon: React.ReactNode;
};

const IMPL_ITEMS: ImplItem[] = [
  {
    title: 'Draft → terbit otomatis',
    body: 'Status event berubah dari draft ke terbit dengan jejak tercatat di sistem.',
    status: 'done',
    icon: <CheckCircle2 className="h-4 w-4" strokeWidth={2} />,
  },
  {
    title: 'Gallery event & dark mode',
    body: 'Album foto per event plus mode gelap konsisten di seluruh tampilan publik.',
    status: 'done',
    icon: <Camera className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    title: 'Survey tenant berjalan',
    body: 'Form publik aktif &mdash; tenant mengirim evaluasi dari link event.',
    status: 'done',
    icon: <Store className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    title: 'Surat PDF via Supabase',
    body: 'Pembuatan surat resmi otomatis dari data event, disimpan di Supabase Storage.',
    status: 'planning',
    icon: <FileText className="h-4 w-4" strokeWidth={1.75} />,
  },
];

function SlideImplementation({ isActive }: SlideProps) {
  const anim = isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2';
  return (
    <SlideFrame
      eyebrow="05 · Implementasi"
      title="Yang sudah jalan, yang sedang direncanakan"
      subtitle="Status per item ditulis apa adanya &mdash; bukan marketing, hanya progress nyata."
    >
      <div className={'grid gap-4 sm:grid-cols-2 transition-all duration-500 ' + anim}>
        {IMPL_ITEMS.map((item, idx) => (
          <ImplCard key={item.title} item={item} delayMs={idx * 70} />
        ))}
      </div>
    </SlideFrame>
  );
}

function ImplCard({ item, delayMs }: { item: ImplItem; delayMs: number }) {
  const statusBadge = {
    done: { label: 'Sudah jalan', cls: 'bg-emerald-500 text-white' },
    partial: { label: 'Sebagian', cls: 'bg-amber-500 text-white' },
    planning: { label: 'Planning', cls: 'bg-slate-900 text-white' },
  }[item.status];
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-500 dark:border-slate-700 dark:bg-slate-900"
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/40 dark:text-brand-primary-300">
          {item.icon}
        </div>
        <span
          className={
            'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ' +
            statusBadge.cls
          }
        >
          {statusBadge.label}
        </span>
      </div>
      <h3 className="font-display text-lg text-slate-900 dark:text-white">{item.title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">
        {item.body}
      </p>
    </div>
  );
}

/* ---------- Slide 7 — Roadmap ---------- */

type Roadmap = {
  title: string;
  body: string;
  icon: React.ReactNode;
};

const ROADMAP: Roadmap[] = [
  {
    title: 'Surat PDF via Supabase',
    body: 'Pembuatan surat resmi otomatis dari event yang diterbitkan, di-archive di Supabase Storage.',
    icon: <FileText className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    title: 'Approval sponsor',
    body: 'Alur review proposal sponsor dengan status yang tercatat (pending → contacted → agreed / declined).',
    icon: <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    title: 'Integrasi Kalender Google',
    body: 'Sinkronisasi jadwal event Marcomm ke Google Calendar agar Pimpinan Unit mendapat reminder otomatis.',
    icon: <CalendarPlus className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    title: 'Analytics lanjutan',
    body: 'Tren event per kuartal, zona, dan kategori &mdash; mendukung keputusan perencanaan tahun berikutnya.',
    icon: <BarChart3 className="h-4 w-4" strokeWidth={1.75} />,
  },
];

function SlideRoadmap({ isActive }: SlideProps) {
  return (
    <SlideFrame
      eyebrow="06 · Roadmap"
      title="Empat langkah berikutnya"
      subtitle="Urutan prioritas mengikuti kebutuhan harian tim Marcomm dan Pimpinan Unit."
    >
      <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* connector line behind (desktop) */}
        <div className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent lg:block dark:via-slate-700" />
        {ROADMAP.map((item, idx) => (
          <li
            key={item.title}
            className={
              'relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-500 dark:border-slate-700 dark:bg-slate-900 ' +
              (isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')
            }
            style={{ transitionDelay: `${idx * 80}ms` }}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-primary-500 text-[12px] font-bold text-white shadow-sm">
                {idx + 1}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-primary-50 text-brand-primary-600 dark:bg-brand-primary-950/40 dark:text-brand-primary-300">
                {item.icon}
              </span>
            </div>
            <h3 className="font-display text-lg text-slate-900 dark:text-white">{item.title}</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">
              {item.body}
            </p>
          </li>
        ))}
      </ol>
    </SlideFrame>
  );
}

/* ---------- Slide 8 — Penutup ---------- */

function SlideClosing({ isActive }: SlideProps) {
  const anim = isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2';
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-6 sm:px-10">
      <div className="absolute top-6 left-6 sm:top-9 sm:left-10">
        <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-10 w-auto sm:h-12" />
      </div>

      <div className={'max-w-3xl text-center transition-all duration-700 ' + anim}>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-secondary-200 bg-brand-secondary-50 px-3.5 py-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-brand-secondary-700 dark:border-brand-secondary-800 dark:bg-brand-secondary-950/30 dark:text-brand-secondary-300">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
          Penutup
        </div>
        <h1 className="font-display text-5xl leading-[1.05] text-slate-900 dark:text-white sm:text-7xl">
          Diskusi
          <span className="text-brand-primary-600 dark:text-brand-primary-400"> Lebih Lanjut</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
          Terima kasih untuk waktu dan perhatiannya. Kami terbuka untuk diskusi, masukan, dan
          arah prioritas dari Pimpinan Unit.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
            <Mail className="h-4 w-4 text-brand-primary-600 dark:text-brand-primary-300" strokeWidth={1.75} />
            <span className="font-medium">marcomm@metmal-bekasi.co.id</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
            <Phone className="h-4 w-4 text-brand-primary-600 dark:text-brand-primary-300" strokeWidth={1.75} />
            <span className="font-medium">Andy Safii &mdash; Marcomm</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Slide layout shell ---------- */

function SlideFrame({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full flex-col px-6 pt-6 pb-24 sm:px-10 sm:pt-9 sm:pb-28">
      <div className="mb-6 max-w-4xl">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-primary-600 dark:text-brand-primary-400">
          {eyebrow}
        </div>
        <h2 className="mt-1.5 font-display text-3xl leading-tight text-slate-900 dark:text-white sm:text-4xl">
          {title}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          {subtitle}
        </p>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ---------- Root page ---------- */

export default function PresentationDeck() {
  const [index, setIndex] = useState(0);

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);
  const goNext = useCallback(() => {
    setIndex((i) => (i < TOTAL_SLIDES - 1 ? i + 1 : i));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIndex(TOTAL_SLIDES - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goPrev, goNext]);

  const slides = useMemo(
    () => [
      <SlideCover key="cover" isActive={index === 0} />,
      <SlideIntro key="intro" isActive={index === 1} />,
      <SlideProblemSolution key="problem-solution" isActive={index === 2} />,
      <SlideFeatures key="features" isActive={index === 3} />,
      <SlideSurvey key="survey" isActive={index === 4} />,
      <SlideImplementation key="implementation" isActive={index === 5} />,
      <SlideRoadmap key="roadmap" isActive={index === 6} />,
      <SlideClosing key="closing" isActive={index === 7} />,
    ],
    [index],
  );

  return (
    <div
      className="relative h-screen w-full overflow-hidden bg-neutral-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
      style={{ fontFamily: 'var(--font-family-body)' }}
    >
      {/* Decorative pastel wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(60% 50% at 85% 0%, rgba(226,67,120,0.07) 0%, transparent 60%), radial-gradient(50% 40% at 10% 90%, rgba(0,145,142,0.07) 0%, transparent 60%)',
        }}
      />

      {/* Slides stack — each takes full viewport, only the active one is interactive */}
      <div className="relative h-full w-full">
        {slides.map((node, i) => {
          const active = i === index;
          return (
            <div
              key={i}
              aria-hidden={!active}
              className={
                'absolute inset-0 transition-all duration-500 ease-out ' +
                (active
                  ? 'opacity-100 translate-x-0 pointer-events-auto'
                  : 'opacity-0 pointer-events-none ' +
                    (i < index ? '-translate-x-6' : 'translate-x-6'))
              }
            >
              {node}
            </div>
          );
        })}
      </div>

      {/* Footer with logo on closing slide, larger chrome on others */}
      {index === TOTAL_SLIDES - 1 ? (
        <DeckFooter>
          <span>Metropolitan Mall Bekasi &mdash; Metland Coloring Life</span>
        </DeckFooter>
      ) : (
        <DeckChrome index={index} onPrev={goPrev} onNext={goNext} />
      )}
    </div>
  );
}
