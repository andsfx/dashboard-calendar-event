import { useState } from 'react';
import { CalendarRange, Search } from 'lucide-react';
import { EXPORT_PERIODS, describeRange } from '../../utils/exportDateRange';
import { Button } from '../shadcn/button';
import { Checkbox } from '../shadcn/checkbox';
import { Input } from '../shadcn/input';
import { Label } from '../shadcn/label';
import { NativeSelect, NativeSelectOption } from '../shadcn/native-select';
import type { ExportScope } from './useExportScope';

// ============================================================
// Pemilih cakupan ekspor — "item mana yang ikut ke PDF".
//
// Dua tingkat: (1) periode (semua/hari ini/minggu/bulan/tahun/khusus),
// (2) centang per item. Dipakai bersama Jadwal Event, Album Foto, dan
// Hasil Evaluasi supaya perilakunya identik di seluruh aplikasi.
// ============================================================

/** Batas baris yang dirender; sisanya diwakili hitungan, bukan DOM. */
const MAX_RENDERED_ITEMS = 80;

interface Props<T> {
  scope: ExportScope<T>;
  getId: (item: T) => string;
  primary: (item: T) => string;
  secondary?: (item: T) => string;
  /** Kata benda untuk kalimat hitungan, mis. "event", "album", "submisi". */
  itemNoun?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}

