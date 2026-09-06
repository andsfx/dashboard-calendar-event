import { useState, useCallback } from 'react';
import { DraftEventItem, ToastMessage } from '../types';
import { createId } from '../utils/eventUtils';
import { canPublishDraft } from '../utils/draftUtils';
import type { ConfirmOptions } from '../components/ConfirmDialog';

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
      if (success) showToast('success', 'Draft diperbarui', `"${data.acara}" berhasil diperbarui.`);
      else showToast('error', 'Gagal memperbarui draft', 'Perubahan draft belum tersimpan.');
    } else {
      const newDraft: DraftEventItem = {
        ...data as DraftEventItem, id: createId(), rowIndex: draftEventsLength + 1,
        progress: data.progress || 'draft', published: false, publishedAt: '',
        deleted: false, deletedAt: '',
      };
      success = await addDraft(newDraft);
      if (success) showToast('success', 'Draft ditambahkan', `"${data.acara}" masuk ke antrian Draft.`);
      else showToast('error', 'Gagal menambahkan draft', 'Draft event belum tersimpan.');
    }
    if (success) { setShowDraftModal(false); setEditingDraft(null); }
    return success;
  }, [editingDraft, draftEventsLength, addDraft, updateDraft, showToast]);
  const handleDeleteDraft = useCallback(async (draft: DraftEventItem) => {
    const ok = await confirm({
      title: 'Hapus draft event?',
      message: 'Draft akan dipindahkan ke riwayat dan dapat dipulihkan dari sana.',
      subject: draft.acara,
    });
    if (!ok) return;
    const success = await deleteDraft(draft.id);
    if (success) showToast('success', 'Draft dipindahkan ke riwayat', `"${draft.acara}" ditandai sebagai dihapus.`);
    else showToast('error', 'Gagal menghapus draft', 'Draft event belum terhapus.');
  }, [confirm, deleteDraft, showToast]);

  const handlePublishDraft = useCallback(async (draft: DraftEventItem) => {
    if (draft.published) { showToast('warning', 'Sudah diterbitkan', 'Draft ini sudah diterbitkan.'); return; }
    if (draft.deleted) { showToast('warning', 'Draft terhapus', 'Pulihkan draft dulu sebelum menerbitkan.'); return; }
    if (!canPublishDraft(draft)) { showToast('warning', 'Belum bisa terbitkan', 'Draft harus berstatus Konfirmasi sebelum diterbitkan.'); return; }
    const ok = await confirm({
      title: 'Terbitkan draft?',
      message: 'Draft akan diterbitkan ke jadwal Event resmi dan bisa dilihat publik.',
      subject: draft.acara,
      confirmLabel: 'Terbitkan',
    });
    if (!ok) return;
    const success = await publishDraft(draft.id);
    if (success) {
      await refreshEvents();
      showToast('success', 'Draft diterbitkan', `"${draft.acara}" sudah jadi Event di jadwal resmi.`);
    } else {
      showToast('error', 'Gagal menerbitkan draft', 'Draft belum berhasil diterbitkan ke jadwal Event.');
    }
  }, [confirm, publishDraft, refreshEvents, showToast]);

  const handleDraftProgressChange = useCallback(async (draft: DraftEventItem, progress: DraftEventItem['progress']) => {
    const success = await updateDraft({ ...draft, progress });
    if (success) showToast('success', 'Progress diperbarui', `Draft "${draft.acara}" sekarang berstatus ${progress}.`);
    else showToast('error', 'Gagal memperbarui progress', 'Progress draft belum berubah.');
  }, [updateDraft, showToast]);

  const handleRestoreDraft = useCallback(async (draft: DraftEventItem) => {
    if (draft.published) { showToast('warning', 'Tidak bisa dipulihkan', 'Draft yang sudah diterbitkan tidak dapat dipulihkan.'); return; }
    const ok = await confirm({
      title: 'Pulihkan draft event?',
      message: 'Draft akan dikembalikan ke queue aktif.',
      subject: draft.acara,
      confirmLabel: 'Pulihkan',
    });
    if (!ok) return;
    const success = await restoreDraft(draft.id);
    if (success) showToast('success', 'Draft dipulihkan', `"${draft.acara}" kembali ke queue aktif.`);
    else showToast('error', 'Gagal memulihkan draft', 'Draft event belum berhasil dipulihkan.');
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