import { Archive, ChevronDown, ChevronUp, ClipboardList, Plus } from 'lucide-react';
import { DraftEventItem, EventItem } from '../types';
import { DraftHistoryTable } from './DraftHistoryTable';
import { DraftQueueTable } from './DraftQueueTable';

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
}: Props) {
  return (
    <section id="drafts" className="space-y-4 scroll-mt-32">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ui-dashboard-card-padded">
        <div className="flex items-start gap-3">
          <div className="ui-icon-tile bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--wf-ink)]">Queue Aktif Draft Event</p>
            <p className="text-xs text-[var(--wf-ink-muted)]">Antrian event yang masih diproses</p>
          </div>
        </div>
        {onAddDraft && (
          <button
            onClick={onAddDraft}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl ui-btn-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <Plus className="h-4 w-4" /> Tambah Draft Event
          </button>
        )}
      </div>

      {draftError && (
        <div role="alert" className="rounded-2xl border border-red-600/20 bg-red-600/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {draftError}
        </div>
      )}

      {isDraftLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--wf-board-2)]" />
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
        <button
          onClick={() => setShowDraftHistory(v => !v)}
          className="flex w-full items-center justify-between gap-3 text-left ui-focus-ring rounded-xl"
          aria-expanded={showDraftHistory}
          aria-controls="draft-history-content"
        >
          <div className="flex items-start gap-3">
            <div className="ui-icon-tile bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--wf-ink)]">Riwayat Draft Event</p>
              <p className="text-xs text-[var(--wf-ink-muted)]">Event yang dibatalkan atau sudah dipublikasikan</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--wf-ink-muted)]">
            <span>{draftHistory.length} item</span>
            {showDraftHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {showDraftHistory && (
          <div id="draft-history-content" className="mt-4">
            <DraftHistoryTable drafts={draftHistory} onRestore={onRestoreDraft} />
          </div>
        )}
      </div>
    </section>
  );
}
