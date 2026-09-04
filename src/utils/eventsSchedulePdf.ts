import type { EventItem } from '../types';

// Dynamic import (pengecualian ts-no-dynamic-import): boundary code-splitting
// sengaja dijaga agar engine PDF (jspdf ~400 kB) tidak masuk chunk awal /events.

function scheduleFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `jadwal-event-metmal-${y}-${m}-${d}.pdf`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 100);
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

export async function renderEventsSchedulePdfBlob(events: EventItem[]): Promise<Blob> {
  const { buildSchedulePdf } = await import('../components/pdf/buildSchedulePdf');
  const safe = filterScheduleEventsForPdf(events);
  return buildSchedulePdf({ events: safe, generatedAt: formatGeneratedAt() }).output('blob');
}

export async function downloadEventsSchedulePdf(events: EventItem[]): Promise<void> {
  const blob = await renderEventsSchedulePdfBlob(events);
  downloadBlob(blob, scheduleFileName());
}
