import type { EventItem } from '../types';

// Dynamic import keeps @react-pdf/renderer out of the /events initial chunk.

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
  const [{ pdf }, { EventsScheduleDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../components/pdf/EventsScheduleDocument'),
  ]);
  const safe = filterScheduleEventsForPdf(events);
  return pdf(
    <EventsScheduleDocument events={safe} generatedAt={formatGeneratedAt()} />,
  ).toBlob();
}

export async function downloadEventsSchedulePdf(events: EventItem[]): Promise<void> {
  const blob = await renderEventsSchedulePdfBlob(events);
  downloadBlob(blob, scheduleFileName());
}
