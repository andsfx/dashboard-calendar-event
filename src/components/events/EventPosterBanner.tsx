import { thumbUrl } from '../../utils/imageOptim';

/**
 * Banner poster/flyer di atas kartu event — 16:10, selebar kartu.
 *
 * Dipakai bersama oleh kartu Sorotan `/events`, kartu rail `/events`, dan
 * kartu agenda beranda supaya satu event tampil sama di mana pun. `onError`
 * menyembunyikan seluruh wrapper: URL poster yang rusak tidak boleh
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
      className={`relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}
    >
      <img
        src={thumbUrl(src)}
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
