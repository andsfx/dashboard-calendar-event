import { Fragment, useMemo } from 'react';
import { Clock, MapPin, Edit2, Trash2, ArrowUpDown, ExternalLink, Download, CalendarDays, Layers, Eye, EyeOff } from 'lucide-react';
import { EventItem, EventArea } from '../../types';
import { downloadBlob } from '../../lib/download';
import { StatusBadge } from '../ui/StatusBadge';
import { CategoryBadges } from '../ui/CategoryBadges';
import { PriorityBadge } from '../ui/PriorityBadge';
import { sortTableEvents, formatDateRange, getMultiDayJamDisplay, isMultiDayEvent, isRecurringEvent } from '../../utils/eventUtils';
import { resolveAreaDisplay } from '../../utils/areaGrouping';
import { Button } from '../shadcn/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../shadcn/table';
import { Empty, EmptyMedia, EmptyHeader, EmptyTitle, EmptyDescription } from '../shadcn/empty';

interface Props {
  events: EventItem[];
  isAdmin: boolean;
  areas?: EventArea[];
  onEdit?: (ev: EventItem) => void;
  onDelete?: (ev: EventItem) => void;
  /** Sembunyikan/tampilkan event di halaman publik (flag lifecycle `draft`). */
  onToggleVisibility?: (ev: EventItem) => void;
  onDetail: (ev: EventItem) => void;
}

/** Internal table group — month within optional area section */
interface TableGroup {
  monthKey: string;
  monthLabel: string;
  events: EventItem[];
  areaKey?: string;
  areaName?: string;
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function getEventModelBadge(eventModel: EventItem['eventModel']) {
  if (eventModel === 'free') {
    return { label: 'Free', className: 'border-[var(--wf-rule)] bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]' };
  }
  if (eventModel === 'bayar') {
    return { label: 'Bayar', className: 'border-[var(--wf-rule)] bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]' };
  }
  if (eventModel === 'support') {
    return { label: 'Support', className: 'border-[var(--wf-rule)] bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]' };
  }
  return null;
}

function getMonthLabel(dateStr: string, count: number) {
  const [year, month] = dateStr.split('-');
  const monthIndex = month ? parseInt(month, 10) - 1 : 0;
  const monthName = MONTH_NAMES[monthIndex] ?? month ?? '';
  return `${monthName} ${year ?? ''} • ${count} acara`;
}

function exportCSV(events: EventItem[]) {
  const headers = ['Tanggal', 'Hari', 'Jam', 'Acara', 'Lokasi', 'EO', 'Kategori', 'Prioritas', 'Status', 'Keterangan'];
  const rows = events.map(e => [
    e.tanggal, e.day, e.jam, e.acara, e.lokasi, e.eo, e.categories.join(' | '), e.priority, e.status, e.keterangan
  ].map(v => `"${(v ?? '').replace(/"/g, '""')}"`));
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `events-${new Date().toISOString().split('T')[0]}.csv`);
}

