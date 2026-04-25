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
  onAddDraft: () => void;
  onEditDraft: (draft: DraftEventItem) => void;
  onDeleteDraft: (draft: DraftEventItem) => void;
  onPublishDraft: (draft: DraftEventItem) => void;
  onDraftProgressChange: (draft: DraftEventItem, progress: DraftEventItem['progress']) => void;
  onRestoreDraft: (draft: DraftEventItem) => void;
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">Queue Aktif Draft Event</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Antrian event yang masih diproses</p>
          </div>
        </div>
        <button
          onClick={onAddDraft}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 dark:shadow-violet-900/30"
        >
          <Plus className="h-4 w-4" /> Tambah Draft Event
        </button>
      </div>

      {draftError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300">
          {draftError}
        </div>
      )}

      {isDraftLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-200 dark:bg-slate-700" />
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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <button
          onClick={() => setShowDraftHistory(v => !v)}
          className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 rounded-xl dark:focus-visible:ring-offset-slate-800"
          aria-expanded={showDraftHistory}
          aria-controls="draft-history-content"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">Riwayat Draft Event</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Event yang dibatalkan atau sudah dipublikasikan</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
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
