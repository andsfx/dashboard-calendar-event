import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Calendar, MapPin, Search,
  Building2, ChevronRight,
} from 'lucide-react';
import { fetchPublicTenantSurveyEvents, type PublicTenantSurveyEventInfo } from '../../utils/domainApi';
import { Button } from '../shadcn/button';
import { Input } from '../shadcn/input';
import { Label } from '../shadcn/label';

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function TenantSurveyEventPicker() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<PublicTenantSurveyEventInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPublicTenantSurveyEvents();
        if (!cancelled) {
          setEvents(data);
          if (data.length === 0) {
            setError('Survei tenant belum dibuka admin, atau semua survei sudah ditutup. Coba lagi nanti.');
          }
        }
      } catch {
        if (!cancelled) setError('Gagal memuat data event');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return events;
    const q = query.toLowerCase();
    return events.filter(e =>
      e.acara.toLowerCase().includes(q) ||
      e.lokasi?.toLowerCase().includes(q) ||
      e.eo?.toLowerCase().includes(q),
    );
  }, [events, query]);

  // Loading
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4">
            <div className="hidden h-12 w-1 shrink-0 animate-pulse rounded-full bg-[var(--wf-rule)] sm:block" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--wf-rule)]" />
              <div className="flex gap-4">
                <div className="h-3 w-24 animate-pulse rounded bg-[var(--wf-rule)]" />
                <div className="h-3 w-20 animate-pulse rounded bg-[var(--wf-rule)]" />
              </div>
            </div>
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--wf-rule)]" />
          </div>
        ))}
      </div>
    );
  }

  // Error + no data
  if (error && events.length === 0) {
    const isEmptyList = /belum dibuka|sudah ditutup|belum ada event/i.test(error);
    // Informasi (belum tersedia) memakai amber; kegagalan muat memakai rose —
    // DESIGN.md: error = rose/red, amber hanya untuk warning.
    const tone = isEmptyList
      ? { box: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30', tile: 'bg-amber-100 dark:bg-amber-900/50', icon: 'text-amber-500' }
      : { box: 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30', tile: 'bg-rose-100 dark:bg-rose-900/50', icon: 'text-rose-500' };
    return (
      <div className={`flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center ${tone.box}`}>
        <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${tone.tile}`}>
          <AlertTriangle className={`h-8 w-8 ${tone.icon}`} />
        </div>
        <h2 className="text-lg font-bold text-[var(--wf-ink)]">
          {isEmptyList ? 'Survei belum tersedia' : 'Gagal memuat'}
        </h2>
        <p className="mt-2 max-w-sm text-sm text-[var(--wf-ink-muted)]">{error}</p>
        {isEmptyList && (
          <p className="mt-3 max-w-sm text-xs text-[var(--wf-ink-muted)]">
            Hanya event dengan survei aktif yang tampil di sini. Hubungi admin mall jika kamu menerima tautan atau kode QR tapi event tidak muncul.
          </p>
        )}
      </div>
    );
  }

  return (
    <main id="konten-utama" tabIndex={-1} className="space-y-6 outline-none">
      {/* Catatan konversi: sufiks `!` menaklukkan default primitif
          (h-8/px-2.5/border-input/bg-transparent/hover:bg-muted) yang urutannya
          lebih akhir di CSS; warna & ukuran asli --wf-* tetap dipakai. */}
      {/* Header description */}
      <p className="text-sm leading-relaxed text-[var(--wf-ink-muted)]">
        Pilih event untuk menilai perubahan traffic dan penjualan tenant kamu.
      </p>

      <p className="text-xs text-[var(--wf-ink-muted)]">
        Isi survey ini jika tenant kamu ikut dalam event yang dipilih. Waktu pengisian sekitar 2 menit.
      </p>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Label htmlFor="tenant-survey-event-search" className="sr-only">Cari event</Label>
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wf-ink-muted)]" aria-hidden="true" />
          <Input
            id="tenant-survey-event-search"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari nama event, lokasi, atau penyelenggara…"
            className="h-auto w-full rounded-xl border border-[var(--wf-rule-strong)]! bg-[var(--wf-board)] py-3 pl-11 pr-4 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)]! focus:border-[var(--wf-accent)]! focus:outline-none focus:ring-2! focus:ring-[var(--wf-accent)]!"
          />
        </div>
        <span className="shrink-0 rounded-full bg-[var(--wf-accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--wf-accent)]">
          {events.length} event
        </span>
      </div>

      {/* Event list */}
      <div className="space-y-2">
        {filtered.map(ev => (
          /* Container-as-button — seluruh permukaan kartu adalah target klik dan
             membungkus judul + meta. shadcn `Button` ghost dengan chrome
             primitif dinetralkan (`h-auto!`/`p-4!`/`gap-4`/radius asli tetap,
             hover bg/muted dibatalkan, `active:translate-y-0!` menahan
             terjemahan primitif tanpa mengganggu `hover:-translate-y-0.5`). */
          <Button
            key={ev.id}
            type="button"
            variant="ghost"
            onClick={() => navigate(`/tenant-survey/${ev.id}`)}
            aria-label={`Isi survey tenant untuk event ${ev.acara}, tanggal ${formatDate(ev.tanggal)}${ev.lokasi ? `, lokasi ${ev.lokasi}` : ''}${ev.eo ? `, penyelenggara ${ev.eo}` : ''}`}
            className="group relative flex! h-auto! w-full! items-center justify-start! gap-4 whitespace-normal! rounded-xl border border-[var(--wf-rule)]! bg-[var(--wf-board)] p-4! text-left! font-normal! shadow-sm transition-[transform,border-color,box-shadow]! hover:border-[var(--wf-accent)]! hover:bg-[var(--wf-board)]! hover:shadow-md! hover:-translate-y-0.5 active:translate-y-0!"
          >

            {/* Status indicator bar */}
            <div className="hidden h-12 w-1 shrink-0 rounded-full bg-[var(--wf-rule-strong)] sm:block" />

            {/* Content */}
            <div className="min-w-0 flex-1">
              <span className="truncate text-sm font-semibold text-[var(--wf-ink)]">
                {ev.acara}
              </span>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--wf-ink-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  {formatDate(ev.tanggal)}
                </span>
                {ev.lokasi && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {ev.lokasi}
                  </span>
                )}
                {ev.eo && (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="size-3.5" />
                    {ev.eo}
                  </span>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)] transition-colors group-hover:bg-[var(--wf-accent-soft)] group-hover:text-[var(--wf-accent)]">
              <ChevronRight className="size-4" />
            </div>
          </Button>
        ))}
      </div>

      {/* Filtered count */}
      {query.trim() && filtered.length > 0 && (
        <p className="text-xs text-[var(--wf-ink-muted)]">
          Menampilkan {filtered.length} dari {events.length} event
        </p>
      )}

      {/* No results */}
      {!loading && filtered.length === 0 && events.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--wf-rule-strong)] px-6 py-12 text-center">
          <Search className="mb-3 h-8 w-8 text-[var(--wf-ink-muted)]" />
          <p className="text-sm font-medium text-[var(--wf-ink-muted)]">
            Tidak ada event yang cocok dengan "<span className="font-semibold">{query}</span>"
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setQuery('')}
            className="mt-3 h-auto px-0! text-xs font-semibold text-[var(--wf-accent)] hover:bg-transparent! hover:text-[var(--wf-accent)]!"
          >
            Hapus filter
          </Button>
        </div>
      )}
    </main>
  );
}