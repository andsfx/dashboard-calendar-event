import { useState, useEffect, useCallback } from 'react';
import {
  Terminal, Star, ArrowRight, ChevronDown, Menu, X, Check, Copy,
  ArrowUpRight, CalendarClock, LogIn, Bot, ExternalLink,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Design tokens — matched to https://graphify.com                    */
/* ------------------------------------------------------------------ */

const T = {
  bg: '#f8f7f0',
  fg: '#16211b',
  brand: '#cf7a52',
  brandInk: '#9a3f28',
  verify: '#0e9e76',
  verifyInk: '#0a7558',
  navDark: '#07281f',
  navDarkSoft: '#0b332a',
  heroDark: '#062a22',
  heroMid: '#0a3f31',
  cardBg: '#fdfcf6',
  secondaryBg: '#edeee2',
  border: '#e0e2d3',
  muted: '#626b60',
  greenBright: '#3fd7a2',
  ycOrange: '#fb651e',
} as const;

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Eyebrow({ children, n }: { children: React.ReactNode; n?: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#626b60]">
      {n && <span className="font-medium text-[#16211b]">{n}</span>}
      {children}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 text-balance font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold leading-[1.15] tracking-tight text-[#16211b] md:mt-4">
      {children}
    </h2>
  );
}

function PillButton({
  children,
  href,
  variant = 'primary',
}: {
  children: React.ReactNode;
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const base = 'group inline-flex min-h-11 items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all';
  const variants = {
    primary: `bg-[#f8f7f0] text-[#16211b] hover:-translate-y-0.5 hover:bg-white`,
    secondary:
      'border border-white/20 bg-white/[0.06] text-white/90 backdrop-blur-sm hover:border-white/30 hover:bg-white/10 hover:text-white',
    ghost:
      'border border-[#e0e2d3] bg-[#fdfcf6] text-[#626b60] hover:border-[#cf7a52]/40 hover:text-[#16211b]',
  };
  return (
    <a href={href} className={`${base} ${variants[variant]}`}>
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="reveal"
      style={{ '--reveal-delay': `${delay}s` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav                                                                */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { label: 'Product', href: '#how-it-works' },
  { label: 'Developers', href: '#showcase' },
  { label: 'Enterprise', href: '#enterprise' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Blog', href: 'https://graphify.com/blog' },
  { label: 'Docs', href: 'https://graphify.com/docs' },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 transition-[top] duration-300 ${scrolled ? 'top-2' : 'top-0'}`}
    >
      <div className="relative mx-auto w-full max-w-[1920px] px-3 pt-3 sm:px-4 sm:pt-5">
        <div
          className={`pointer-events-auto relative mx-auto flex w-full items-center justify-between gap-2 rounded-full border py-2 pl-3 pr-2 transition-all duration-300 md:w-fit md:justify-start md:pl-5 ${
            scrolled
              ? 'border-[#e0e2d3]/60 bg-[#f8f7f0]/90 shadow-lg shadow-black/[0.06] backdrop-blur-lg'
              : 'border-white/15 bg-white/5'
          }`}
        >
          {/* Brand */}
          <a
            aria-label="Graphify home"
            className={`relative flex cursor-pointer items-center rounded-md transition-[color,opacity] duration-300 hover:opacity-80 ${scrolled ? 'text-[#16211b]' : 'text-white'}`}
            href="#"
          >
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="grid h-11 w-11 place-items-center rounded-lg text-lg font-bold"
                style={{ backgroundColor: scrolled ? '#cf7a52' : '#cf7a52' }}
              >
                G
              </span>
              <span className="font-display text-[28px] font-semibold tracking-tight">
                Graphify
              </span>
            </span>
          </a>

          <span
            aria-hidden="true"
            className={`mx-1.5 hidden h-5 w-px md:block lg:mx-2 ${scrolled ? 'bg-[#e0e2d3]/60' : 'bg-white/15'}`}
          />

          {/* Desktop nav */}
          <nav className="relative hidden items-center gap-1 text-sm md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-2.5 py-2 transition-colors lg:px-3 ${
                  scrolled
                    ? 'text-[#626b60] hover:text-[#16211b]'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTAs */}
          <div className="relative flex items-center gap-1.5 md:ml-1.5 lg:ml-2">
            <a
              href="#setup"
              className={`group inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-opacity hover:opacity-90 lg:px-4 ${
                scrolled ? 'bg-[#16211b] text-[#f8f7f0]' : 'bg-white text-[#07281f]'
              }`}
            >
              <Terminal className="size-4" />
              Get started
            </a>
            <button
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`grid size-11 place-items-center rounded-full border md:hidden ${
                scrolled ? 'border-[#e0e2d3] text-[#16211b]' : 'border-white/25 text-white'
              }`}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  }, [email]);

  return (
    <section
      id="hero"
      className="hero-scope relative isolate flex min-h-[100svh] flex-col overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #062a22 0%, #0a3f31 35%, #124f3c 60%, #1e6149 74%, #4f8a68 85%, #a8c9ad 93%, #e9ecdf 98%, #f8f7f0 100%)',
      }}
    >
      {/* Grain overlay */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-50 mix-blend-soft-light">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Math symbol background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-[0.45] mix-blend-soft-light">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1008' height='588' font-family='ui-monospace,SFMono-Regular,Menlo,monospace' fill='%23f4f8f6' text-anchor='middle' dominant-baseline='central'%3E%3Ctext x='24' y='24' font-size='18' fill-opacity='0.207'%3E%E2%88%80%3C/text%3E%3Ctext x='109' y='41' font-size='16' fill-opacity='0.211'%3E%E2%88%A8%3C/text%3E%3Ctext x='194' y='58' font-size='15' fill-opacity='0.242'%3E%E2%88%8E%3C/text%3E%3Ctext x='279' y='39' font-size='15' fill-opacity='0.274'%3E%E2%88%85%3C/text%3E%3Ctext x='364' y='56' font-size='14' fill-opacity='0.305'%3E%E2%88%9D%3C/text%3E%3Ctext x='449' y='37' font-size='16' fill-opacity='0.18'%3E%E2%88%9E%3C/text%3E%3Ctext x='534' y='54' font-size='15' fill-opacity='0.211'%3E%CE%A0%3C/text%3E%3Ctext x='704' y='52' font-size='14' fill-opacity='0.274'%3E%CE%B5%3C/text%3E%3Ctext x='789' y='33' font-size='16' fill-opacity='0.305'%3E%CE%B2%3C/text%3E%3Ctext x='874' y='50' font-size='15' fill-opacity='0.18'%3E%E2%97%8B%E2%86%92%E2%97%8B%3C/text%3E%3Ctext x='959' y='31' font-size='15' fill-opacity='0.211'%3E%E2%8A%A2%3C/text%3E%3Ctext x='36' y='132' font-size='14' fill-opacity='0.242'%3E%E2%89%A1%3C/text%3E%3Ctext x='121' y='113' font-size='16' fill-opacity='0.274'%3E%E2%88%89%3C/text%3E%3Ctext x='206' y='130' font-size='15' fill-opacity='0.305'%3E%E2%89%85%3C/text%3E%3Ctext x='376' y='128' font-size='14' fill-opacity='0.211'%3E%E2%8A%95%3C/text%3E%3Ctext x='461' y='109' font-size='18' fill-opacity='0.279'%3Elim%3C/text%3E%3Ctext x='546' y='126' font-size='15' fill-opacity='0.274'%3E%E2%88%AD%3C/text%3E%3Ctext x='631' y='143' font-size='15' fill-opacity='0.305'%3E%CE%B8%3C/text%3E%3Ctext x='716' y='124' font-size='14' fill-opacity='0.18'%3Ee%CB%A3%3C/text%3E%3Ctext x='801' y='141' font-size='16' fill-opacity='0.211'%3E%E2%87%A2%3C/text%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      {/* Radial mask overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: 'radial-gradient(72% 58% at 32% 42%, rgba(4,30,23,0.28), transparent 74%)',
        }}
      />

      {/* Content */}
      <div className="relative z-30 mx-auto grid min-h-[100svh] w-full max-w-[1920px] grid-cols-1 items-center gap-3 px-6 pt-[calc(4.5rem+var(--bar-h,0px))] pb-6 sm:px-8 md:pt-[calc(5.5rem+var(--bar-h,0px))] md:pb-10 lg:grid-cols-2 lg:content-center lg:gap-x-10 lg:gap-y-7 lg:px-12">
        <div className="flex flex-col items-center text-center lg:col-start-1 lg:row-start-1 lg:items-start lg:self-end lg:text-left">
          {/* Tagline */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#cf7a52]" />
              Graph memory
            </span>
            <span aria-hidden="true" className="text-white/25">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#0e9e76]" />
              Grounded answers
            </span>
          </div>

          <h1 className="mt-3 font-display text-[clamp(2.6rem,5vw,4.2rem)] font-semibold leading-[1.02] tracking-tight text-balance text-white md:mt-4">
            The knowledge graph your AI can{' '}
            <span className="whitespace-nowrap text-[#cf7a52]">reason over</span>.
          </h1>

          <p className="mt-4 max-w-md text-base text-white/85 md:mt-5 md:text-lg">
            Open-source and on-device. One command maps your repo into a graph your AI
            assistant traverses instead of grepping. Every answer traces to a path you can
            audit.
          </p>
        </div>

        {/* Right side placeholder (graph visualization would go here) */}
        <div className="relative h-[24svh] max-h-[400px] w-full sm:h-[34svh] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[68vh] lg:max-h-none lg:self-center">
          <div className="flex h-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm">
            <span className="font-mono text-sm text-white/40">graph.html preview</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col items-center lg:col-start-1 lg:row-start-2 lg:items-start lg:self-start">
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start" id="get-started">
            <a
              href="https://app.graphify.com/login"
              className="group inline-flex items-center gap-2 rounded-lg bg-[#f8f7f0] px-5 py-3 text-sm font-semibold text-[#16211b] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-white"
            >
              <LogIn className="size-4" />
              Log in
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://app.graphify.com/signup"
              className="group inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white/90 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              Create account
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          <a
            href="https://graphify-labs.cal.com/safi/30min"
            target="_blank"
            rel="noreferrer"
            className="group mt-3.5 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm text-white/80 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white lg:mt-4"
          >
            <CalendarClock className="size-3.5" />
            Talk to the founder
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>

          {/* Backed by */}
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm text-white/60 sm:mt-6 lg:mt-10 lg:justify-start">
            <span className="inline-flex items-center gap-2">
              <span className="text-base text-white/70">Backed by</span>
              <span className="inline-flex items-center gap-1.5" aria-label="Y Combinator">
                <span
                  aria-hidden="true"
                  className="grid size-[21px] shrink-0 place-items-center rounded-[3px]"
                  style={{ backgroundColor: T.ycOrange }}
                >
                  <svg viewBox="0 0 24 24" className="size-[14px]">
                    <path fill="#fff" d="M6.951 5.896l4.112 7.708v5.064h1.583v-5.064l4.148-7.708h-1.749l-2.457 4.755c-.372.745-.688 1.376-.688 1.376s-.297-.63-.669-1.376L8.809 5.896H6.951z" />
                  </svg>
                </span>
                <span
                  aria-hidden="true"
                  className="text-[17px] font-medium leading-none tracking-tight"
                  style={{ color: T.ycOrange, fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}
                >
                  Combinator
                </span>
              </span>
            </span>
            <span aria-hidden="true" className="text-white/25">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#0e9e76]" />
              On-device · no telemetry
            </span>
          </p>

          {/* Enterprise waitlist */}
          <div className="mt-4 w-full max-w-md rounded-xl border border-white/12 bg-[#06231a]/85 p-4 shadow-lg shadow-black/20 backdrop-blur-md sm:mt-6 sm:p-5 lg:mt-8">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
              <span className="size-1.5 rounded-full bg-[#cf7a52]" />
              Enterprise · early access
            </div>
            <form noValidate className="flex flex-col gap-2.5" onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Work email"
                aria-label="Work email for the Graphify Enterprise waitlist"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full min-w-0 rounded-lg border border-white/20 bg-white/5 px-3 text-base text-white outline-none transition-[border-color,box-shadow] placeholder:text-white/60 focus-visible:border-[#cf7a52] focus-visible:ring-2 focus-visible:ring-[#cf7a52]/40 sm:text-[13.5px]"
              />
              <button
                type="submit"
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#f8f7f0] px-4 text-[13.5px] font-semibold text-[#16211b] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-white disabled:opacity-60"
              >
                {submitted ? 'You\'re on the list' : 'Join the waitlist'}
                {!submitted && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>
            <p aria-live="polite" className="mt-2 text-[11.5px] leading-snug text-white/70">
              {submitted
                ? 'Thanks! We\'ll be in touch.'
                : 'Be first when Graphify Enterprise ships.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats Bar                                                          */
/* ------------------------------------------------------------------ */

function StatsBar() {
  return (
    <section aria-label="Adoption, in numbers" id="stats" className="border-b border-[#e0e2d3] bg-[#edeee2]/40">
      <div className="mx-auto max-w-6xl px-6 py-9 md:py-12">
        <div className="grid grid-cols-3 divide-x divide-[#e0e2d3]">
          <a
            href="https://github.com/Graphify-Labs/graphify"
            target="_blank"
            rel="noreferrer"
            className="group block min-w-0 px-3 first:pl-0 last:pr-0 sm:px-8"
          >
            <span className="sr-only">Graphify on GitHub: star it.</span>
            <span className="block font-display text-[clamp(1.5rem,3vw,2.75rem)] font-semibold leading-none tracking-tight tabular-nums text-[#16211b]">
              109,638
            </span>
            <span className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-[#626b60] sm:text-sm">
              <Star className="size-3.5 shrink-0 -translate-y-px text-[#cf7a52]" fill="currentColor" />
              GitHub stars
            </span>
            <span className="mt-2.5 hidden items-center gap-2 sm:flex">
              <span className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-[#e0e2d3]">
                <span className="block h-full rounded-full bg-[#cf7a52]" style={{ width: '92.7%' }} />
              </span>
              <span className="font-mono text-[10px] tracking-wide tabular-nums text-[#626b60] transition-colors group-hover:text-[#9a3f28]">
                362 to go → 110,000
              </span>
            </span>
          </a>

          <div className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-8">
            <span className="block font-display text-[clamp(1.5rem,3vw,2.75rem)] font-semibold leading-none tracking-tight tabular-nums text-[#16211b]">
              5.6M+
            </span>
            <span className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-[#626b60] sm:text-sm">
              PyPI downloads
              <span className="inline-flex items-center whitespace-nowrap rounded-sm border px-1 py-px align-middle font-mono text-[10px] font-normal normal-case leading-4 tracking-[0.08em] text-[#0a7558] border-[#0a7558]/25">
                [EXTRACTED]
              </span>
            </span>
          </div>

          <div className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-8">
            <span className="block font-display text-[clamp(1.5rem,3vw,2.75rem)] font-semibold leading-none tracking-tight tabular-nums text-[#16211b]">
              17
            </span>
            <span className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-[#626b60] sm:text-sm">
              AI assistants
              <span className="inline-flex items-center whitespace-nowrap rounded-sm border px-1 py-px align-middle font-mono text-[10px] font-normal normal-case leading-4 tracking-[0.08em] text-[#0a7558] border-[#0a7558]/25">
                [EXTRACTED]
              </span>
            </span>
          </div>
        </div>

        {/* Building on Graphify */}
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-[#e0e2d3] pt-6 md:mt-10">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#626b60]">
            Already building on Graphify
            <span className="inline-flex items-center whitespace-nowrap rounded-sm border px-1 py-px align-middle font-mono text-[10px] font-normal normal-case leading-4 tracking-[0.08em] text-[#9a3f28] border-[#9a3f28]/25">
              [INFERRED]
            </span>
          </p>
          <ul className="flex min-w-0 flex-wrap items-center gap-x-7 gap-y-3">
            <li className="min-w-0">
              <a
                href="https://rootly.com/blog/turning-your-incident-data-into-a-knowledge-graph"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2.5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-[#e0e2d3]">
                  <span className="text-xs font-semibold text-[#16211b]">R</span>
                </span>
                <span className="text-sm font-medium text-[#16211b]/80 transition-colors group-hover:text-[#16211b]">
                  Rootly AI Labs
                </span>
              </a>
            </li>
            <li className="min-w-0">
              <span className="flex items-center gap-2.5">
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-[#e0e2d3]">
                  <span className="text-xs font-semibold text-[#16211b]">S</span>
                </span>
                <span className="text-sm font-medium text-[#16211b]/80">Superagent</span>
              </span>
            </li>
            <li className="min-w-0">
              <a
                href="https://github.com/HKUST-KnowComp/DeepRefine-Skill"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2.5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-[#e0e2d3]">
                  <span className="text-xs font-semibold text-[#16211b]">HK</span>
                </span>
                <span className="text-sm font-medium text-[#16211b]/80 transition-colors group-hover:text-[#16211b]">
                  HKUST KnowComp
                </span>
              </a>
            </li>
          </ul>
          <p className="font-mono text-[11px] tracking-wide text-[#626b60] sm:ml-auto">
            Apache 2.0 license · 36 languages
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                       */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const [activeTab, setActiveTab] = useState<'install' | 'query' | 'mcp'>('install');
  const [copied, setCopied] = useState(false);

  const commands: Record<string, string> = {
    install: 'uv tool install graphifyy\ngraphify install  # add the skill',
    query: 'graphify query "who owns billing?"\n→ 1 path · 2 hops · EXTRACTED',
    mcp: 'graphify mcp\n# Connect via MCP in your assistant',
  };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(commands[activeTab]!).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [activeTab]);

  return (
    <section id="how-it-works" className="border-t border-[#e0e2d3] bg-[#edeee2]/40">
      <div className="mx-auto max-w-6xl px-6 py-4 md:py-16">
        <Reveal>
          <div className="max-w-2xl">
            <Eyebrow n="02">How it works</Eyebrow>
            <SectionHeading>Install → graph → query.</SectionHeading>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div id="setup" className="mt-4 scroll-mt-24 rounded-lg border border-[#e0e2d3] bg-[#fdfcf6] p-4 md:mt-7 md:p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#626b60]">Step 01</p>
            <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">
              Run <code className="font-mono text-[0.9em]">/graphify .</code> in the assistant you already use
            </h3>
            <p className="mt-1.5 text-sm text-[#626b60]">
              Graphify installs as a skill. No extension, no account. Pick your assistant for the exact commands.
            </p>

            <div className="mt-3 md:mt-6">
              <div className="grid items-center gap-8 md:grid-cols-2 md:gap-10">
                {/* Assistants selector */}
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#626b60]">
                    What are you coding with?
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Claude Code', 'Cursor', 'Copilot', 'Codex', 'Gemini CLI', 'Aider'].map((name, i) => (
                      <button
                        key={name}
                        aria-pressed={i === 0}
                        className={`flex min-h-11 items-center gap-2 rounded-sm border px-3.5 py-1.5 text-sm transition-colors ${
                          i === 0
                            ? 'border-[#cf7a52] bg-[#cf7a52]/10 text-[#9a3f28]'
                            : 'border-[#e0e2d3] bg-[#fdfcf6] text-[#626b60] hover:border-[#cf7a52]/40 hover:text-[#16211b]'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Terminal mockup */}
                <div className="min-w-0">
                  <div className="max-w-full overflow-hidden rounded-lg border-2 border-[#0b332a] bg-[#0b332a] shadow-lg">
                    <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
                      <span aria-hidden="true" className="shrink-0 font-mono text-[10px] tracking-wider text-white/45">
                        $ graphify
                      </span>
                      <div role="tablist" aria-label="Terminal view" className="ml-3 mr-2 flex min-w-0 items-center gap-0.5">
                        {(['install', 'query', 'mcp'] as const).map((tab) => (
                          <button
                            key={tab}
                            role="tab"
                            aria-selected={activeTab === tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                              activeTab === tab
                                ? 'bg-white/10 text-white'
                                : 'text-white/60 hover:text-white/80'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleCopy}
                        className="relative ml-auto flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Copy className="size-3" />
                        {copied ? 'copied' : 'copy'}
                      </button>
                    </div>
                    <pre
                      role="tabpanel"
                      tabIndex={0}
                      className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-[#e9e2d6] sm:text-[13px]"
                    >
                      <code className="block">
                        {commands[activeTab]!.split('\n').map((line, i) => (
                          <span key={i}>
                            <span className="text-white/60">{i === 0 ? '$' : '>'}</span>{' '}
                            {line.replace(/^[>$$]\s*/, '')}
                            {'\n'}
                          </span>
                        ))}
                      </code>
                    </pre>
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-[#626b60]">
                    package is <code className="text-[#16211b]/80">graphifyy</code> (yes, two y&apos;s)
                  </p>
                  <button
                    type="button"
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#e0e2d3] bg-[#fdfcf6] px-3.5 py-2 text-sm font-medium text-[#16211b] shadow-sm transition-colors hover:border-[#cf7a52]/40"
                  >
                    <Bot className="size-4 text-[#626b60]" />
                    Copy setup for your agent
                  </button>
                  <p className="mt-4 text-sm text-[#626b60]">
                    Then{' '}
                    <Star className="inline size-3.5 -translate-y-px text-[#cf7a52]" fill="currentColor" />{' '}
                    <a
                      href="https://github.com/Graphify-Labs/graphify"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#9a3f28] underline underline-offset-2 transition-colors hover:text-[#16211b]"
                    >
                      star it on GitHub
                    </a>{' '}
                    ·{' '}
                    <a
                      href="https://discord.gg/XPPYrdw3Yp"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#9a3f28] underline underline-offset-2 transition-colors hover:text-[#16211b]"
                    >
                      join the Discord
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Steps 02 & 03 */}
        <div className="mt-3 grid gap-3 md:mt-4 md:grid-cols-2 md:gap-4">
          <Reveal delay={0.05}>
            <div className="flex h-full flex-col rounded-lg border border-[#e0e2d3] bg-[#fdfcf6] p-4 md:p-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#626b60]">Step 02</p>
              <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">Get the graph</h3>
              {/* Mini graph SVG */}
              <div aria-hidden="true" className="mt-3 hidden h-[72px] w-full overflow-hidden rounded-md border border-[#e0e2d3] bg-[#edeee2]/60 sm:block md:mt-5">
                <svg viewBox="0 0 300 72" className="size-full" preserveAspectRatio="xMidYMid meet">
                  <circle cx="26" cy="18" r="3.5" fill="#16211b" opacity="0.6" />
                  <circle cx="20" cy="52" r="3.5" fill="#16211b" opacity="0.6" />
                  <circle cx="58" cy="36" r="5" fill="#cf7a52" />
                  <circle cx="96" cy="14" r="3" fill="#16211b" opacity="0.6" />
                  <circle cx="100" cy="56" r="3.5" fill="#16211b" opacity="0.6" />
                  <circle cx="140" cy="36" r="4" fill="#0e9e76" />
                  <circle cx="184" cy="14" r="3" fill="#16211b" opacity="0.6" />
                  <circle cx="184" cy="36" r="3" fill="#16211b" opacity="0.6" />
                  <circle cx="184" cy="58" r="3" fill="#16211b" opacity="0.6" />
                  <path d="M26 18L58 36M20 52L58 36M58 36L96 14M58 36L100 56M96 14L140 36M100 56L140 36M140 36L184 14M140 36L184 36M140 36L184 58" fill="none" stroke="#16211b" strokeOpacity="0.3" strokeWidth="1" />
                  <text x="192" y="17" className="font-mono" fontSize="9" fill="#16211b" fillOpacity="0.6">graph.html</text>
                  <text x="192" y="39" className="font-mono" fontSize="9" fill="#16211b" fillOpacity="0.6">GRAPH_REPORT.md</text>
                  <text x="192" y="61" className="font-mono" fontSize="9" fill="#16211b" fillOpacity="0.6">graph.json</text>
                </svg>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#626b60] md:mt-4">
                One run maps the repo into three local files your assistant reads from.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex h-full flex-col rounded-lg border border-[#e0e2d3] bg-[#fdfcf6] p-4 md:p-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#626b60]">Step 03</p>
              <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">Query, don&apos;t grep</h3>
              <div className="mt-3 overflow-x-auto rounded-md border border-[#e0e2d3] bg-[#edeee2]/60 px-3 py-2 font-mono text-[11px] leading-relaxed md:mt-5">
                <span className="text-[#626b60]">$</span> graphify query &quot;who owns billing?&quot;<br />
                <span className="text-[#0a7558]">→ 1 path · 2 hops · EXTRACTED</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#626b60] md:mt-4">
                Your assistant follows real paths through the graph with query, path, and explain.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Payoff */}
        <Reveal delay={0.15}>
          <div className="mt-3 rounded-lg border border-[#e0e2d3] bg-[#fdfcf6] p-4 md:mt-4 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
              <div className="max-w-md">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#626b60]">The payoff</p>
                <h3 className="mt-2 font-display text-xl tracking-tight">
                  The answer is a path, not a vibe
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#626b60]">
                  Your assistant cites the edges it walked, each one tagged with where it came from, so you can check it instead of trusting it.
                </p>
              </div>
              <div className="min-w-0 overflow-x-auto rounded-md border border-[#e0e2d3] bg-[#edeee2]/60 px-3 py-2.5 font-mono text-[11px] leading-relaxed">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span>billing_service</span>
                  <span aria-hidden="true" className="text-[#626b60]">──calls──▸</span>
                  <span>stripe_client</span>
                  <span aria-hidden="true" className="text-[#626b60]">──owned_by──▸</span>
                  <span>payments-team</span>
                  <span className="inline-flex items-center whitespace-nowrap rounded-sm border px-1 py-px align-middle font-mono text-[10px] font-normal normal-case leading-4 tracking-[0.08em] text-[#0a7558] border-[#0a7558]/25">
                    [EXTRACTED]
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Showcase                                                           */
/* ------------------------------------------------------------------ */

function Showcase() {
  return (
    <section id="showcase" className="border-t border-[#e0e2d3]">
      <div className="mx-auto max-w-6xl px-6 pt-4 md:pt-16">
        <Reveal>
          <Eyebrow n="03">See it</Eyebrow>
          <SectionHeading>Your whole codebase, as one graph.</SectionHeading>
        </Reveal>
      </div>

      <div className="mx-auto min-w-0 max-w-[1400px] px-3 pb-4 sm:px-5 md:px-7 md:pb-16">
        <Reveal delay={0.1}>
          <div className="relative mt-3 md:mt-4 md:p-7">
            <div className="overflow-hidden rounded-lg border border-[#e0e2d3] bg-[#0b101d] shadow-[0_32px_64px_-28px_rgba(26,22,12,0.45)]">
              {/* Graph header bar */}
              <div className="flex items-stretch justify-between border-b border-white/10 bg-[#131a2b]">
                <span className="min-w-0 self-center truncate px-4 py-2.5 font-mono text-xs text-white/55">
                  graph.html · fastapi · graphify
                </span>
                <div role="group" aria-label="Choose example repository" className="flex shrink-0">
                  <button
                    type="button"
                    aria-pressed="true"
                    className="border-l border-white/10 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider transition-colors sm:px-4 bg-[#0b101d] text-[#f8f7f0] shadow-[inset_0_2px_0_#cf7a52]"
                  >
                    FastAPI
                  </button>
                  <button
                    type="button"
                    aria-pressed="false"
                    className="border-l border-white/10 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-white/45 transition-colors hover:text-white/80 sm:px-4"
                  >
                    Flask
                  </button>
                </div>
              </div>

              {/* Graph preview placeholder */}
              <div className="relative flex aspect-[16/9] items-center justify-center bg-[#0b101d]">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex flex-wrap justify-center gap-2">
                    {['#cf7a52', '#0e9e76', '#fb651e', '#3fd7a2', '#f8f7f0'].map((color, i) => (
                      <span
                        key={i}
                        className="inline-block size-2 rounded-full"
                        style={{ backgroundColor: color, opacity: 0.8 }}
                      />
                    ))}
                  </div>
                  <p className="font-mono text-sm text-white/40">
                    Interactive force-directed knowledge graph
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-white/25">
                    Colored nodes = auto-detected communities
                  </p>
                </div>
              </div>

              {/* Legend bar */}
              <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-white/10 bg-[#131a2b] px-4 py-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">how to read it</span>
                <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-white/60">
                  <span aria-hidden="true" className="size-[5px] shrink-0 rounded-full bg-white/70" />
                  node = one symbol
                </span>
                <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-white/60">
                  <span aria-hidden="true" className="flex shrink-0 items-center -space-x-0.5">
                    <span className="size-[5px] rounded-full bg-[#cf7a52]" />
                    <span className="size-[5px] rounded-full bg-[#0e9e76]" />
                  </span>
                  color = community
                </span>
                <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-white/60">
                  <span aria-hidden="true" className="h-px w-3.5 shrink-0 bg-white/50" />
                  line = import or call
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="mt-3 min-w-0 font-mono text-xs text-[#626b60] md:mt-4 md:px-7">
            FastAPI&apos;s own repo, mapped by one run of{' '}
            <code className="rounded bg-[#fdfcf6] px-1.5 py-0.5 text-[#16211b] ring-1 ring-[#e0e2d3]">
              /graphify .
            </code>{' '}
            · communities, god nodes, search, click-to-inspect.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Origin                                                             */
/* ------------------------------------------------------------------ */

function Origin() {
  const releases = [
    { version: 'v0.9.48', date: 'Aug 20, 2026' },
    { version: 'v0.9.47', date: 'Aug 19, 2026' },
    { version: 'v0.9.46', date: 'Aug 17, 2026' },
    { version: 'v0.9.45', date: 'Aug 16, 2026' },
  ];

  return (
    <section id="origin" className="border-t border-[#e0e2d3]">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 md:py-16 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <div className="max-w-xl">
            <Eyebrow>Origin</Eyebrow>
            <h2 className="mt-3 text-balance font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.15] tracking-tight text-[#16211b] md:mt-4">
              It started with a Karpathy post.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#626b60]">
              Andrej Karpathy floated the idea of an LLM-readable &ldquo;wiki&rdquo; for a codebase:
              a map an assistant could read instead of re-deriving structure from scratch every
              session. Graphify is the open-source take on that idea: one command, a real
              knowledge graph, entirely on-device.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-[#626b60]">
              We didn&apos;t have to say so ourselves; the community traced the lineage in the open.
            </p>

            <div className="mt-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#626b60]/70">
                As covered by
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-2.5 gap-y-2">
                {['AwesomeFOSS', 'Analytics Vidhya', 'Data Science in Your Pocket'].map((name) => (
                  <li key={name}>
                    <a
                      href="#"
                      className="group inline-flex items-center gap-1.5 rounded-full border border-[#e0e2d3] bg-[#fdfcf6] px-3 py-1.5 text-xs font-medium text-[#16211b] transition-colors hover:border-[#cf7a52]/40 hover:text-[#cf7a52]"
                    >
                      {name}
                      <ArrowUpRight className="size-3 text-[#9a3f28] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="lg:border-l lg:border-[#e0e2d3] lg:pl-10">
            <div className="flex items-center justify-between gap-4">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#626b60]">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-[#0e9e76] shadow-[0_0_6px_rgba(14,158,118,0.7)]"
                />
                Recently shipped
              </p>
              <a
                className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#9a3f28] transition-colors hover:text-[#16211b]"
                href="https://graphify.com/changelog"
              >
                Every release
                <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>
            <ol className="mt-6 space-y-0">
              {releases.map((r) => (
                <li key={r.version}>
                  <a
                    href={`https://github.com/Graphify-Labs/graphify/releases/tag/${r.version}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-baseline gap-4 border-b border-[#e0e2d3] py-3.5 last:border-b-0"
                  >
                    <span className="shrink-0 font-mono text-[13px] text-[#0a7558] transition-colors group-hover:text-[#cf7a52]">
                      {r.version}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-[#16211b]" />
                    <span className="shrink-0 font-mono text-[11px] text-[#626b60]">{r.date}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Used By                                                            */
/* ------------------------------------------------------------------ */

function UsedBy() {
  return (
    <section id="used-by" className="border-t border-[#e0e2d3]">
      <div className="mx-auto max-w-6xl px-6 py-4 md:py-16">
        <Reveal>
          <div className="max-w-2xl">
            <Eyebrow n="04">In the wild</Eyebrow>
            <SectionHeading>In their words.</SectionHeading>
            <p className="mt-3 text-[15px] text-[#626b60]">
              The adopters under the hero each link to public proof. This is one integration up
              close, plus results the community reported.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-6 md:mt-16">
            <figure className="max-w-4xl">
              <div aria-hidden="true" className="h-px w-10 bg-[#9a3f28]/50" />
              <blockquote className="mt-5 text-balance font-display text-[clamp(1.5rem,3vw,2.5rem)] font-medium leading-[1.18] tracking-tight text-[#16211b] md:mt-7 md:leading-[1.14]">
                &ldquo;The data already lives in Rootly. The graph makes the structure
                visible.&rdquo;
              </blockquote>
              <figcaption className="mt-5 md:mt-7">
                <div className="flex items-center gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-[#e0e2d3]">
                    <span className="text-sm font-semibold text-[#16211b]">R</span>
                  </span>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#626b60]">
                    <span className="text-[#16211b]">Sylvain Kalache</span>
                    <span aria-hidden="true" className="mx-2 text-[#e0e2d3]">/</span>
                    Rootly AI Labs
                    <span aria-hidden="true" className="mx-2 text-[#e0e2d3]">/</span>
                    Incident management · SRE
                  </p>
                </div>
                <p className="mt-3 max-w-xl text-sm text-[#626b60] md:mt-4">
                  Rootly turned its incident data (incidents, alerts, teams, services) into a
                  queryable knowledge graph with Graphify.
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <a
                    href="https://github.com/Rootly-AI-Labs/rootly-graphify-importer"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9a3f28] transition-colors hover:text-[#16211b]"
                  >
                    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    View the integration
                    <ArrowUpRight className="size-3.5" />
                  </a>
                </p>
              </figcaption>
            </figure>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-6 md:mt-14">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#626b60]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[#0e9e76]" />
              Real results, reported by the community
            </p>
            <div className="mt-5 grid gap-x-16 gap-y-7 sm:grid-cols-2 sm:gap-y-10 md:mt-7">
              <a
                href="https://github.com/lucasrosati/claude-code-memory-setup"
                target="_blank"
                rel="noreferrer"
                className="group block"
              >
                <span className="font-display text-5xl font-semibold tracking-tight text-[#0a7558] tabular-nums md:text-6xl">
                  <span className="border-b-2 border-[#0e9e76]/30 pb-1.5 transition-colors group-hover:border-[#0e9e76]">
                    71.5×
                  </span>
                </span>
                <span className="mt-3 block max-w-sm text-sm text-[#16211b] md:mt-5">
                  fewer tokens in one user&apos;s Claude Code and Graphify setup.
                </span>
                <span className="mt-2.5 flex max-w-full items-center gap-2 font-mono text-[11px] text-[#626b60]">
                  <span className="text-[#0a7558] border-[#0a7558]/25 inline-flex items-center rounded-sm border px-1 py-px text-[10px]">
                    [EXTRACTED]
                  </span>
                  <span className="truncate transition-colors group-hover:text-[#9a3f28]">
                    lucasrosati/claude-code-memory-setup
                  </span>
                  <ArrowUpRight className="size-3 shrink-0" />
                </span>
              </a>

              <a
                href="https://stevescargall.com/blog/2026/05/graphify--memmachine-79-token-reduction-zero-vector-database/"
                target="_blank"
                rel="noreferrer"
                className="group block"
              >
                <span className="font-display text-5xl font-semibold tracking-tight text-[#0a7558] tabular-nums md:text-6xl">
                  <span className="border-b-2 border-[#0e9e76]/30 pb-1.5 transition-colors group-hover:border-[#0e9e76]">
                    79×
                  </span>
                </span>
                <span className="mt-3 block max-w-sm text-sm text-[#16211b] md:mt-5">
                  fewer tokens on a 496K-token codebase, with zero vector database in the stack.
                </span>
                <span className="mt-2.5 flex max-w-full items-center gap-2 font-mono text-[11px] text-[#626b60]">
                  <span className="text-[#0a7558] border-[#0a7558]/25 inline-flex items-center rounded-sm border px-1 py-px text-[10px]">
                    [EXTRACTED]
                  </span>
                  <span className="truncate transition-colors group-hover:text-[#9a3f28]">
                    Steve Scargall, MemVerge
                  </span>
                  <ArrowUpRight className="size-3 shrink-0" />
                </span>
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Coverage (Press grid)                                              */
/* ------------------------------------------------------------------ */

const PRESS_ITEMS = [
  {
    source: 'Analytics Vidhya',
    type: 'Article',
    title: 'From Karpathy\'s LLM Wiki to Graphify: AI Memory Layers Are Here',
    date: 'Riya Bansal · Apr 11, 2026',
    href: '#',
  },
  {
    source: 'Better Stack (YouTube)',
    type: 'Video',
    title: 'This Tool Fixes AI Coding at Scale with 70× Fewer Tokens (Graphify)',
    href: '#',
  },
  {
    source: 'DEV Community',
    type: 'Article',
    title: 'Cut Your Claude Token Consumption By 70x',
    date: 'Lorenzo Zarantonello · Jun 3, 2026',
    href: '#',
  },
  {
    source: 'Rootly',
    type: 'Article',
    title: 'Turning Your Incident Data into a Knowledge Graph',
    date: 'Sylvain Kalache · Apr 10, 2026',
    href: '#',
  },
  {
    source: 'Augment Code',
    type: 'Article',
    title: 'Graphify hits 63.2K stars: turning codebases into queryable knowledge graphs',
    href: '#',
  },
  {
    source: 'stevescargall.com',
    type: 'Article',
    title: 'Graphify + MemMachine: 79× Token Reduction, Zero Vector Database',
    date: 'Steve Scargall · May 10, 2026',
    href: '#',
  },
];

function Coverage() {
  return (
    <section id="coverage" className="border-t border-[#e0e2d3]">
      <div className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>In the press</Eyebrow>
            <SectionHeading>Written up across the community.</SectionHeading>
            <p className="mt-3 text-[15px] text-[#626b60]">
              No press kit. Engineers found it, benchmarked it, and wrote it up themselves.
              Every link goes to the original.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-10 lg:grid-cols-3">
            {PRESS_ITEMS.map((item) => (
              <li key={item.title}>
                <div className="h-full">
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex h-full flex-col gap-2.5 rounded-xl border border-[#e0e2d3] bg-[#fdfcf6] p-5 transition-colors hover:border-[#cf7a52]/40"
                  >
                    <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#626b60]">
                      <span className="min-w-0 truncate">{item.source}</span>
                      <span className="shrink-0 rounded-sm bg-[#edeee2] px-1.5 py-0.5 text-[#16211b]/70">
                        {item.type}
                      </span>
                    </div>
                    <h3 className="font-display text-[15px] font-semibold leading-snug tracking-tight text-[#16211b] transition-colors group-hover:text-[#cf7a52]">
                      {item.title}
                      <ArrowUpRight className="ml-1 inline size-3.5 align-baseline text-[#9a3f28] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </h3>
                    {item.date && (
                      <p className="mt-auto text-xs text-[#626b60]">{item.date}</p>
                    )}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-8 flex justify-center md:mt-10">
            <a
              className="group inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#9a3f28] transition-colors hover:text-[#16211b]"
              href="https://graphify.com/blog"
            >
              See all 26
              <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA Banner                                                         */
/* ------------------------------------------------------------------ */

function CTABanner() {
  return (
    <section id="cta-banner" className="mx-auto max-w-6xl px-6">
      <Reveal>
        <div className="flex flex-col items-start gap-4 border-y border-[#e0e2d3] py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:py-9 md:py-11">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-[#16211b] md:text-3xl">
              Try it on your codebase.
            </h2>
            <p className="mt-1.5 text-sm text-[#626b60]">
              One command, about five minutes, entirely on-device.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href="#setup"
              className="group inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#16211b] px-5 py-2.5 text-sm font-medium text-[#f8f7f0] transition-opacity hover:opacity-90"
            >
              <Terminal className="size-4" />
              Get started
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://graphify.com/docs"
              className="text-sm font-medium text-[#16211b] underline-offset-4 transition-colors hover:text-[#9a3f28] hover:underline"
            >
              Read the docs →
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Reasoning (Graph vs Grep)                                          */
/* ------------------------------------------------------------------ */

const COMPARISONS = [
  {
    fail: 'Grep reads files and forgets them. Every session starts from zero.',
    win: 'The graph persists. Your assistant opens already knowing the architecture.',
  },
  {
    fail: 'RAG retrieves fuzzy chunks and hopes the model guesses right.',
    win: 'Your assistant traverses connected entities, hop by hop.',
  },
  {
    fail: 'Answers backed by an opaque similarity score.',
    win: 'Answers backed by a path you can audit, tagged extracted, inferred, or ambiguous.',
  },
];

function Reasoning() {
  return (
    <section
      id="reasoning"
      className="relative overflow-hidden text-[#eef6f1]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 82% at 76% 44%, rgba(30,97,73,0.55) 0%, rgba(30,97,73,0) 62%), linear-gradient(180deg, #0a3a2e 0%, #08301f 44%, #052019 100%)',
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50 mix-blend-soft-light">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-6 px-6 py-6 md:gap-8 md:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <Eyebrow>
            <span className="text-[#3fd7a2]">05</span>{' '}
            <span className="text-[#3fd7a2]">Why a graph, not grep</span>
          </Eyebrow>
          <h2 className="mt-3 text-balance font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold leading-[1.15] tracking-tight md:mt-4">
            Every answer traces to a real path.
          </h2>
          <p className="mt-3 max-w-md text-white/65 md:mt-4">
            Grep hits and fuzzy chunks make your assistant guess. A knowledge graph gives it
            structure to reason over.
          </p>

          <div className="mt-6 border-t border-white/12 md:mt-8">
            {COMPARISONS.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-1.5 border-b border-white/12 py-3 text-sm sm:grid-cols-2 sm:gap-5 sm:py-3.5"
              >
                <div className="flex items-start gap-2 text-white/50">
                  <X className="mt-0.5 size-3.5 shrink-0" />
                  {c.fail}
                </div>
                <div className="flex items-start gap-2 text-white/85">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[#3fd7a2]" />
                  {c.win}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Graph Report visualization */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-lg border border-white/12 bg-white/[0.04] p-4 backdrop-blur-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
              GRAPH_REPORT.md
            </p>
            <div className="mt-2 space-y-2 border-t border-white/12 pt-2">
              <div className="flex items-center gap-2 font-mono text-xs text-white/60">
                <span className="text-[#3fd7a2]">[EXTRACTED]</span>
                <span>billing_service → calls → stripe_client</span>
                <span className="text-white/30">:42</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-white/60">
                <span className="text-[#cf7a52]">[INFERRED]</span>
                <span>payment_module → owns → billing_service</span>
                <span className="text-white/30">:121</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-white/50">
                <span className="text-white/40">[AMBIGUOUS]</span>
                <span>auth_lib → used_by → api_gateway</span>
                <span className="text-white/30">:203</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-white/60">
                <span className="text-[#0e9e76]">God node</span>
                <span className="text-white/50">billing_service</span>
                <span className="text-white/30">(highest connectivity)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

const FOOTER_LINKS = {
  Product: ['How it works', 'Showcase', 'Enterprise', 'Pricing', 'Changelog'],
  Developers: ['Docs', 'GitHub', 'Discord', 'PyPI', 'API Reference'],
  Company: ['Blog', 'About', 'Careers', 'Press Kit'],
  Legal: ['Privacy', 'Terms', 'Apache 2.0'],
};

function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#e0e2d3] bg-[#f8f7f0]">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <a href="#" className="inline-flex items-center gap-2">
              <span
                className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: T.brand }}
              >
                G
              </span>
              <span className="font-display text-xl font-semibold tracking-tight text-[#16211b]">
                Graphify
              </span>
            </a>
            <p className="mt-3 text-sm text-[#626b60]">
              The open-source knowledge graph your coding assistant queries instead of grepping.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {['GitHub', 'Discord', 'X'].map((name) => (
                <a
                  key={name}
                  href="#"
                  className="flex size-8 items-center justify-center rounded-md border border-[#e0e2d3] text-[#626b60] transition-colors hover:border-[#cf7a52]/40 hover:text-[#cf7a52]"
                  aria-label={name}
                >
                  <ExternalLink className="size-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#626b60]">
                {category}
              </h4>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-[#626b60] transition-colors hover:text-[#16211b]"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-[#e0e2d3] pt-6 text-center">
          <p className="font-mono text-xs text-[#626b60]">
            Graphify Labs · Y Combinator W26 · Apache 2.0 · On-device, no telemetry
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function GraphifyLanding() {
  useEffect(() => {
    document.title = 'Graphify · the code knowledge graph for AI coding assistants';
    document.documentElement.style.setProperty('--bar-h', '0px');
    return () => {
      document.documentElement.style.removeProperty('--bar-h');
    };
  }, []);

  return (
    <div className="min-h-full bg-[#f8f7f0] font-body text-[#16211b] antialiased">
      <Nav />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Hero />
        <StatsBar />
        <HowItWorks />
        <Showcase />
        <Origin />
        <UsedBy />
        <Coverage />
        <CTABanner />
        <Reasoning />
      </main>
      <Footer />
    </div>
  );
}