import { EventItem } from '../types';
import { parseIsoDateLocal, parseStartTime, parseTimeRange } from './eventDateTime';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function normalizeText(value: string | undefined): string {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

const JAM_PLACEHOLDERS: Record<string, true> = {
  '-': true, '–': true, '—': true, 'n/a': true, na: true, 'n.a.': true, tba: true, tbd: true,
};

/**
 * Satu aturan `jam` untuk KEDUA arah — tulis (`normalizeEventInput`, mapper DB)
 * dan baca (`dbEventToEventItem`/`dbDraftToDraftItem`):
 * - kosong / placeholder tanpa makna → ""
 * - rentang atau jam tunggal yang bisa diparse → bentuk kanonik
 *   ("10:00 - 12:00", "13:00", "11:00")
 * - teks bermakna lain ("Setelah Isya", "Sepanjang hari", "9.5 - 10.30") →
 *   dipertahankan ter-trim dengan spasi dirapatkan, TIDAK dihapus.
 * Alasannya: admin yang hanya mengubah field lain mengirim ulang seluruh objek
 * event; kalau sisi tulis menghapus nilai yang tidak ia pahami sementara sisi
 * baca mempertahankannya, simpan-simpan biasa akan menghapus `jam` diam-diam.
 */
export function resolveJam(value: string | undefined): string {
  const text = normalizeText(value);
  if (!text) return '';
  if (Object.hasOwn(JAM_PLACEHOLDERS, text.toLowerCase())) return '';

  // Pemisah en/em dash dan suffix WIB dinormalkan di sini (bukan di parseTimeRange)
  // agar "10.00–12.00" / "10.00 - 12.00 WIB" tetap menyimpan jam selesai.
  const parsed = parseTimeRange(text.replace(/[–—]/g, '-').replace(/\s*WIB$/i, '').trim());
  if (parsed) {
    return `${pad2(parsed.startHour)}:${pad2(parsed.startMin)} - ${pad2(parsed.endHour)}:${pad2(parsed.endMin)}`;
  }

  const start = parseStartTime(text);
  if (start) return `${pad2(start.startHour)}:${pad2(start.startMin)}`;

  return text;
}

/** Alias tipis untuk jalur tulis — aturan sama persis dengan `resolveJam`. */
export const normalizeJam = resolveJam;

function deriveDateFields(dateStr: string | undefined): Pick<EventItem, 'tanggal' | 'day' | 'month'> | null {
  if (!dateStr) return null;
  const date = parseIsoDateLocal(dateStr);
  if (!date) return null;

  const dayIndex = date.getDay();
  const monthIndex = date.getMonth();
  const day = HARI[dayIndex] ?? '';
  const month = BULAN[monthIndex] ?? '';
  const tanggal = `${date.getDate()} ${month} ${date.getFullYear()}`;

  return { tanggal, day, month };
}

export function normalizeEventInput(input: Partial<EventItem>): Partial<EventItem> {
  const normalized: Partial<EventItem> = {
    ...input,
    acara: normalizeText(input.acara),
    lokasi: normalizeText(input.lokasi),
    eo: normalizeText(input.eo),
    keterangan: normalizeText(input.keterangan),
    jam: resolveJam(input.jam),
    dateStr: normalizeText(input.dateStr),
  };

  const derived = deriveDateFields(normalized.dateStr);
  if (derived) {
    // `dateStr` adalah sumber utama: `day`/`month`/`tanggal` tersimpan bisa basi kalau
    // jadwal dipindah, jadi turunan selalu menimpa nilai lama (audit A-11).
    normalized.day = derived.day;
    normalized.month = derived.month;
    normalized.tanggal = derived.tanggal;
  } else {
    normalized.day = normalizeText(input.day);
    normalized.month = normalizeText(input.month);
    normalized.tanggal = normalizeText(input.tanggal);
  }

  return normalized;
}
