import { posterThumbUrl } from '../../utils/imageOptim';

/**
 * Banner poster/flyer di atas kartu event — 4:3, selebar kartu.
 *
 * Dipakai bersama oleh kartu Sorotan `/events`, kartu rail `/events`, kartu
 * agenda beranda, modal detail, dan header halaman detail supaya satu event
 * tampil sama di mana pun.
 *
 * Rasio 4:3 (bukan 16:10) karena poster/cover yang diunggah admin hampir
 * selalu 4:3 — dengan `object-cover` di kotak 16:10 gambar terpotong ~17%
 * tinggi (judul/sponsor di tepi atas-bawah hilang). `posterThumbUrl()` juga
 * meminta 4:3 dari CDN agar tidak ada crop dobel.
 *
 * `onError` menyembunyikan seluruh wrapper: URL poster yang rusak tidak boleh
 * meninggalkan kotak kosong setinggi banner.
 */
export function EventPosterBanner({
  src,
  alt,
  eager = false,
  className = '',
}: {
  src: string;
  alt: string;
  eager?: boolean;
  className?: string;
}) {
  return (
    <div
      data-event-poster
      className={`relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}
    >
      <img
        src={posterThumbUrl(src)}
        alt={alt}
        className="h-full w-full object-cover"
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        {...(eager ? { fetchPriority: 'high' as const } : {})}
        onError={(e) => {
          const wrap = e.currentTarget.closest('[data-event-poster]');
          if (wrap instanceof HTMLElement) wrap.hidden = true;
        }}
      />
    </div>
  );
}
