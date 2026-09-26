import { Edit2, ExternalLink, MessageCircle, Trash2, Upload } from 'lucide-react';
import { DraftEventItem, DraftProgress } from '../../types';
import { DraftProgressBadge } from './DraftProgressBadge';
import { getWhatsAppUrl } from '../../utils/draftUtils';

interface Props {
  drafts: DraftEventItem[];
  /** Opsional: tanpa callback, aksi mutasi disembunyikan (mode lihat-saja). */
  onEdit?: (draft: DraftEventItem) => void;
  onDelete?: (draft: DraftEventItem) => void;
  onPublish?: (draft: DraftEventItem) => void;
  onProgressChange?: (draft: DraftEventItem, progress: DraftProgress) => void;
}

export function DraftQueueTable({ drafts, onEdit, onDelete, onPublish, onProgressChange }: Props) {
  const canMutate = !!(onEdit || onDelete || onPublish || onProgressChange);
  if (drafts.length === 0) {
    return (
      <div className="ui-empty-panel p-8 text-sm text-[var(--wf-ink-muted)]">
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
            <tr className="border-b border-[var(--wf-rule)] bg-[var(--wf-board-2)]">
              {['Tanggal', 'Event', 'Jam', 'EO', 'PIC', 'No. Telepon', 'Lokasi', 'Progress', 'Aksi'].map(label => (
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
                    {draft.keterangan && <p className="mt-1 line-clamp-2 text-xs text-[var(--wf-ink-muted)]">{draft.keterangan}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.jam || '-'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.eo || '-'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.pic}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.phone}</td>
                  <td className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.lokasi}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <DraftProgressBadge progress={draft.progress} />
                      {onProgressChange && (
                        <select
                          value={draft.progress}
                          onChange={e => onProgressChange(draft, e.target.value as DraftProgress)}
                          aria-label={`Progress ${draft.acara}`}
                          className="ui-dashboard-control w-full rounded-lg px-2.5 py-1.5 text-xs text-[var(--wf-ink)] outline-none transition focus:border-[var(--wf-accent)]"
                        >
                          <option value="draft">Draft</option>
                          <option value="confirm">Konfirmasi</option>
                          <option value="cancel">Batal</option>
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {onEdit && <button onClick={() => onEdit(draft)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--wf-accent)] px-2.5 py-1.5 text-xs font-medium text-[var(--wf-accent)] transition hover:bg-[var(--wf-accent-soft)]"><Edit2 className="h-3.5 w-3.5" />Ubah</button>}
                      {onDelete && <button onClick={() => onDelete(draft)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-600/10 dark:border-red-800 dark:text-red-300"><Trash2 className="h-3.5 w-3.5" />Hapus</button>}
                      {onPublish && <button
                        type="button"
                        onClick={() => onPublish(draft)}
                        disabled={draft.progress !== 'confirm'}
                        title={draft.progress !== 'confirm' ? 'Set progress ke Konfirmasi dulu sebelum menerbitkan' : 'Terbitkan ke jadwal utama'}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--wf-live)]/30 px-2.5 py-1.5 text-xs font-medium text-[var(--wf-live)] transition hover:bg-[var(--wf-live)]/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Upload className="h-3.5 w-3.5" />Terbitkan
                      </button>}
                      {!canMutate && <span className="text-xs text-[var(--wf-ink-muted)]">-</span>}
                      {whatsappUrl && (
                        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[var(--wf-live)]/30 px-2.5 py-1.5 text-xs font-medium text-[var(--wf-live)] transition hover:bg-[var(--wf-live)]/10">
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
