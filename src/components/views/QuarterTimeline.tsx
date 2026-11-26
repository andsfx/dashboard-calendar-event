import { CalendarRange, Pencil, Trash2 } from 'lucide-react';
import { AnnualTheme } from '../../types';
import { Button } from '../shadcn/button';

interface Props {
  themes: AnnualTheme[];
  isAdmin?: boolean;
  onEditTheme?: (theme: AnnualTheme) => void;
  onDeleteTheme?: (theme: AnnualTheme) => void;
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatDate(str: string) {
  const [, m, d] = str.split('-');
  const monthIndex = parseInt(m ?? '1') - 1;
  const monthName = MONTH_ABBR[monthIndex];
  return `${d ?? ''} ${monthName ?? ''}`;
}

function calcProgress(start: string, end: string, today: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const t = new Date(today).getTime();
  if (t <= s) return 0;
  if (t >= e) return 100;
  return Math.round(((t - s) / (e - s)) * 100);
}

/**
 * Daftar tema tahunan, satu baris per tema seperti `record-row` prototipe Open
 * Design: ikon periode, nama, rentang tanggal, status (Aktif/Mendatang/Selesai),
 * lalu aksi. Warna tema tetap tampil sebagai titik identitas, tetapi keputusan
 * visualnya bukan lagi empat kartu berwarna: tema dibaca sebagai daftar, dan
 * kemajuannya jadi angka pendamping, bukan bar yang bersaing dengan teks.
 */
export function QuarterTimeline({ themes, isAdmin = false, onEditTheme, onDeleteTheme }: Props) {
  const today = new Date().toISOString().split('T')[0] ?? '';

  return (
    <div className="ui-dashboard-surface divide-y divide-[var(--wf-rule)]">
      {themes.map(theme => {
        const isActive = today >= theme.dateStart && today <= theme.dateEnd;
        const isPast = today > theme.dateEnd;
        const progress = calcProgress(theme.dateStart, theme.dateEnd, today);
        const statusLabel = isActive ? 'Aktif' : isPast ? 'Selesai' : 'Mendatang';

        return (
          <div key={theme.id} className="flex flex-wrap items-start gap-3 px-4 py-3 sm:flex-nowrap sm:items-center">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-[var(--wf-radius-control)] bg-[var(--wf-board-2)]"
              aria-hidden="true"
            >
              <CalendarRange className="size-4" style={{ color: theme.color }} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--wf-ink)]">{theme.name}</p>
              <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)]">
                {formatDate(theme.dateStart)} – {formatDate(theme.dateEnd)}
                <span className="ml-2 tabular-nums">{progress}% berjalan</span>
              </p>
            </div>

            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  isActive
                    ? 'text-[var(--wf-live)]'
                    : isPast
                      ? 'text-[var(--wf-ink-muted)]'
                      : 'text-[var(--wf-action)]'
                }`}
              >
                {isActive && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
                {statusLabel}
              </span>

              {isAdmin && (onEditTheme || onDeleteTheme) && (
                <div className="flex items-center gap-1">
                  {onEditTheme && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditTheme(theme)}
                      aria-label={`Ubah tema ${theme.name}`}
                      className="active:translate-y-0"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" /> Ubah
                    </Button>
                  )}
                  {onDeleteTheme && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteTheme(theme)}
                      aria-label={`Hapus tema ${theme.name}`}
                      className="text-[var(--wf-danger)] hover:bg-[var(--wf-danger)]/10 hover:text-[var(--wf-danger)] active:translate-y-0"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" /> Hapus
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