export function EventTable({ events, isAdmin, areas, onEdit, onDelete, onToggleVisibility, onDetail }: Props) {
  const groupedEvents: TableGroup[] = useMemo(() => {
    const sortedEvents = sortTableEvents(events);

    // ── Area→month grouping (active when areas & >1 area bucket) ──
    if (areas && areas.length > 0) {
      const areaMap = new Map(areas.map(a => [a.id, a]));
      const areaBuckets = new Map<string, EventItem[]>();

      for (const ev of sortedEvents) {
        // `areaId` bisa menunjuk area yang sudah dihapus/nonaktif sehingga
        // tidak ada di `areaMap`. Perlakukan sebagai unmapped agar tidak
        // menghasilkan bucket tanpa nama (dulu crash saat render).
        const key = ev.areaId && areaMap.has(ev.areaId) ? ev.areaId : '__unmapped__';
        const bucket = areaBuckets.get(key) ?? [];
        bucket.push(ev);
        if (!areaBuckets.has(key)) areaBuckets.set(key, bucket);
      }

      // Only area-group if >1 distinct bucket (avoid noise on single-bucket or all-unmapped)
      if (areaBuckets.size > 1) {
        // Sort area keys: active areas by sortOrder→name, then unmapped last
        const orderedKeys = [...areaBuckets.keys()].sort((a, b) => {
          if (a === '__unmapped__') return 1;
          if (b === '__unmapped__') return -1;
          const aa = areaMap.get(a);
          const ab = areaMap.get(b);
          const so = (aa?.sortOrder ?? 999) - (ab?.sortOrder ?? 999);
          if (so !== 0) return so;
          return (aa?.name ?? a).localeCompare(ab?.name ?? b, 'id');
        });

        const tableGroups: TableGroup[] = [];
        for (const areaKey of orderedKeys) {
          const areaEvts = areaBuckets.get(areaKey)!;
          // `areaKey` berasal dari `ev.areaId`, yang bisa menunjuk area yang
          // sudah dihapus/nonaktif sehingga tidak ada di `areaMap`. Fallback ke
          // key mentah agar baris tetap tampil alih-alih crash (dulu `!`).
          const areaName = areaKey === '__unmapped__'
            ? 'Tanpa lokasi'
            : (areaMap.get(areaKey)?.name ?? areaKey);

          // Sub-group area events by month
          const monthBuckets: { monthKey: string; events: EventItem[] }[] = [];
          for (const ev of areaEvts) {
            const mk = ev.dateStr.slice(0, 7);
            const last = monthBuckets[monthBuckets.length - 1];
            if (!last || last.monthKey !== mk) {
              monthBuckets.push({ monthKey: mk, events: [ev] });
            } else {
              last.events.push(ev);
            }
          }
          for (const mb of monthBuckets) {
            tableGroups.push({
              areaKey,
              areaName,
              monthKey: mb.monthKey,
              monthLabel: getMonthLabel(`${mb.monthKey}-01`, mb.events.length),
              events: mb.events,
            });
          }
        }
        return tableGroups;
      }
    }

    // ── Fallback: month-only ──
    const groups: TableGroup[] = [];
    for (const event of sortedEvents) {
      const monthKey = event.dateStr.slice(0, 7);
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.monthKey !== monthKey) {
        groups.push({ monthKey, monthLabel: getMonthLabel(event.dateStr, 0), events: [event] });
      } else {
        lastGroup.events.push(event);
      }
    }
    return groups.map(g => ({ ...g, monthLabel: getMonthLabel(`${g.monthKey}-01`, g.events.length) }));
  }, [events, areas]);

  if (events.length === 0) {
    return (
      <div 
        className="ui-empty-panel flex flex-col items-center justify-center py-20 text-[var(--wf-ink-muted)]"
        aria-live="polite"
        role="status"
      >
        <Empty className="border-0 bg-transparent p-0">
          <EmptyMedia className="mb-3">
            <CalendarDays className="h-10 w-10 opacity-60" aria-hidden="true" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle className="text-sm font-medium">Tidak ada acara ditemukan</EmptyTitle>
            <EmptyDescription className="mt-1 text-xs text-[var(--wf-ink-muted)]">Coba ubah filter atau kata kunci pencarian</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="ui-dashboard-surface overflow-hidden">
      <div className="divide-y divide-[var(--wf-rule)] md:hidden">
        {groupedEvents.map((group, i) => {
          const prevGrp: TableGroup | null = i > 0 ? (groupedEvents[i - 1] as TableGroup | undefined) ?? null : null;
          const showAreaHeader = group.areaKey && group.areaKey !== prevGrp?.areaKey;
          return (
          <Fragment key={`${group.areaKey || 'm'}-${group.monthKey}`}>
            {showAreaHeader && (
              <div className="bg-[var(--wf-accent-soft)] px-4 py-2 text-[12px] font-bold text-[var(--wf-accent)]">
                <Layers className="inline h-3.5 w-3.5 -mt-0.5 mr-1.5" aria-hidden="true" />
                {group.areaName}
              </div>
            )}
          <div>
<div className="ui-dashboard-muted border-y border-[var(--wf-rule)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)] ">
              {group.monthLabel}
            </div>
            {group.events.map(ev => (
              <div key={ev.id} className={`space-y-3 p-4 ${ev.status === 'past' ? 'opacity-80' : ''}`}>
                {/* Kartu mobile full-width: target klik yang membungkus konten
                    (judul, badge, meta) — shadcn `Button` ghost dengan chrome
                    primitif dinetralkan supaya lebar/tinggi/padding/radius asli
                    tidak berubah. `role`/`tabIndex`/`aria-label` dipertahankan;
                    `onKeyDown` dihapus karena `<button>` asli sudah menangani
                    Enter/Space (menyimpannya = `onDetail` terpanggil dua kali). */}
                <Button
                  type="button"
                  variant="ghost"
                  role="button"
                  tabIndex={0}
                  onClick={() => onDetail(ev)}
                  aria-label={`Lihat detail ${ev.acara}`}
                  className="flex! flex-col! items-stretch! justify-start! h-auto! w-full! gap-0! rounded-lg border-0! p-0! cursor-pointer text-left! whitespace-normal! font-normal! hover:bg-transparent! dark:hover:bg-transparent! ui-focus-ring focus-visible:ring-0 active:translate-y-0!"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold ui-text-strong">{ev.acara}</p>
                      {ev.keterangan && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--wf-ink-muted)]">{ev.keterangan}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={ev.status} />
                      {isRecurringEvent(ev) && <span className="inline-flex items-center rounded-full bg-[var(--wf-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-accent)]">Reguler</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadges categories={ev.categories} maxVisible={2} />
                    {isAdmin && <PriorityBadge priority={ev.priority} />}
                    {isAdmin && (() => {
                      const modelBadge = getEventModelBadge(ev.eventModel);
                      return modelBadge ? (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${modelBadge.className}`}>
                          {modelBadge.label}
                        </span>
                      ) : null;
                    })()}
                  </div>

                   <div className="mt-3 space-y-1.5 text-xs text-[var(--wf-ink-muted)]">
                     <div className="flex items-center gap-1.5">
                       <Clock className="size-3.5 shrink-0 text-[var(--wf-ink-muted)]" />
                       <span>{isMultiDayEvent(ev) ? formatDateRange(ev.dateStr, ev.dateEnd) : `${ev.day}, ${ev.tanggal}`}</span>
                       {(isMultiDayEvent(ev) ? getMultiDayJamDisplay(ev) : ev.jam) && <span className="text-[var(--wf-ink-muted)]">· {isMultiDayEvent(ev) ? getMultiDayJamDisplay(ev) : ev.jam}</span>}
                     </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0 text-[var(--wf-ink-muted)]" />
                      <span className="line-clamp-2">{ev.lokasi || '-'}</span>
                    </div>
                    {ev.eo && <p className="text-[var(--wf-ink-muted)]">{isAdmin ? 'EO' : 'Penyelenggara'}: {ev.eo}</p>}
                  </div>
                   </Button>

                {/* `grid-cols-2`: empat tombol (Detail/Sembunyikan/Ubah/Hapus)
                    tidak muat satu baris di layar sempit — tanpa wrap tombol
                    terakhir terpotong oleh panel (dulu 3 tombol masih muat,
                    tombol "Sembunyikan" yang membuatnya meluber 59px). Grid 2×2
                    menjaga lebar tombol setara alih-alih menyisakan satu tombol
                    selebar penuh. */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => onDetail(ev)}>
                    <ExternalLink className="size-3.5" aria-hidden /> Detail
                  </Button>
                  {onToggleVisibility && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleVisibility(ev)}
                        aria-label={ev.status === 'draft' ? 'Tampilkan di halaman publik' : 'Sembunyikan dari halaman publik'}
                      >
                        {ev.status === 'draft'
                          ? <><Eye className="size-3.5" aria-hidden /> Tampilkan</>
                          : <><EyeOff className="size-3.5" aria-hidden /> Sembunyikan</>}
                      </Button>
                  )}
                  {onEdit && (
                      <Button variant="outline" size="sm" onClick={() => onEdit(ev)}>
                        <Edit2 className="size-3.5" aria-hidden /> Ubah
                      </Button>
                  )}
                  {onDelete && (
                      <Button variant="outline" size="sm" onClick={() => onDelete(ev)} className="text-[var(--wf-danger)] hover:bg-[var(--wf-danger)]/10 hover:text-[var(--wf-danger)]">
                        <Trash2 className="size-3.5" aria-hidden /> Hapus
                      </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          </Fragment>
          );
        })}
      </div>

      {/* Panel scroll sendiri (dua sumbu) + tinggi terbatas: `<thead>` sticky
          hanya benar-benar menempel bila kontainer scroll punya tinggi terbatas.
          Dulu `overflow-x-auto` membuat wrapper jadi scroll-container dua sumbu
          TANPA tinggi terbatas, sehingga `sticky top-0` jadi no-op (header ikut
          tergulung) DAN `min-w-[750px]` yang lebih kecil dari kebutuhan konten
          nyata (~1110px) memotong kolom Aksi tanpa memunculkan scrollbar sama
          sekali — tombol Ubah/Hapus tak bisa dijangkau. Pola ini (max-h + sticky
          thead) juga dipakai tabel lain di dashboard. */}
      <div
        className="hidden max-h-[70vh] overflow-auto md:block"
        role="region"
        aria-label="Daftar jadwal event"
        tabIndex={0}
      >
        <Table className="min-w-[60rem]">
          <caption className="sr-only">Tabel jadwal event</caption>
          <TableHeader className="sticky top-0 z-10 bg-[var(--wf-board-2)] [&_tr]:border-b-0">
            <TableRow className="ui-dashboard-muted border-b border-[var(--wf-rule)] hover:bg-transparent">
              <TableHead scope="col" className="h-auto px-4 py-3 text-left">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">
                  <ArrowUpDown className="size-3.5" aria-hidden="true" /> Tanggal
                </span>
              </TableHead>
              <TableHead scope="col" className="h-auto px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">Waktu</TableHead>
              <TableHead scope="col" className="h-auto px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">Acara</TableHead>
              <TableHead scope="col" className="h-auto px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">Lokasi</TableHead>
              <TableHead scope="col" className="h-auto px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">Status</TableHead>
              <TableHead scope="col" className="h-auto px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">Kategori</TableHead>
              {isAdmin && <TableHead scope="col" className="h-auto px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">Model</TableHead>}
              <TableHead scope="col" className="h-auto px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">{isAdmin ? 'EO' : 'Penyelenggara'}</TableHead>
              {/* `sticky right-0`: kolom Aksi dipin di kanan supaya tombol
                  Sembunyikan/Ubah/Hapus SELALU terlihat tanpa perlu menggeser
                  tabel ke kanan. `z-20` agar berada di atas sel-sel lain. */}
              <TableHead scope="col" className="sticky right-0 z-20 h-auto border-l border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[var(--wf-rule)] [&_tr:last-child]:border-0">
            {groupedEvents.map((group, i) => {
              const prevGrp: TableGroup | null = i > 0 ? (groupedEvents[i - 1] as TableGroup | undefined) ?? null : null;
              const showAreaHeader = group.areaKey && group.areaKey !== prevGrp?.areaKey;
              return (
              <Fragment key={`${group.areaKey || 'm'}-${group.monthKey}`}>
                {showAreaHeader && (
                  <TableRow className="bg-[var(--wf-accent-soft)] hover:bg-[var(--wf-accent-soft)]">
                    <TableCell colSpan={isAdmin ? 9 : 8} className="px-4 py-2 text-xs font-bold text-[var(--wf-accent)]">
                      <Layers className="inline h-3.5 w-3.5 -mt-0.5 mr-1.5" aria-hidden="true" />
                      {group.areaName}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow key={`${group.monthKey}-header`} className="ui-dashboard-muted border-y border-[var(--wf-rule)] hover:bg-transparent">
                  <TableCell colSpan={isAdmin ? 9 : 8} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">
                    {group.monthLabel}
                  </TableCell>
                </TableRow>
                {group.events.map(ev => (
                  <TableRow
                    key={ev.id}
                    className={`group transition-colors hover:bg-[var(--wf-board-2)] ${ev.status === 'past' ? '[&>td:not(:last-child)]:opacity-80' : ''}`}
                  >
                    {/* Date */}
                    <TableCell className="whitespace-nowrap px-4 py-3">
                      {isMultiDayEvent(ev) ? (
                        <div className="text-xs font-semibold text-[var(--wf-ink)]">{formatDateRange(ev.dateStr, ev.dateEnd)}</div>
                      ) : (
                        <>
                          <div className="text-xs font-semibold text-[var(--wf-ink)]">{ev.day}</div>
                          <div className="text-xs text-[var(--wf-ink-muted)]">{ev.tanggal}</div>
                        </>
                      )}
                    </TableCell>
                    {/* Time */}
                    <TableCell className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--wf-ink-muted)]">
                        <Clock className="h-3 w-3 text-[var(--wf-ink-muted)]" />
                        {isMultiDayEvent(ev) ? getMultiDayJamDisplay(ev) : (ev.jam || '-')}
                      </span>
                    </TableCell>
                    {/* Event name */}
                    <TableCell className="px-4 py-3">
                      <p className="font-semibold ui-text-strong">{ev.acara}</p>
                      {ev.keterangan && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-[var(--wf-ink-muted)]">{ev.keterangan}</p>
                      )}
                      {isAdmin && (
                        <div className="mt-1">
                          <PriorityBadge priority={ev.priority} />
                        </div>
                      )}
                    </TableCell>
                    {/* Location */}
                    <TableCell className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--wf-ink-muted)]">
                        <MapPin className="h-3 w-3 flex-shrink-0 text-[var(--wf-ink-muted)]" />
                        <span className="line-clamp-2">{resolveAreaDisplay(ev.areaId, ev.lokasi, areas ?? []) || '-'}</span>
                      </span>
                    </TableCell>
                    {/* Status */}
                    <TableCell className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={ev.status} />
                        {isRecurringEvent(ev) && <span className="inline-flex items-center rounded-full bg-[var(--wf-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--wf-accent)]">Reguler</span>}
                      </div>
                    </TableCell>
                    {/* Category */}
                    <TableCell className="whitespace-nowrap px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <CategoryBadges categories={ev.categories} maxVisible={2} />
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="whitespace-nowrap px-4 py-3">
                        {(() => {
                          const modelBadge = getEventModelBadge(ev.eventModel);
                          return modelBadge ? (
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${modelBadge.className}`}>
                              {modelBadge.label}
                            </span>
                          ) : <span className="text-xs text-[var(--wf-ink-muted)]">-</span>;
                        })()}
                      </TableCell>
                    )}
                    {/* EO — nama penyelenggara bisa sangat panjang. Dulu
                        `whitespace-nowrap` membuat kolom ini ~254px dan ikut
                        mendikte lebar tabel. Biarkan terpotong dengan tooltip. */}
                    <TableCell className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">
                      <span className="block max-w-[12rem] truncate" title={ev.eo || undefined}>
                        {ev.eo || '-'}
                      </span>
                    </TableCell>
                    {/* Actions — dipin di kanan (`sticky right-0`), jadi selalu
                        terlihat walau tabel lebih lebar dari panel. Latar harus
                        opaque (bukan transparan) supaya kolom di bawahnya tidak
                        tembus saat tergeser; `group-hover` menyamai hover baris. */}
                    <TableCell className="sticky right-0 z-10 border-l border-[var(--wf-rule)] bg-[var(--wf-board)] px-4 py-3 text-right transition-colors group-hover:bg-[var(--wf-board-2)]" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Lihat detail" onClick={() => onDetail(ev)} className="active:translate-y-0">
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </Button>
                        {onToggleVisibility && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleVisibility(ev)}
                            aria-label={ev.status === 'draft' ? 'Tampilkan di halaman publik' : 'Sembunyikan dari halaman publik'}
                            title={ev.status === 'draft' ? 'Tampilkan di halaman publik' : 'Sembunyikan dari halaman publik'}
                          >
                            {ev.status === 'draft'
                              ? <><Eye className="size-3.5" aria-hidden="true" /> Tampilkan</>
                              : <><EyeOff className="size-3.5" aria-hidden="true" /> Sembunyikan</>}
                          </Button>
                        )}
                        {(onEdit || onDelete) && (
                          <>
                            {onEdit && (
                            <Button variant="ghost" size="icon-sm" aria-label="Ubah acara" onClick={() => onEdit(ev)} className="active:translate-y-0">
                              <Edit2 className="size-3.5" aria-hidden="true" />
                            </Button>
                            )}
                            {onDelete && (
                            <Button variant="ghost" size="icon-sm" aria-label="Hapus acara" onClick={() => onDelete(ev)} className="active:translate-y-0">
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {/* Footer */}
      <div className="ui-dashboard-muted flex items-center justify-between border-t border-[var(--wf-rule)] px-4 py-2.5">
        <p className="text-xs text-[var(--wf-ink-muted)]">Menampilkan {events.length} acara</p>
        {isAdmin && (
          <Button variant="ghost" size="sm" onClick={() => exportCSV(events)}>
            <Download className="size-3.5" aria-hidden /> Ekspor CSV
          </Button>
        )}
      </div>
    </div>
  );
}
