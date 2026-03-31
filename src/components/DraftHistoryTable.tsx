import { ExternalLink, MessageCircle } from 'lucide-react';
import { DraftEventItem } from '../types';
import { DraftProgressBadge } from './DraftProgressBadge';
import { formatDraftPublishedAt, getWhatsAppUrl } from '../utils/draftUtils';

export function DraftHistoryTable({ drafts }: { drafts: DraftEventItem[] }) {
  if (drafts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/40">
        Belum ada riwayat draft event.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              {['Tanggal', 'Event', 'EO', 'PIC', 'Nomor Telepon', 'Progress', 'Status Histori', 'Follow Up'].map(label => (
                <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {drafts.map(draft => {
              const whatsappUrl = getWhatsAppUrl(draft.phone);
              return (
                <tr key={draft.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-700/20">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{draft.day}</div>
                    <div className="text-xs text-slate-400">{draft.tanggal}</div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800 dark:text-white">{draft.acara}</p>
                    <p className="mt-1 text-xs text-slate-400">{draft.lokasi}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{draft.eo || '–'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{draft.pic}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{draft.phone}</td>
                  <td className="px-4 py-3"><DraftProgressBadge progress={draft.progress} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {draft.deleted ? (
                      <div>
                        <p className="font-semibold text-rose-600 dark:text-rose-300">Deleted</p>
                        <p>{formatDraftPublishedAt(draft.deletedAt)}</p>
                      </div>
                    ) : draft.published ? (
                      <div>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-300">Published</p>
                        <p>{formatDraftPublishedAt(draft.publishedAt)}</p>
                      </div>
                    ) : (
                      <p className="font-semibold text-rose-600 dark:text-rose-300">Cancelled</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {whatsappUrl ? (
                      <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-green-200 px-2.5 py-1.5 text-xs font-medium text-green-600 transition hover:bg-green-50 dark:border-green-900/50 dark:text-green-300 dark:hover:bg-green-900/20">
                        <MessageCircle className="h-3.5 w-3.5" />WhatsApp
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Tidak ada nomor</span>
                    )}
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
