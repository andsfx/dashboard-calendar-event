import { Edit2, ExternalLink, MessageCircle, Trash2, Upload } from 'lucide-react';
import { DraftEventItem, DraftProgress } from '../../types';
import { DraftProgressBadge } from './DraftProgressBadge';
import { getWhatsAppUrl } from '../../utils/draftUtils';
import { MdButton, MdSelect } from '../md';

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
                        <MdSelect
                          value={draft.progress}
                          onChange={v => onProgressChange(draft, v as DraftProgress)}
                          ariaLabel={`Progress ${draft.acara}`}
                          options={[
                            { value: 'draft', label: 'Draft' },
                            { value: 'confirm', label: 'Konfirmasi' },
                            { value: 'cancel', label: 'Batal' },
                          ]}
                          className="w-full"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {onEdit && <MdButton variant="outlined" onClick={() => onEdit(draft)}><Edit2 className="h-3.5 w-3.5" />Ubah</MdButton>}
                      {onDelete && <MdButton variant="outlined" danger onClick={() => onDelete(draft)}><Trash2 className="h-3.5 w-3.5" />Hapus</MdButton>}
                      {onPublish && <MdButton
                        variant="outlined"
                        onClick={() => onPublish(draft)}
                        disabled={draft.progress !== 'confirm'}
                        title={draft.progress !== 'confirm' ? 'Set progress ke Konfirmasi dulu sebelum menerbitkan' : 'Terbitkan ke jadwal utama'}
                      >
                        <Upload className="h-3.5 w-3.5" />Terbitkan
                      </MdButton>}
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
