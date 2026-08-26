import { Edit2, ExternalLink, MessageCircle, Trash2, Upload } from 'lucide-react';
import { DraftEventItem, DraftProgress } from '../types';
import { DraftProgressBadge } from './DraftProgressBadge';
import { getWhatsAppUrl } from '../utils/draftUtils';

interface Props {
  drafts: DraftEventItem[];
  onEdit: (draft: DraftEventItem) => void;
  onDelete: (draft: DraftEventItem) => void;
  onPublish: (draft: DraftEventItem) => void;
  onProgressChange: (draft: DraftEventItem, progress: DraftProgress) => void;
}

export function DraftQueueTable({ drafts, onEdit, onDelete, onPublish, onProgressChange }: Props) {
  if (drafts.length === 0) {
    return (
      <div className="ui-empty-panel p-8 text-sm text-slate-400">
        Belum ada draft event aktif.
      </div>
    );
  }

  return (
    <div className="ui-dashboard-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <caption className="sr-only">Tabel antrian draft event aktif</caption>
          <thead>
            <tr className="ui-dashboard-muted border-b border-black/[0.04] dark:border-slate-700">
              {['Tanggal', 'Event', 'Jam', 'EO', 'PIC', 'No. Telepon', 'Lokasi', 'Progress', 'Aksi'].map(label => (
                <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ui-text-muted">{label}</th>
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
                    {draft.keterangan && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{draft.keterangan}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{draft.jam || '–'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{draft.eo || '–'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{draft.pic}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{draft.phone}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{draft.lokasi}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <DraftProgressBadge progress={draft.progress} />
                      <select
                        value={draft.progress}
                        onChange={e => onProgressChange(draft, e.target.value as DraftProgress)}
                        className="ui-dashboard-control w-full rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none transition focus:border-brand-primary-400 dark:text-slate-300"
                      >
                        <option value="draft">Draft</option>
                        <option value="confirm">Confirm</option>
                        <option value="cancel">Cancel</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => onEdit(draft)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/20"><Edit2 className="h-3.5 w-3.5" />Edit</button>
                      <button onClick={() => onDelete(draft)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" />Hapus</button>
                       <button
                        type="button"
                        onClick={() => onPublish(draft)}
                        disabled={draft.progress !== 'confirm'}
                        title={draft.progress !== 'confirm' ? 'Set progress ke Confirm dulu sebelum publish' : 'Publish ke schedule utama'}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                      >
                        <Upload className="h-3.5 w-3.5" />Publish
                      </button>
                      {whatsappUrl && (
                        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-green-200 px-2.5 py-1.5 text-xs font-medium text-green-600 transition hover:bg-green-50 dark:border-green-900/50 dark:text-green-300 dark:hover:bg-green-900/20">
                          <MessageCircle className="h-3.5 w-3.5" />WhatsApp
                          <ExternalLink className="h-3 w-3" />
                        </a>
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
