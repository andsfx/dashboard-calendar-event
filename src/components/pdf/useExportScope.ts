import { useState } from 'react';
import {
  availablePeriods,
  filterByExportRange,
  periodRange,
  themeRangeFor,
  UNBOUNDED_RANGE,
  type ExportDateRange,
  type ExportPeriod,
} from '../../utils/exportDateRange';

// ============================================================
// Cakupan ekspor: "item mana yang ikut" — periode (hari/minggu/bulan/
// tahun/rentang khusus) lalu pilih per item.
//
// Dipakai bersama oleh ekspor Jadwal Event, Album Foto, dan Hasil Evaluasi
// supaya aturan penyaringan hanya ada di satu tempat. Item multi-hari
// disaring lewat rentang, bukan tanggal mulai saja.
//
// Catatan desain: pilihan pengguna disimpan **per kunci rentang**, bukan
// sebagai satu daftar tunggal yang harus disinkronkan lewat effect saat
// rentang berubah. Rentang baru otomatis berarti "semua item terpilih",
// rentang lama tetap mengingat pilihannya, dan tidak ada derived state
// yang bisa basi. Semua turunan dihitung saat render (O(n) atas daftar
// yang sudah ada di memori) sehingga tidak ada memo yang perlu didaftar
// dependensinya.
// ============================================================

export interface ExportScopeItemRange {
  start: string;
  end?: string;
}

/** Tema tahunan untuk preset "Tema". Hanya butuh rentang tanggalnya. */
export interface ExportScopeTheme {
  id: string;
  name: string;
  dateStart: string;
  dateEnd: string;
}

export interface UseExportScopeOptions<T> {
  items: T[];
  /**
   * Kumpulan lengkap **sebelum** filter halaman diterapkan. Diisi hanya oleh
   * permukaan yang memang punya filter sendiri (mis. `/events` dengan
   * `?waktu=`/`?kategori=`); kosong berarti tidak ada yang bisa diabaikan,
   * sehingga sakelarnya tidak pernah ditawarkan.
   */
  allItems?: T[];
  getId: (item: T) => string;
  getRange: (item: T) => ExportScopeItemRange;
  defaultPeriod?: ExportPeriod;
  /**
   * Daftar tema untuk preset "Tema". Kosong = preset tidak ditampilkan,
   * sehingga permukaan yang tidak punya konsep tema tidak melihat opsi mati.
   */
  themes?: ExportScopeTheme[];
}

export interface ExportScope<T> {
  period: ExportPeriod;
  setPeriod: (period: ExportPeriod) => void;
  /** "YYYY-MM" untuk preset Bulan. */
  monthKey: string;
  setMonthKey: (value: string) => void;
  year: string;
  setYear: (value: string) => void;
  customStart: string;
  setCustomStart: (value: string) => void;
  customEnd: string;
  setCustomEnd: (value: string) => void;
  /** Tema terpilih untuk preset Tema; '' bila belum ada. */
  themeId: string;
  setThemeId: (value: string) => void;
  /** Tema yang tersedia; kosong berarti preset Tema tidak relevan. */
  themes: ExportScopeTheme[];
  /**
   * Sakelar "abaikan filter halaman". Selalu `true` bila permukaan tidak
   * punya filter halaman (`allItems` kosong) supaya pemanggil bisa
   * memeriksanya tanpa cabang tambahan.
   */
  ignorePageFilter: boolean;
  setIgnorePageFilter: (value: boolean) => void;
  /** Apakah sakelar itu memang bisa ditawarkan (permukaan punya filter). */
  canIgnorePageFilter: boolean;
  range: ExportDateRange;
  /** Item yang lolos rentang, sebelum dicentang/di-uncheck. */
  inRange: T[];
  /** Item yang akan benar-benar diekspor. */
  selected: T[];
  selectedIds: string[];
  isSelected: (id: string) => boolean;
  toggleId: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  allSelected: boolean;
  months: Array<{ value: string; label: string }>;
  years: Array<{ value: string; label: string }>;
}

