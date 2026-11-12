import { usePageMeta } from '../utils/pageMeta';

/**
 * Halaman /digitalposter — mirroring tampilan slideshow digital poster
 * untuk layar Samsung The Sero. Sumber tampilan adalah situs eksternal
 * (slideshow-digitalposter) yang tidak mengirim header X-Frame-Options dan
 * CSP-nya tidak memuat `frame-ancestors`, jadi aman di-embed dalam iframe.
 *
 * Karena ini tampilan kios layar penuh, page sengaja TIDAK merender
 * `PublicSiteHeader` (pola sama dengan form survei anonim) supaya tidak
 * ada chrome navigasi yang mengganggu poster.
 */

const DISPLAY_URL = 'https://slideshow-digitalposter.vercel.app/display';

export function DigitalPosterPage() {
  usePageMeta({
    title: 'Poster digital - Metropolitan Mall Bekasi',
    description: 'Slideshow materi promosi tenant untuk Samsung The Sero.',
  });

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <iframe
        src={DISPLAY_URL}
        title="Poster Digital — Metropolitan Mall Bekasi"
        className="block h-full w-full border-0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}