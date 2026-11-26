import { Archive, ChevronDown, ChevronUp, ClipboardList, Plus } from 'lucide-react';
import { DraftEventItem, EventItem } from '../../types';
import { DraftHistoryTable } from './DraftHistoryTable';
import { DraftQueueTable } from './DraftQueueTable';
import { Button } from '../shadcn/button';
import { Skeleton } from '../shadcn/skeleton';

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ui-dashboard-card-padded">
        <div className="flex items-start gap-3">
          <div className="ui-icon-tile bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-[var(--wf-ink)]">Queue Aktif Draft Event</p>
              <span className="rounded-full bg-[var(--wf-board-2)] px-2 py-0.5 text-xs font-semibold text-[var(--wf-ink-muted)]">
                {activeDrafts.length} draft
              </span>
            </div>
            <p className="text-xs text-[var(--wf-ink-muted)]">Antrian event yang masih diproses</p>
          </div>
        </div>
        {onAddDraft && (
          <Button onClick={onAddDraft} className="shrink-0">
            <Plus className="size-4" /> Tambah Draft Event
          </Button>
        )}
      </div>

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
      ) : (
        <DraftQueueTable
          drafts={activeDrafts}
          onEdit={onEditDraft}
          onDelete={onDeleteDraft}
          onPublish={onPublishDraft}
          onProgressChange={onDraftProgressChange}
        />
      )}

      <div className="ui-dashboard-card-padded">
        {/* Baris disclosure full-width (ikon + dua blok teks + jumlah item +
            chevron) dengan `justify-between`: shadcn `Button` ghost + chrome
            primitif dinetralkan (`p-0!`/`border-0!`/`h-auto!` mematikan
            px-2.5/h-8/border-transparent), sementara `justify-between` dan
            kelas asli dipertahankan. `hover:*`/`aria-expanded:*` shadcn
            dibatalkan karena baris ini tidak punya latar sendiri. */}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowDraftHistory(v => !v)}
          className="flex! h-auto! w-full! items-center justify-between! gap-3 whitespace-normal! rounded-xl border-0! p-0! text-left! font-normal! hover:bg-transparent! dark:hover:bg-transparent! aria-expanded:bg-transparent! ui-focus-ring focus-visible:ring-0 active:translate-y-0!"
          aria-expanded={showDraftHistory}
          aria-controls="draft-history-content"
        >
          <div className="flex items-start gap-3">
            <div className="ui-icon-tile bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]">
              <Archive className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--wf-ink)]">Riwayat Draft Event</p>
              <p className="text-xs text-[var(--wf-ink-muted)]">Event yang dibatalkan atau sudah dipublikasikan</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--wf-ink-muted)]">
            <span>{draftHistory.length} item</span>
            {showDraftHistory ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </div>
        </Button>

        {/* Kontainer selalu ada di DOM: `aria-controls` menunjuk id ini, dan
            id yang hilang saat tertutup memicu axe `aria-valid-attr-value`. */}
        <div id="draft-history-content" className="mt-4" hidden={!showDraftHistory}>
          <DraftHistoryTable drafts={draftHistory} onRestore={onRestoreDraft} />
        </div>
      </div>
    </section>
  );
}
