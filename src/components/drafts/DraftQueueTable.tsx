import { Edit2, ExternalLink, MessageCircle, Trash2, Upload } from 'lucide-react';
import { DraftEventItem, DraftProgress } from '../../types';
import { DraftProgressBadge } from './DraftProgressBadge';
import { getWhatsAppUrl } from '../../utils/draftUtils';
import { Button } from '../shadcn/button';
import { NativeSelect } from '../shadcn/native-select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../shadcn/table';
import { Empty, EmptyDescription } from '../shadcn/empty';

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
      <div className="ui-empty-panel p-8">
        <Empty className="border-0 bg-transparent p-0">
          <EmptyDescription className="text-sm text-[var(--wf-ink-muted)]">Belum ada draft event aktif</EmptyDescription>
        </Empty>
      </div>
    );
  }

  return (
    <div className="ui-dashboard-surface overflow-hidden">
      <Table className="w-full min-w-[1100px] text-sm">
          <caption className="sr-only">Tabel antrian draft event aktif</caption>
          <TableHeader>
            <TableRow className="border-b border-[var(--wf-rule)] bg-[var(--wf-board-2)]">
              {['Tanggal', 'Event', 'Jam', 'Penyelenggara', 'Penanggung jawab', 'Nomor telepon', 'Lokasi', 'Progres', 'Aksi'].map(label => (
                <TableHead key={label} scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--wf-ink-muted)]">{label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[var(--wf-rule)]">
            {drafts.map(draft => {
              const whatsappUrl = getWhatsAppUrl(draft.phone);
              return (
                <TableRow key={draft.id} className="align-top hover:bg-[var(--wf-board-2)]">
                  <TableCell className="whitespace-nowrap px-4 py-3">
                    <div className="text-xs font-semibold text-[var(--wf-ink)]">{draft.day}</div>
                    <div className="text-xs text-[var(--wf-ink-muted)]">{draft.tanggal}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="font-semibold text-[var(--wf-ink)]">{draft.acara}</p>
                    {draft.keterangan && <p className="mt-1 line-clamp-2 text-xs text-[var(--wf-ink-muted)]">{draft.keterangan}</p>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.jam || '-'}</TableCell>
                  <TableCell className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.eo || '-'}</TableCell>
                  <TableCell className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.pic}</TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.phone}</TableCell>
                  <TableCell className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.lokasi}</TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="space-y-2">
                      <DraftProgressBadge progress={draft.progress} />
                      {onProgressChange && (
                        <NativeSelect
                          value={draft.progress}
                          onChange={e => onProgressChange(draft, e.target.value as DraftProgress)}
                          aria-label={`Progres ${draft.acara}`}
                        >
                          <option value="draft">Draf</option>
                          <option value="confirm">Konfirmasi</option>
                          <option value="cancel">Batal</option>
                        </NativeSelect>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {onEdit && <Button variant="outline" size="sm" onClick={() => onEdit(draft)}><Edit2 className="size-3.5" />Ubah</Button>}
                      {onDelete && <Button variant="outline" size="sm" onClick={() => onDelete(draft)} className="text-[var(--wf-danger)] hover:bg-[var(--wf-danger)]/10 hover:text-[var(--wf-danger)]"><Trash2 className="size-3.5" />Hapus</Button>}
                      {onPublish && <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPublish(draft)}
                        disabled={draft.progress !== 'confirm'}
                        title={draft.progress !== 'confirm' ? 'Set progress ke Konfirmasi dulu sebelum menerbitkan' : 'Terbitkan ke jadwal utama'}
                      >
                        <Upload className="size-3.5" />Terbitkan
                      </Button>}
                      {!canMutate && <span className="text-xs text-[var(--wf-ink-muted)]">-</span>}
                      {whatsappUrl && (
                        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[var(--wf-live)]/30 px-2.5 py-1.5 text-xs font-medium text-[var(--wf-live)] transition hover:bg-[var(--wf-live)]/10">
                          <MessageCircle className="h-3.5 w-3.5" />WhatsApp
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
    </div>
  );
}
