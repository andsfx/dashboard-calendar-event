import { useRef } from 'react';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { useMotionLabDemos } from '../components/motion-lab/useMotionLabDemos';
import { usePageMeta } from '../utils/pageMeta';
import heroFallback from '../assets/landing/hero-fallback.webp';

interface MotionLabPageProps {
  isDark: boolean;
  onToggleDark: () => void;
}

/* Bench tiga opsi gerak GSAP. Bukan halaman produk: tidak ditautkan dari nav,
 * tujuannya membandingkan biaya dan rasa tiap mekanisme sebelum satu di antaranya
 * masuk ke `/`, `/events`, atau galeri. */
const BENCH = [
  {
    id: 'A',
    title: 'Parallax scrub',
    plugin: 'ScrollTrigger (scrub)',
    purpose: 'Kedalaman hero: media dan teks bergerak berlawanan arah saat scroll.',
    risk: 'Rendah. Tidak menyentuh paint awal, tidak mengubah layout.',
  },
  {
    id: 'B',
    title: 'Stagger per blok',
    plugin: 'ScrollTrigger.batch + CustomEase',
    purpose: 'Urutan baca: kartu masuk berurutan, bukan satu blok sekaligus.',
    risk: 'Sedang. Butuh mekanisme opt-in di CSS plus timeout supaya konten tidak pernah tertahan tersembunyi.',
  },
  {
    id: 'C',
    title: 'Rail pinned',
    plugin: 'ScrollTrigger pin + scrub',
    purpose: 'Momen khas GSAP: section berhenti, kartu bergerak horizontal.',
    risk: 'Tinggi. Mengubah tinggi halaman, harus diuji terhadap header sticky, anchor, dan mobile.',
  },
] as const;

const STAGGER_ITEMS = ['01', '02', '03', '04', '05', '06'] as const;

const RAIL_ITEMS = [
  { id: '01', label: 'Panggung utama', note: 'Kapasitas 500 orang, sound 10K watt.' },
  { id: '02', label: 'Area komersial', note: 'Tenant terkurasi untuk pop-up dan bazar.' },
  { id: '03', label: 'Atrium timur', note: 'Cocok untuk pameran foto dan komunitas.' },
  { id: '04', label: 'Plaza luar', note: 'Aktivasi kendaraan dan festival kuliner.' },
  { id: '05', label: 'Studio mini', note: 'Workshop 40 orang dengan pencahayaan tetap.' },
] as const;

