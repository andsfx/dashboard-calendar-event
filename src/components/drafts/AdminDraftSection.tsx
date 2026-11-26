import { Plus } from 'lucide-react';
import { DraftEventItem, EventItem } from '../../types';
import { DraftHistoryTable } from './DraftHistoryTable';
import { DraftQueueTable } from './DraftQueueTable';
import { Button } from '../shadcn/button';
import { Skeleton } from '../shadcn/skeleton';
import { Toggle } from '../shadcn/toggle';

interface Props {
  activeDrafts: DraftEventItem[];
  draftHistory: DraftEventItem[];
  draftError: string | null;
  isDraftLoading: boolean;
  showDraftHistory: boolean;
  setShowDraftHistory: React.Dispatch<React.SetStateAction<boolean>>;
  /** Opsional: tanpa callback, aksi mutasi disembunyikan (mode lihat-saja). */
  onAddDraft?: () => void;
  onEditDraft?: (draft: DraftEventItem) => void;
  onDeleteDraft?: (draft: DraftEventItem) => void;
  onPublishDraft?: (draft: DraftEventItem) => void;
  onDraftProgressChange?: (draft: DraftEventItem, progress: DraftEventItem['progress']) => void;
  onRestoreDraft?: (draft: DraftEventItem) => void;
  /** Muat ulang antrean setelah galat. */
  onRetry?: () => void;
}

export function AdminDraftSection({
  activeDrafts,
  draftHistory,
  draftError,
  isDraftLoading,
  showDraftHistory,
  setShowDraftHistory,
  onAddDraft,
  onEditDraft,
  onDeleteDraft,
  onPublishDraft,
  onDraftProgressChange,
  onRestoreDraft,
  onRetry,
}: Props) {
  return (
    <section id="drafts" className="space-y-4 scroll-mt-32">
      {/* Tab kelompok draft mengikuti prototipe: satu baris di atas panel,
          jumlah item di dalam tab. Kelompok memakai `Toggle` (aria-pressed),
          bukan Tabs Radix: tidak ada `TabsContent`, jadi `role="tab"` +
          `aria-controls` akan menjanjikan panel yang tidak pernah ada. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Kelompok draft" className="flex items-center gap-1.5">
          <Toggle
            variant="outline"
            size="sm"
            pressed={!showDraftHistory}
            onPressedChange={pressed => { if (pressed) setShowDraftHistory(false); }}
            className="min-h-11 gap-2 rounded-full px-3 text-[var(--wf-ink-muted)] data-[state=on]:border-[var(--wf-accent)] data-[state=on]:bg-[var(--wf-accent-soft)] data-[state=on]:text-[var(--wf-accent)] aria-pressed:border-[var(--wf-accent)] aria-pressed:bg-[var(--wf-accent-soft)] aria-pressed:text-[var(--wf-accent)] sm:min-h-8"
          >
            Aktif
            <span className="rounded-full bg-[var(--wf-board-2)] px-1.5 text-[11px] font-semibold tabular-nums">{activeDrafts.length}</span>
          </Toggle>
          <Toggle
            variant="outline"
            size="sm"
            pressed={showDraftHistory}
            onPressedChange={pressed => { if (pressed) setShowDraftHistory(true); }}
            className="min-h-11 gap-2 rounded-full px-3 text-[var(--wf-ink-muted)] data-[state=on]:border-[var(--wf-accent)] data-[state=on]:bg-[var(--wf-accent-soft)] data-[state=on]:text-[var(--wf-accent)] aria-pressed:border-[var(--wf-accent)] aria-pressed:bg-[var(--wf-accent-soft)] aria-pressed:text-[var(--wf-accent)] sm:min-h-8"
          >
            Riwayat
            <span className="rounded-full bg-[var(--wf-board-2)] px-1.5 text-[11px] font-semibold tabular-nums">{draftHistory.length}</span>
          </Toggle>
        </div>
        {onAddDraft && (
          <Button onClick={onAddDraft} className="shrink-0">
            <Plus className="size-4" /> Tambah Draft Event
          </Button>
        )}
      </div>

      <p className="rounded-[var(--wf-radius-control)] bg-[var(--wf-board-2)] px-3 py-2 text-xs text-[var(--wf-ink-muted)]">
        {showDraftHistory
          ? 'Draft yang dihapus dapat dipulihkan. Event yang sudah diterbitkan tetap berada di Jadwal event.'
          : 'Menyimpan perubahan tidak menerbitkan event. Hanya draft Dikonfirmasi yang dapat diterbitkan.'}
      </p>

      {draftError && (
        <div role="alert" className="rounded-2xl border border-red-600/20 bg-red-600/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="min-w-0 flex-1">{draftError}</span>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>Coba lagi</Button>
            )}
          </div>
        </div>
      )}

      {isDraftLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl bg-[var(--wf-board-2)]" />
          ))}
        </div>
      ) : showDraftHistory ? (
        <DraftHistoryTable drafts={draftHistory} onRestore={onRestoreDraft} />
      ) : (
        <DraftQueueTable
          drafts={activeDrafts}
          onEdit={onEditDraft}
          onDelete={onDeleteDraft}
          onPublish={onPublishDraft}
          onProgressChange={onDraftProgressChange}
        />
      )}
    </section>
  );
}