export function useExportScope<T>({
  items,
  allItems,
  getId,
  getRange,
  defaultPeriod = 'all',
  themes = [],
}: UseExportScopeOptions<T>): ExportScope<T> {
  const [period, setPeriod] = useState<ExportPeriod>(defaultPeriod);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Sakelar "abaikan filter halaman".
  //
  // Default `false` = hormati filter halaman. Itu pilihan yang aman: apa yang
  // terlihat di layar sama dengan apa yang masuk dokumen. Sakelar ini ada
  // karena ada kebutuhan nyata untuk sebaliknya — mis. halaman sedang
  // difilter "Hari ini" (1 acara) tetapi pengguna ingin rekap satu tema
  // penuh. Sebelumnya pilihan seperti itu mustahil: keduanya bertumpuk
  // sebagai irisan, jadi tema apa pun terpotong habis oleh filter halaman.
  //
  // `canIgnorePageFilter` bernilai false bila pemanggil tidak mengirim
  // `allItems` — permukaan tanpa filter halaman tidak perlu sakelar ini.
  const canIgnorePageFilter = allItems !== undefined;
  const [ignorePageFilterRaw, setIgnorePageFilter] = useState(false);
  const ignorePageFilter = canIgnorePageFilter && ignorePageFilterRaw;

  // Sumber item: daftar penuh bila filter halaman diabaikan, daftar tersaring
  // bila tidak. Dipakai juga oleh `availablePeriods` supaya daftar
  // Bulan/Tahun ikut melebar — kalau tidak, memilih "Tahun" saat mengabaikan
  // filter hanya menawarkan bulan yang kebetulan lolos filter halaman.
  const sourceItems = ignorePageFilter ? allItems : items;

  // Pilihan bulan/tahun hanya berisi periode yang benar-benar ada isinya,
  // supaya preset Bulan/Tahun tidak terbuka pada periode kosong.
  const periods = availablePeriods(sourceItems.map((item) => getRange(item).start));

  // Nilai kosong berarti "pakai periode terbaru yang ada datanya".
  const [pickedMonth, setMonthKey] = useState('');
  const [pickedYear, setYear] = useState('');
  const monthKey = pickedMonth || periods.months[0]?.value || '';
  const year = pickedYear || periods.years[0]?.value || '';

  // Tema default = yang terbaru (daftar sudah terurut menurun dari API).
  const [pickedThemeId, setThemeId] = useState('');
  const themeId = pickedThemeId || themes[0]?.id || '';
  const activeTheme = themes.find((theme) => theme.id === themeId);

  const range: ExportDateRange = (() => {
    if (period === 'custom') {
      // Rentang khusus boleh setengah terisi: hanya awal, atau hanya akhir.
      return { start: customStart, end: customEnd };
    }
    if (period === 'month') {
      const [y, m] = monthKey.split('-');
      if (!y || !m) return { start: '', end: '' };
      return periodRange('month', { year: Number(y), month: Number(m) - 1 });
    }
    if (period === 'year') {
      if (!year) return { start: '', end: '' };
      return periodRange('year', { year: Number(year) });
    }
    if (period === 'theme') {
      // Rentang dari data tema; tema tanpa tanggal → tanpa batas, bukan
      // rentang kosong yang diam-diam menyaring semua item keluar.
      return themeRangeFor(activeTheme) ?? UNBOUNDED_RANGE;
    }
    return periodRange(period);
  })();

  const inRange = filterByExportRange(sourceItems, range, getRange);
  const inRangeIds = inRange.map(getId);
  const inRangeKey = inRangeIds.join('\u0000');

  // undefined = "semua item pada rentang ini terpilih".
  const [overrides, setOverrides] = useState<Record<string, string[]>>({});
  const override = Object.prototype.hasOwnProperty.call(overrides, inRangeKey)
    ? overrides[inRangeKey]
    : undefined;

  const selectedIds = override ?? inRangeIds;
  const selectedIdSet = new Set(selectedIds);
  const selected = inRange.filter((item) => selectedIdSet.has(getId(item)));

  const writeSelection = (next: string[] | null) => {
    setOverrides((previous) => {
      const draft = { ...previous };
      if (next === null) delete draft[inRangeKey];
      else draft[inRangeKey] = next;
      return draft;
    });
  };

  const toggleId = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((value) => value !== id)
      : [...selectedIds, id];
    writeSelection(next);
  };

  return {
    period,
    setPeriod,
    monthKey,
    setMonthKey,
    year,
    setYear,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    themeId,
    setThemeId,
    themes,
    ignorePageFilter,
    setIgnorePageFilter,
    canIgnorePageFilter,
    range,
    inRange,
    selected,
    selectedIds,
    isSelected: (id: string) => selectedIdSet.has(id),
    toggleId,
    selectAll: () => writeSelection(null),
    clearSelection: () => writeSelection([]),
    allSelected: inRangeIds.length > 0 && inRangeIds.every((id) => selectedIdSet.has(id)),
    months: periods.months,
    years: periods.years,
  };
}
