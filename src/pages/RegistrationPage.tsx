import { RegistrationForm } from '../components/community/CommunityRegistrationForm';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { RevealSection } from '../components/community/CommunityRevealPrimitives';
import { usePageMeta } from '../utils/pageMeta';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

/**
 * Halaman publik khusus pendaftaran organisasi (EO, sekolah, komunitas, dll).
 * Membungkus `RegistrationForm` yang sama dengan embed landing /community & /events —
 * tanpa logika form baru; URL ini untuk distribusi link langsung (bio IG, WA, QR).
 */
export function RegistrationPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Daftar Komunitas - Metropolitan Mall Bekasi',
    description: 'Daftarkan komunitas atau organisasimu untuk berkolaborasi dengan Metropolitan Mall Bekasi.',
  });

  return (
    <div className="ui-dashboard-page min-h-screen bg-[var(--wf-page)] text-[var(--wf-ink)] transition-colors duration-300">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke konten
      </a>

      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />
      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 outline-none">
        <RevealSection as="div" className="pt-10">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--wf-ink)] sm:text-4xl">Daftarkan Event Komunitas di Metropolitan Mall Bekasi</h1>
          <p className="mt-3 text-sm leading-7 ui-text-secondary">
            Terbuka untuk semua jenis komunitas yang ingin mengadakan event di Metropolitan Mall Bekasi. Isi datanya, pendaftaran kamu akan kami review secepatnya. Tim kami yang akan menghubungi kamu untuk langkah selanjutnya.
          </p>
        </RevealSection>

        <RevealSection as="div" className="mt-8">
          <RegistrationForm />
        </RevealSection>
      </main>

      <footer className="border-t border-[var(--wf-rule)] py-8 text-center text-xs text-[var(--wf-ink-muted)]">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &middot; Metland Coloring Life
      </footer>
    </div>
  );
}
