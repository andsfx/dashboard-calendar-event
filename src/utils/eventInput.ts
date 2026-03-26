import { EventItem } from '../types';
import { parseIsoDateLocal, parseTimeRange } from './eventDateTime';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function normalizeText(value: string | undefined): string {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function normalizeJam(value: string | undefined): string {
  const raw = normalizeText(value);
  if (!raw) return '';

  const parsed = parseTimeRange(raw);
  if (!parsed) return raw;

  return `${pad2(parsed.startHour)}:${pad2(parsed.startMin)} - ${pad2(parsed.endHour)}:${pad2(parsed.endMin)}`;
}

function deriveDateFields(dateStr: string | undefined): Pick<EventItem, 'tanggal' | 'day' | 'month'> | null {
  if (!dateStr) return null;
  const date = parseIsoDateLocal(dateStr);
  if (!date) return null;

  const day = HARI[date.getDay()];
  const month = BULAN[date.getMonth()];
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
    jam: normalizeJam(input.jam),
    dateStr: normalizeText(input.dateStr),
  };

  const derived = deriveDateFields(normalized.dateStr);
  if (derived) {
    normalized.day = normalized.day || derived.day;
    normalized.month = normalized.month || derived.month;
    normalized.tanggal = normalized.tanggal || derived.tanggal;
  } else {
    normalized.day = normalizeText(input.day);
    normalized.month = normalizeText(input.month);
    normalized.tanggal = normalizeText(input.tanggal);
  }

  return normalized;
}
