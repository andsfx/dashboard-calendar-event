import { DraftEventItem } from '../types';
import { parseDateStrLocal } from './eventUtils';

export function normalizePhoneToWhatsApp(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

export function getWhatsAppUrl(phone: string) {
  const normalized = normalizePhoneToWhatsApp(phone);
  return normalized ? `https://wa.me/${normalized}` : '';
}

export function getDraftSuggestions<T extends { [key: string]: string }>(
  items: T[],
  key: keyof T,
) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const value = String(item[key] || '').trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value]) => value);
}

export function getSuggestionPlaceholder(values: string[], fallback: string) {
  if (values.length === 0) return fallback;
  return values.slice(0, 3).join(' / ');
}

export function formatDraftPublishedAt(value?: string) {
  if (!value) return 'Belum dipublish';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDraftDateMeta(dateStr: string) {
  const d = parseDateStrLocal(dateStr) || new Date();
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  return {
    day: dayNames[d.getDay()],
    tanggal: `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`,
    month: monthNames[d.getMonth()],
  };
}

export function sortDraftActive(a: DraftEventItem, b: DraftEventItem) {
  const order = { confirm: 0, draft: 1, cancel: 2 };
  const progressCompare = order[a.progress] - order[b.progress];
  if (progressCompare !== 0) return progressCompare;
  const dateCompare = a.dateStr.localeCompare(b.dateStr);
  if (dateCompare !== 0) return dateCompare;
  return a.acara.localeCompare(b.acara);
}

export function sortDraftHistory(a: DraftEventItem, b: DraftEventItem) {
  const aRef = a.publishedAt || a.dateStr;
  const bRef = b.publishedAt || b.dateStr;
  return bRef.localeCompare(aRef);
}
