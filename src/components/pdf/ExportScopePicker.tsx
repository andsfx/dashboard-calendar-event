import { useState } from 'react';
import { CalendarRange, Search } from 'lucide-react';
import { EXPORT_PERIODS, describeRange } from '../../utils/exportDateRange';
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
              <button
                key={option.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => scope.setPeriod(option.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'border-brand-primary-600 bg-brand-primary-600 text-white'
                    : 'border-slate-200 bg-[var(--brand-card)] text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {scope.period === 'month' && (
          <label className="block pt-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Bulan</span>
            <select
              value={scope.monthKey}
              onChange={(event) => scope.setMonthKey(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-primary-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
            >
              {scope.months.length === 0 && <option value="">Tidak ada data</option>}
              {scope.months.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </label>
        )}

        {scope.period === 'year' && (
          <label className="block pt-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Tahun</span>
            <select
              value={scope.year}
              onChange={(event) => scope.setYear(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-primary-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
            >
              {scope.years.length === 0 && <option value="">Tidak ada data</option>}
              {scope.years.map((year) => (
                <option key={year.value} value={year.value}>{year.label}</option>
              ))}
            </select>
          </label>
        )}

        {scope.period === 'theme' && (
          <label className="block pt-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Tema</span>
            <select
              value={scope.themeId}
              onChange={(event) => scope.setThemeId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-primary-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
            >
              {scope.themes.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
            </select>
          </label>
        )}

        {scope.period === 'custom' && (
          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Dari tanggal</span>
              <input
                type="date"
                name="export-scope-start"
                value={scope.customStart}
                onChange={(event) => scope.setCustomStart(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-primary-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Sampai tanggal</span>
              <input
                type="date"
                name="export-scope-end"
                value={scope.customEnd}
                onChange={(event) => scope.setCustomEnd(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-brand-primary-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>
        )}

        <p className="flex items-center gap-1.5 pt-1 text-xs ui-text-muted">
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
          <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
            <input
              type="checkbox"
              name="export-scope-ignore-page-filter"
              checked={scope.ignorePageFilter}
              onChange={(event) => scope.setIgnorePageFilter(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-primary-600"
            />
            <span className="text-xs leading-snug text-slate-600 dark:text-slate-300">
              Abaikan filter halaman
              <span className="block ui-text-muted">
                {scope.ignorePageFilter
                  ? 'Seluruh acara ditawarkan, bukan hanya yang lolos filter di halaman ini.'
                  : 'Hanya acara yang lolos filter halaman yang ditawarkan.'}
              </span>
            </span>
          </label>
        )}
      </fieldset>

      <fieldset disabled={disabled} className="min-w-0 space-y-2">
        <legend className="sr-only">Item yang diekspor</legend>
        {/* flex-wrap: label tombol memuat kata benda ("Kosongkan pilihan event"),
            yang pada panel sempit lebih dulu menembus batas daripada turun baris. */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {scope.inRange.length} {itemNoun} pada periode ini
          </span>
          <button
            type="button"
            onClick={() => (scope.allSelected ? scope.clearSelection() : scope.selectAll())}
            className="text-xs font-semibold text-brand-primary-700 transition hover:text-brand-primary-800 disabled:opacity-50 dark:text-brand-primary-300 dark:hover:text-brand-primary-200"
          >
            {scope.allSelected ? `Kosongkan pilihan ${itemNoun}` : `Pilih semua ${itemNoun}`}
          </button>
        </div>

        <label className="relative block">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            name="export-scope-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-brand-primary-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        {visibleItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm ui-text-muted dark:border-slate-700">
            {scope.inRange.length === 0 ? emptyLabel : 'Tidak ada yang cocok dengan pencarian.'}
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {rendered.map((item) => {
                const id = getId(item);
                const isChecked = scope.isSelected(id);
                const meta = secondary?.(item);
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <input
                        type="checkbox"
                        name={`export-scope-item-${id}`}
                        checked={isChecked}
                        onChange={() => scope.toggleId(id)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-primary-600 focus:ring-brand-primary-500 dark:border-slate-600"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                          {primary(item)}
                        </span>
                        {meta && <span className="mt-0.5 block truncate text-xs ui-text-muted">{meta}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {hiddenCount > 0 && (
              <p className="border-t border-slate-200 px-3 py-2 text-[11px] ui-text-muted dark:border-slate-800">
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
            ? 'bg-brand-primary-50 text-brand-primary-900 dark:bg-brand-primary-500/15 dark:text-brand-primary-100'
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
