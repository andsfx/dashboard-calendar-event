import { useState, useCallback } from 'react';
import { EventItem, ToastMessage } from '../types';
import { createId } from '../utils/eventUtils';

type ShowToast = (type: ToastMessage['type'], title: string, message: string) => void;

export type EventHandlersDeps = {
  showToast: ShowToast;
  eventsLength: number;
  addEvent: (event: EventItem) => Promise<boolean>;
  updateEvent: (event: EventItem) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  addRecurringEvents: (events: EventItem[]) => Promise<boolean>;
  deleteRecurringSeries: (groupId: string) => Promise<boolean>;
};

export interface EventHandlersResult {
  showCrudModal: boolean;
  setShowCrudModal: (v: boolean) => void;
  showDeleteModal: boolean;
  setShowDeleteModal: (v: boolean) => void;
  showDetailModal: boolean;
  setShowDetailModal: (v: boolean) => void;
  editingEvent: EventItem | null;
  setEditingEvent: (v: EventItem | null) => void;
  deletingEvent: EventItem | null;
  setDeletingEvent: (v: EventItem | null) => void;
  detailEvent: EventItem | null;
  setDetailEvent: (v: EventItem | null) => void;
  initialEventData: Partial<EventItem> | null;
  setInitialEventData: (v: Partial<EventItem> | null) => void;
  handleAddNew: () => void;
  handleEdit: (ev: EventItem) => void;
  handleSave: (data: Partial<EventItem>) => Promise<boolean>;
  handleSaveBatch: (evs: EventItem[]) => Promise<boolean>;
  handleDeleteClick: (ev: EventItem) => void;
  handleDeleteConfirm: () => Promise<boolean>;
  handleDeleteSeries: (groupId: string) => Promise<boolean>;
  handleDetailClick: (ev: EventItem) => void;
}

export function useEventHandlers(deps: EventHandlersDeps): EventHandlersResult {
  const { showToast, eventsLength, addEvent, updateEvent, deleteEvent, addRecurringEvents, deleteRecurringSeries } = deps;

  const [showCrudModal, setShowCrudModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventItem | null>(null);
  const [initialEventData, setInitialEventData] = useState<Partial<EventItem> | null>(null);

  const handleAddNew = useCallback(() => {
    setEditingEvent(null);
    setInitialEventData(null);
    setShowCrudModal(true);
  }, []);

  const handleEdit = useCallback((ev: EventItem) => {
    setEditingEvent(ev);
    setShowCrudModal(true);
  }, []);

  const handleSave = useCallback(async (data: Partial<EventItem>) => {
    let success = false;
    if (editingEvent) {
      success = await updateEvent({ ...editingEvent, ...data } as EventItem);
      if (success) showToast('success', 'Berhasil diperbarui!', `"${data.acara}" telah diperbarui.`);
      else showToast('error', 'Gagal memperbarui', 'Perubahan belum tersimpan. Silakan coba lagi.');
    } else {
      const newEv: EventItem = { ...data as EventItem, id: createId(), rowIndex: eventsLength + 1 };
      success = await addEvent(newEv);
      if (success) showToast('success', 'Acara ditambahkan!', `"${data.acara}" berhasil ditambahkan.`);
      else showToast('error', 'Gagal menambahkan', 'Acara belum tersimpan. Silakan periksa koneksi lalu coba lagi.');
    }
    if (success) {
      setShowCrudModal(false);
      setEditingEvent(null);
      setInitialEventData(null);
    }
    return success;
  }, [editingEvent, eventsLength, addEvent, updateEvent, showToast]);

  const handleSaveBatch = useCallback(async (evs: EventItem[]) => {
    const success = await addRecurringEvents(evs);
    if (success) showToast('success', 'Event reguler ditambahkan!', `${evs.length} event berhasil dibuat.`);
    else showToast('error', 'Gagal menambahkan', 'Event reguler belum tersimpan. Silakan coba lagi.');
    if (success) { setShowCrudModal(false); setEditingEvent(null); setInitialEventData(null); }
    return success;
  }, [addRecurringEvents, showToast]);

  const handleDeleteClick = useCallback((ev: EventItem) => {
    setDeletingEvent(ev);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingEvent) return false;
    const success = await deleteEvent(deletingEvent.id);
    if (success) showToast('success', 'Acara dihapus!', `"${deletingEvent.acara}" telah dihapus.`);
    setDeletingEvent(null);
    setShowDeleteModal(false);
    if (!success) showToast('error', 'Gagal menghapus', 'Acara belum berhasil dihapus.');
    return success;
  }, [deletingEvent, deleteEvent, showToast]);

  const handleDeleteSeries = useCallback(async (groupId: string) => {
    const success = await deleteRecurringSeries(groupId);
    if (success) showToast('success', 'Rangkaian dihapus!', 'Seluruh event dalam rangkaian telah dihapus.');
    else showToast('error', 'Gagal menghapus', 'Rangkaian belum berhasil dihapus.');
    setShowDetailModal(false);
    setDetailEvent(null);
    return success;
  }, [deleteRecurringSeries, showToast]);

  const handleDetailClick = useCallback((ev: EventItem) => {
    setDetailEvent(ev);
    setShowDetailModal(true);
  }, []);

  return {
    showCrudModal, setShowCrudModal,
    showDeleteModal, setShowDeleteModal,
    showDetailModal, setShowDetailModal,
    editingEvent, setEditingEvent,
    deletingEvent, setDeletingEvent,
    detailEvent, setDetailEvent,
    initialEventData, setInitialEventData,
    handleAddNew, handleEdit, handleSave, handleSaveBatch,
    handleDeleteClick, handleDeleteConfirm, handleDeleteSeries, handleDetailClick,
  };
}