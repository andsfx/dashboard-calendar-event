import { ExternalLink, MessageCircle, RotateCcw } from 'lucide-react';
import { DraftEventItem } from '../../types';
import { DraftProgressBadge } from './DraftProgressBadge';
import { formatDraftPublishedAt, getWhatsAppUrl } from '../../utils/draftUtils';
import { Button } from '../shadcn/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../shadcn/table';
import { Empty, EmptyDescription } from '../shadcn/empty';

export function DraftHistoryTable({ drafts, onRestore }: { drafts: DraftEventItem[]; onRestore?: (draft: DraftEventItem) => void }) {
  if (drafts.length === 0) {
    return (
      <div className="ui-empty-panel p-6">
        <Empty className="border-0 bg-transparent p-0">
          <EmptyDescription className="text-sm text-[var(--wf-ink-muted)]">Belum ada riwayat draft event</EmptyDescription>
        </Empty>
      </div>
    );
  }

  return (
    <div className="ui-dashboard-surface overflow-hidden">
      <Table className="w-full min-w-[980px] text-sm">
          <TableHeader>
            <TableRow className="border-b border-[var(--wf-rule)] bg-[var(--wf-board-2)]">
              {['Tanggal', 'Event', 'EO', 'PIC', 'Nomor Telepon', 'Progress', 'Status Histori', 'Follow Up'].map(label => (
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
                    <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">{draft.lokasi}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.eo || '-'}</TableCell>
                  <TableCell className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.pic}</TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-[var(--wf-ink-muted)]">{draft.phone}</TableCell>
                  <TableCell className="px-4 py-3"><DraftProgressBadge progress={draft.progress} /></TableCell>
                  <TableCell className="px-4 py-3 text-xs text-[var(--wf-ink-muted)]">
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
                  </TableCell>
                  <TableCell className="px-4 py-3">
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
                        <Button variant="outline" size="sm" onClick={() => onRestore(draft)}>
                          <RotateCcw className="size-3.5" />Pulihkan
                        </Button>
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
