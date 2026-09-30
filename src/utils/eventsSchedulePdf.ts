import type { EventItem } from '../types';
import { downloadBlob, safeFileName } from '../lib/download';
import type { SchedulePdfSection } from '../components/pdf/buildSchedulePdf';

// Dynamic import (pengecualian ts-no-dynamic-import): boundary code-splitting
// sengaja dijaga agar engine PDF (jspdf ~400 kB) tidak masuk chunk awal /events.

export interface SchedulePdfOptions {
  sections?: SchedulePdfSection[];
}

function scheduleFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `jadwal-event-metmal-${y}-${m}-${d}.pdf`;
}

function formatGeneratedAt(date = new Date()): string {
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Public schedule only — strip draft if any slipped through. */
export function filterScheduleEventsForPdf(events: EventItem[]): EventItem[] {
  return events.filter(e => e.status !== 'draft');
}

export async function renderEventsSchedulePdfBlob(
  events: EventItem[],
  options: SchedulePdfOptions = {},
): Promise<Blob> {
  const { buildSchedulePdf } = await import('../components/pdf/buildSchedulePdf');
  const safe = filterScheduleEventsForPdf(events);
  return buildSchedulePdf({
    events: safe,
    generatedAt: formatGeneratedAt(),
    sections: options.sections,
  }).output('blob');
}

export async function downloadEventsSchedulePdf(
  events: EventItem[],
  options: SchedulePdfOptions = {},
): Promise<void> {
  const blob = await renderEventsSchedulePdfBlob(events, options);
  downloadBlob(blob, safeFileName(scheduleFileName().replace(/\.pdf$/, '')) + '.pdf');
}
