import { useState, useCallback } from 'react';
import { DraftEventItem, ToastMessage } from '../types';
import { createId } from '../utils/eventUtils';
import { canPublishDraft } from '../utils/draftUtils';
import type { ConfirmOptions } from '../components/modals/ConfirmDialog';

type ShowToast = (type: ToastMessage['type'], title: string, message: string) => void;

export type DraftHandlersDeps = {
  showToast: ShowToast;
  draftEventsLength: number;
  addDraft: (draft: DraftEventItem) => Promise<boolean>;
  updateDraft: (draft: DraftEventItem) => Promise<boolean>;
  deleteDraft: (id: string) => Promise<boolean>;
  publishDraft: (id: string) => Promise<boolean>;
  restoreDraft: (id: string) => Promise<boolean>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  refreshEvents: () => Promise<void> | void;
};

export interface DraftHandlersResult {
  showDraftModal: boolean;
  setShowDraftModal: (v: boolean) => void;
  showDraftHistory: boolean;
  setShowDraftHistory: React.Dispatch<React.SetStateAction<boolean>>;
  editingDraft: DraftEventItem | null;
  setEditingDraft: (v: DraftEventItem | null) => void;
  handleAddDraft: () => void;
  handleEditDraft: (draft: DraftEventItem) => void;
  handleSaveDraft: (data: Partial<DraftEventItem>) => Promise<boolean>;
  handleDeleteDraft: (draft: DraftEventItem) => void;
  handlePublishDraft: (draft: DraftEventItem) => void;
  handleDraftProgressChange: (draft: DraftEventItem, progress: DraftEventItem['progress']) => void;
  handleRestoreDraft: (draft: DraftEventItem) => void;
}

export function useDraftHandlers(deps: DraftHandlersDeps): DraftHandlersResult {
  const { showToast, draftEventsLength, addDraft, updateDraft, deleteDraft, publishDraft, restoreDraft, confirm, refreshEvents } = deps;

  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showDraftHistory, setShowDraftHistory] = useState(false);
  const [editingDraft, setEditingDraft] = useState<DraftEventItem | null>(null);

  const handleAddDraft = useCallback(() => {
    setEditingDraft(null);
    setShowDraftModal(true);
  }, []);

  const handleEditDraft = useCallback((draft: DraftEventItem) => {
    setEditingDraft(draft);
    setShowDraftModal(true);
  }, []);

  const handleSaveDraft = useCallback(async (data: Partial<DraftEventItem>) => {
    let success = false;
    const isUpdate = Boolean(editingDraft?.id);
    if (isUpdate && editingDraft) {
      success = await updateDraft({ ...editingDraft, ...data } as DraftEventItem);
      if (success) showToast('success', 'Draf diperbarui', `"${data.acara}" berhasil diperbarui.`);
      else showToast('error', 'Gagal memperbarui draf', 'Perubahan draf belum tersimpan.');
    } else {
      const newDraft: DraftEventItem = {
        ...data as DraftEventItem, id: createId(), rowIndex: draftEventsLength + 1,
        progress: data.progress || 'draft', published: false, publishedAt: '',
        deleted: false, deletedAt: '',
      };
      success = await addDraft(newDraft);
      if (success) showToast('success', 'Draf ditambahkan', `"${data.acara}" masuk ke antrean draf.`);
      else showToast('error', 'Gagal menambahkan draf', 'Draf event belum tersimpan.');
    }
    if (success) { setShowDraftModal(false); setEditingDraft(null); }
    return success;
  }, [editingDraft, draftEventsLength, addDraft, updateDraft, showToast]);
  const handleDeleteDraft = useCallback(async (draft: DraftEventItem) => {
    const ok = await confirm({
      title: 'Hapus draf event?',
      message: 'Draf akan dipindahkan ke riwayat dan dapat dipulihkan dari sana.',
      subject: draft.acara,
    });
    if (!ok) return;
    const success = await deleteDraft(draft.id);
    if (success) showToast('success', 'Draf dipindahkan ke riwayat', `"${draft.acara}" ditandai sebagai dihapus.`);
    else showToast('error', 'Gagal menghapus draf', 'Draf event belum terhapus.');
  }, [confirm, deleteDraft, showToast]);

  const handlePublishDraft = useCallback(async (draft: DraftEventItem) => {
    if (draft.published) { showToast('warning', 'Sudah diterbitkan', 'Draf ini sudah diterbitkan.'); return; }
    if (draft.deleted) { showToast('warning', 'Draf terhapus', 'Pulihkan draf dulu sebelum menerbitkan.'); return; }
    if (!canPublishDraft(draft)) { showToast('warning', 'Belum bisa terbitkan', 'Draf harus berstatus Konfirmasi sebelum diterbitkan.'); return; }
    const ok = await confirm({
      title: 'Terbitkan draf?',
      message: 'Draf akan diterbitkan ke jadwal event resmi dan bisa dilihat publik.',
      subject: draft.acara,
      confirmLabel: 'Terbitkan',
    });
    if (!ok) return;
    const success = await publishDraft(draft.id);
    if (success) {
      await refreshEvents();
      showToast('success', 'Draf diterbitkan', `"${draft.acara}" sudah jadi event di jadwal resmi.`);
    } else {
      showToast('error', 'Gagal menerbitkan draf', 'Draf belum berhasil diterbitkan ke jadwal event.');
    }
  }, [confirm, publishDraft, refreshEvents, showToast]);

  const handleDraftProgressChange = useCallback(async (draft: DraftEventItem, progress: DraftEventItem['progress']) => {
    const success = await updateDraft({ ...draft, progress });
    if (success) showToast('success', 'Progres diperbarui', `Draft "${draft.acara}" sekarang berstatus ${progress}.`);
    else showToast('error', 'Gagal memperbarui progres', 'Progres draf belum berubah.');
  }, [updateDraft, showToast]);

  const handleRestoreDraft = useCallback(async (draft: DraftEventItem) => {
    if (draft.published) { showToast('warning', 'Tidak bisa dipulihkan', 'Draf yang sudah diterbitkan tidak dapat dipulihkan.'); return; }
    const ok = await confirm({
      title: 'Pulihkan draf event?',
      message: 'Draf akan dikembalikan ke antrean aktif.',
      subject: draft.acara,
      confirmLabel: 'Pulihkan',
    });
    if (!ok) return;
    const success = await restoreDraft(draft.id);
    if (success) showToast('success', 'Draf dipulihkan', `"${draft.acara}" kembali ke antrean aktif.`);
    else showToast('error', 'Gagal memulihkan draf', 'Draf event belum berhasil dipulihkan.');
  }, [confirm, restoreDraft, showToast]);

  return {
    showDraftModal, setShowDraftModal,
    showDraftHistory, setShowDraftHistory,
    editingDraft, setEditingDraft,
    handleAddDraft, handleEditDraft, handleSaveDraft,
    handleDeleteDraft, handlePublishDraft,
    handleDraftProgressChange, handleRestoreDraft,
  };
}