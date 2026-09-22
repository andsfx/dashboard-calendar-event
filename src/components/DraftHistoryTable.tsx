import { ExternalLink, MessageCircle, RotateCcw } from 'lucide-react';
import { DraftEventItem } from '../types';
import { DraftProgressBadge } from './DraftProgressBadge';
import { formatDraftPublishedAt, getWhatsAppUrl } from '../utils/draftUtils';

export function DraftHistoryTable({ drafts, onRestore }: { drafts: DraftEventItem[]; onRestore?: (draft: DraftEventItem) => void }) {
  if (drafts.length === 0) {
    return (
      <div className="ui-empty-panel p-6 text-sm text-[var(--wf-ink-muted)]">
        Belum ada riwayat draft event.
      </div>
    );
  }

  return (
    <div className="ui-dashboard-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-[var(--wf-rule)] bg-[var(--wf-board-2)]">
              {['Tanggal', 'Event', 'EO', 'PIC', 'Nomor Telepon', 'Progress', 'Status Histori', 'Follow Up'].map(label => (
                <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--wf-rule)]">
            {drafts.map(draft => {
              const whatsappUrl = getWhatsAppUrl(draft.phone);
              return (
                <tr key={draft.id} className="align-top hover:bg-[var(--wf-board-2)]">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="text-xs font-semibold text-[var(--wf-ink)]">{draft.day}</div>
                    <div className="text-xs text-[var(--wf-ink-muted)]">{draft.tanggal}</div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--wf-ink)]">{draft.acara}</p>
                    <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">{draft.lokasi}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.eo || '-'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.pic}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.phone}</td>
                  <td className="px-4 py-3"><DraftProgressBadge progress={draft.progress} /></td>
                  <td className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">
                    {draft.deleted ? (
                      <div>
                        <p className="font-semibold text-red-700 dark:text-red-300">Dihapus</p>
                        <p>{formatDraftPublishedAt(draft.deletedAt)}</p>
                      </div>
                    ) : draft.published ? (
                      <div>
                        <p className="font-semibold text-[var(--wf-live)]">Dipublish</p>
                        <p>{formatDraftPublishedAt(draft.publishedAt)}</p>
                      </div>
                    ) : (
                      <p className="font-semibold text-red-700 dark:text-red-300">Dibatalkan</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {whatsappUrl ? (
                        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[var(--wf-live)]/30 px-2.5 py-1.5 text-xs font-medium text-[var(--wf-live)] transition hover:bg-[var(--wf-live)]/10">
                          <MessageCircle className="h-3.5 w-3.5" />WhatsApp
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--wf-ink-muted)]">Tidak ada nomor</span>
                      )}
                      {onRestore && !draft.published && (draft.deleted || draft.progress === 'cancel') && (
                        <button
                          onClick={() => onRestore(draft)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--wf-accent)] px-2.5 py-1.5 text-xs font-medium text-[var(--wf-accent)] transition hover:bg-[var(--wf-accent-soft)]"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />Pulihkan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