export function MotionLabPage({ isDark, onToggleDark }: MotionLabPageProps) {
  usePageMeta({
    title: 'Lab Motion (prototipe): GSAP',
    description: 'Bench tiga opsi gerak GSAP: parallax scrub, stagger per blok, dan rail pinned.',
  });

  const parallaxRef = useRef<HTMLElement>(null);
  const staggerRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLElement>(null);
  useMotionLabDemos({ parallaxRef, staggerRef, railRef });

  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="outline-none">
        {/* ── Pengantar ─────────────────────────────────────────────── */}
        <section className="border-b border-black/5 px-4 py-14 sm:px-6 dark:border-slate-800">
          <div className="mx-auto max-w-7xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              Prototipe, bukan permukaan produksi
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Lab motion GSAP
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 ui-text-secondary">
              Tiga mekanisme di bawah memakai konten nyata halaman ini. Scroll dari atas ke bawah, lalu
              putuskan mana yang layak masuk produksi. Kalau sistem operasi memakai
              <span className="font-semibold"> reduce motion</span>, ketiganya tampil statis: itu memang
              perilaku yang diharapkan.
            </p>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10 dark:border-slate-800">
                    <th scope="col" className="py-3 pr-4 font-semibold">Demo</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Plugin</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Tujuan gerak</th>
                    <th scope="col" className="py-3 font-semibold">Risiko</th>
                  </tr>
                </thead>
                <tbody>
                  {BENCH.map((row) => (
                    <tr key={row.id} className="border-b border-black/5 align-top dark:border-slate-800">
                      <th scope="row" className="py-3 pr-4 font-semibold whitespace-nowrap">
                        {row.id}. {row.title}
                      </th>
                      <td className="py-3 pr-4 font-mono text-xs ui-text-muted">{row.plugin}</td>
                      <td className="py-3 pr-4">{row.purpose}</td>
                      <td className="py-3">{row.risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── A. Parallax ───────────────────────────────────────────── */}
        <section
          ref={parallaxRef}
          className="relative isolate flex min-h-[110vh] items-center overflow-hidden bg-slate-950 text-white"
        >
          <div aria-hidden="true" className="absolute inset-x-0 -inset-y-24">
            <img
              data-parallax-media
              src={heroFallback}
              alt=""
              className="h-[130%] w-full object-cover opacity-40"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/30 to-slate-950/80" />

          <div data-parallax-copy className="relative z-10 mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-300">
              Demo A
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
              Parallax scrub pada media dan teks
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/75">
              Media bergerak searah scroll, teks bergerak berlawanan arah. Tujuannya memberi kedalaman
              pada satu layar, bukan menggerakkan seluruh halaman.
            </p>
            <p className="mt-6 max-w-xl font-mono text-xs text-white/50">
              gsap.timeline({'{'} scrollTrigger: {'{'} scrub: 0.6 {'}'} {'}'} )
            </p>
          </div>
        </section>

        {/* ── B. Stagger ────────────────────────────────────────────── */}
        <section
          ref={staggerRef}
          className="border-b border-black/5 bg-[var(--section-alt)] px-4 py-20 sm:px-6 dark:border-slate-800"
        >
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-700 dark:text-brand-primary-400">
              Demo B
            </p>
            <h2 className="mt-3 text-4xl font-bold leading-tight">Stagger per blok</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 ui-text-secondary">
              Enam kartu masuk berurutan dengan jarak 0,08 detik. Pembandingnya: section reveal yang
              sekarang, satu blok 240 ms tanpa urutan.
            </p>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STAGGER_ITEMS.map((id) => (
                <li
                  key={id}
                  data-stagger-item
                  className="rounded-[var(--radius-card)] border border-black/5 bg-white p-6 shadow-[var(--shadow-card-soft)] dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="font-mono text-xs ui-text-muted">Blok {id}</span>
                  <h3 className="mt-2 text-lg font-semibold">Kartu contoh {id}</h3>
                  <p className="mt-2 text-sm leading-6 ui-text-secondary">
                    Urutan masuk mengikuti urutan baca, jadi mata tidak perlu mencari dari mana mulai.
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── C. Rail pinned ────────────────────────────────────────── */}
        <section
          ref={railRef}
          className="relative overflow-hidden bg-slate-950 text-white"
        >
          <div className="flex min-h-[70vh] flex-col justify-center py-16 lg:h-screen lg:py-0">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-300">
                Demo C
              </p>
              <h2 className="mt-3 text-4xl font-bold leading-tight">Rail pinned</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/75">
                Di desktop section berhenti di atas layar dan kartu bergerak horizontal mengikuti scroll.
                Di ponsel mekanisme ini mati dan rail tetap bisa digeser dengan jari.
              </p>
            </div>

            <div className="mt-10 overflow-x-auto pb-4 lg:overflow-visible">
              <div data-rail-track className="flex w-max gap-4 px-4 sm:px-6">
                {RAIL_ITEMS.map((item) => (
                  <article
                    key={item.id}
                    className="w-[78vw] max-w-[420px] shrink-0 rounded-[var(--radius-campaign-card)] border border-white/12 bg-white/6 p-6 backdrop-blur-sm lg:w-[420px]"
                  >
                    <span className="font-mono text-xs text-white/50">{item.id}</span>
                    <h3 className="mt-2 text-2xl font-semibold">{item.label}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/65">{item.note}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Catatan produksi ──────────────────────────────────────── */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold">Syarat kalau salah satu naik ke produksi</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 ui-text-secondary">
              <li>
                Plugin tetap dimuat lewat <code className="font-mono text-xs">import()</code> dinamis, dan
                dikecualikan dari chunk <code className="font-mono text-xs">vendor</code> seperti sekarang.
              </li>
              <li>
                Hero tidak boleh menunggu chunk GSAP. Gerak yang bergantung pada JS hanya boleh menambah,
                tidak boleh menentukan apakah teks terpaint.
              </li>
              <li>
                Satu simpul hanya boleh digerakkan satu sistem. Kalau GSAP memegang sebuah simpul,
                transisi CSS untuk simpul itu dimatikan, dan sebaliknya.
              </li>
              <li>
                <code className="font-mono text-xs">prefers-reduced-motion</code> mengembalikan semuanya ke
                keadaan akhir: konten terlihat, tanpa tween.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