export function ExportScopePicker<T>({
  scope,
  getId,
  primary,
  secondary,
  itemNoun = 'item',
  searchPlaceholder = 'Cari…',
  emptyLabel = 'Tidak ada data pada periode ini.',
  disabled = false,
}: Props<T>) {
  const [query, setQuery] = useState('');

  // Pencarian dihitung langsung: `primary`/`secondary` datang sebagai fungsi
  // inline dari pemanggil, jadi memo akan selalu invalid dan hanya menambah
  // lapisan. Daftarnya sudah ada di memori, jadi biayanya O(n) per render.
  const needle = query.trim().toLowerCase();
  const visibleItems = needle
    ? scope.inRange.filter((item) =>
        `${primary(item)} ${secondary?.(item) ?? ''}`.toLowerCase().includes(needle),
      )
    : scope.inRange;

  const rendered = visibleItems.slice(0, MAX_RENDERED_ITEMS);
  const hiddenCount = visibleItems.length - rendered.length;
  const selectedCount = scope.selectedIds.length;

  // Preset Tema hanya ditampilkan bila ada temanya — jangan tawarkan opsi
  // yang tidak bisa dipakai.
  const periods = EXPORT_PERIODS.filter(
    (option) => option.id !== 'theme' || scope.themes.length > 0,
  );

  return (
    <div className="space-y-4">
      <fieldset disabled={disabled} className="min-w-0 space-y-2">
        <legend className="sr-only">Periode yang diekspor</legend>
        <div className="flex flex-wrap gap-1.5">
          {periods.map((option) => {
            const isActive = scope.period === option.id;
            return (
              <Button
                key={option.id}
                variant="ghost"
                aria-pressed={isActive}
                onClick={() => scope.setPeriod(option.id)}
                className={`!min-w-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'border-[var(--wf-accent)] bg-[var(--wf-accent)] text-[var(--wf-accent-ink)]'
                    : 'border-[var(--wf-rule)] bg-[var(--wf-board)] text-[var(--wf-ink-muted)] hover:border-[var(--wf-rule-strong)]'
                }`}
              >
                {option.label}
              </Button>
            );
          })}
        </div>

        {scope.period === 'month' && (
          <Label className="block pt-1">
            <span className="text-xs font-medium text-[var(--wf-ink-muted)]">Bulan</span>
            <div className="mt-1">
              <NativeSelect
                value={scope.monthKey}
                onChange={(event) => scope.setMonthKey(event.target.value)}
                aria-label="Bulan"
                className="w-full"
              >
                {scope.months.length === 0 && (
                  <NativeSelectOption value="">Tidak ada data</NativeSelectOption>
                )}
                {scope.months.map((month) => (
                  <NativeSelectOption key={month.value} value={month.value}>
                    {month.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </Label>
        )}

        {scope.period === 'year' && (
          <Label className="block pt-1">
            <span className="text-xs font-medium text-[var(--wf-ink-muted)]">Tahun</span>
            <div className="mt-1">
              <NativeSelect
                value={scope.year}
                onChange={(event) => scope.setYear(event.target.value)}
                aria-label="Tahun"
                className="w-full"
              >
                {scope.years.length === 0 && (
                  <NativeSelectOption value="">Tidak ada data</NativeSelectOption>
                )}
                {scope.years.map((year) => (
                  <NativeSelectOption key={year.value} value={year.value}>
                    {year.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </Label>
        )}

        {scope.period === 'theme' && (
          <Label className="block pt-1">
            <span className="text-xs font-medium text-[var(--wf-ink-muted)]">Tema</span>
            <div className="mt-1">
              <NativeSelect
                value={scope.themeId}
                onChange={(event) => scope.setThemeId(event.target.value)}
                aria-label="Tema"
                className="w-full"
              >
                {scope.themes.map((theme) => (
                  <NativeSelectOption key={theme.id} value={theme.id}>
                    {theme.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </Label>
        )}

        {scope.period === 'custom' && (
          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <Label className="block">
              <span className="text-xs font-medium text-[var(--wf-ink-muted)]">Dari tanggal</span>
              <Input
                type="date"
                name="export-scope-start"
                value={scope.customStart}
                onChange={(event) => scope.setCustomStart(event.target.value)}
                className="mt-1 h-auto w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm outline-none ring-[var(--wf-accent)] transition focus:ring-2"
              />
            </Label>
            <Label className="block">
              <span className="text-xs font-medium text-[var(--wf-ink-muted)]">Sampai tanggal</span>
              <Input
                type="date"
                name="export-scope-end"
                value={scope.customEnd}
                onChange={(event) => scope.setCustomEnd(event.target.value)}
                className="mt-1 h-auto w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm outline-none ring-[var(--wf-accent)] transition focus:ring-2"
              />
            </Label>
          </div>
        )}

        <p className="flex items-center gap-1.5 pt-1 text-xs text-[var(--wf-ink-muted)]">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
          {scope.period === 'theme' ? 'Rentang tema' : 'Periode'}:
          <span className="font-semibold">{describeRange(scope.range)}</span>
        </p>

        {/* Sakelar ini hanya muncul di permukaan yang memang punya filter
            halaman sendiri (mis. /events dengan ?waktu=/?kategori=).
            Tanpanya, filter halaman dan periode ekspor bertumpuk sebagai
            irisan, sehingga rekap satu tema penuh mustahil dibuat saat
            halaman sedang difilter. */}
        {scope.canIgnorePageFilter && (
          <Label className="mt-2 flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--wf-rule)] px-3 py-2">
            <Checkbox
              checked={scope.ignorePageFilter}
              onCheckedChange={(value) => scope.setIgnorePageFilter(value === true)}
              aria-label="Abaikan filter halaman"
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs leading-snug text-[var(--wf-ink-muted)]">
              Abaikan filter halaman
              <span className="block text-[var(--wf-ink-muted)]">
                {scope.ignorePageFilter
                  ? 'Seluruh acara ditawarkan, bukan hanya yang lolos filter di halaman ini.'
                  : 'Hanya acara yang lolos filter halaman yang ditawarkan.'}
              </span>
            </span>
          </Label>
        )}
      </fieldset>

      <fieldset disabled={disabled} className="min-w-0 space-y-2">
        <legend className="sr-only">Item yang diekspor</legend>
        {/* flex-wrap: label tombol memuat kata benda ("Kosongkan pilihan event"),
            yang pada panel sempit lebih dulu menembus batas daripada turun baris. */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-[var(--wf-ink-muted)]">
            {scope.inRange.length} {itemNoun} pada periode ini
          </span>
          <Button
            variant="ghost"
            onClick={() => (scope.allSelected ? scope.clearSelection() : scope.selectAll())}
            className="!min-w-0 text-xs font-semibold text-[var(--wf-accent)] transition hover:text-[var(--wf-accent)] disabled:opacity-50"
          >
            {scope.allSelected ? `Kosongkan pilihan ${itemNoun}` : `Pilih semua ${itemNoun}`}
          </Button>
        </div>

        <div className="relative block">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--wf-ink-muted)]" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            className="w-full"
          />
        </div>

        {visibleItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--wf-rule)] px-4 py-6 text-center text-sm text-[var(--wf-ink-muted)]">
            {scope.inRange.length === 0 ? emptyLabel : 'Tidak ada yang cocok dengan pencarian.'}
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-[var(--wf-rule)]">
            <ul className="divide-y divide-[var(--wf-rule)]">
              {rendered.map((item) => {
                const id = getId(item);
                const isChecked = scope.isSelected(id);
                const meta = secondary?.(item);
                return (
                  <li key={id}>
                    <Label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition hover:bg-[var(--wf-board-2)]">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => scope.toggleId(id)}
                        className="mt-0.5 shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[var(--wf-ink)]">
                          {primary(item)}
                        </span>
                        {meta && <span className="mt-0.5 block truncate text-xs text-[var(--wf-ink-muted)]">{meta}</span>}
                      </span>
                    </Label>
                  </li>
                );
              })}
            </ul>
            {hiddenCount > 0 && (
              <p className="border-t border-[var(--wf-rule)] px-3 py-2 text-[11px] text-[var(--wf-ink-muted)]">
                +{hiddenCount} {itemNoun} lain ikut terpilih. Persempit periode atau pakai pencarian untuk melihatnya.
              </p>
            )}
          </div>
        )}
      </fieldset>

      <p
        aria-live="polite"
        className={`rounded-xl px-3 py-2 text-sm ${
          selectedCount > 0
            ? 'bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]'
            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
        }`}
      >
        {selectedCount > 0
          ? `${selectedCount} dari ${scope.inRange.length} ${itemNoun} akan diekspor.`
          : `Pilih minimal satu ${itemNoun} untuk diekspor.`}
      </p>
    </div>
  );
}
