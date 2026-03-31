import { useCallback, useEffect, useMemo, useState } from 'react';
import { DraftEventItem } from '../types';
import {
  fetchDraftEvents,
  createDraftEvent as apiCreateDraft,
  updateDraftEvent as apiUpdateDraft,
  deleteDraftEvent as apiDeleteDraft,
  publishDraftEvent as apiPublishDraft,
} from '../utils/sheetsApi';
import { sortDraftActive, sortDraftHistory } from '../utils/draftUtils';

export function useDraftEvents() {
  const [draftEvents, setDraftEvents] = useState<DraftEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDrafts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const drafts = await fetchDraftEvents();
      setDraftEvents(drafts);
    } catch (err) {
      console.error('Draft fetch error:', err);
      setError('Gagal memuat draft event.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  const activeDrafts = useMemo(
    () => draftEvents
      .filter(draft => !draft.published && !draft.deleted && (draft.progress === 'draft' || draft.progress === 'confirm'))
      .sort(sortDraftActive),
    [draftEvents]
  );

  const draftHistory = useMemo(
    () => draftEvents
      .filter(draft => draft.published || draft.deleted || draft.progress === 'cancel')
      .sort(sortDraftHistory),
    [draftEvents]
  );

  const addDraft = useCallback(async (draft: DraftEventItem): Promise<boolean> => {
    const tempId = draft.id;
    setDraftEvents(prev => [draft, ...prev]);
    try {
      const { id, sheetRow, rowIndex, published, publishedAt, deleted, deletedAt, ...apiData } = draft;
      const row = await apiCreateDraft(apiData);
      setDraftEvents(prev => prev.map(item => item.id === tempId ? { ...item, sheetRow: row } : item));
      return true;
    } catch (err) {
      console.error('Error adding draft:', err);
      setDraftEvents(prev => prev.filter(item => item.id !== tempId));
      return false;
    }
  }, []);

  const updateDraft = useCallback(async (draft: DraftEventItem): Promise<boolean> => {
    const previous = draftEvents.find(item => item.id === draft.id);
    setDraftEvents(prev => prev.map(item => item.id === draft.id ? draft : item));
    if (!draft.sheetRow) return true;

    try {
      await apiUpdateDraft(draft as DraftEventItem & { sheetRow: number });
      return true;
    } catch (err) {
      console.error('Error updating draft:', err);
      if (previous) {
        setDraftEvents(prev => prev.map(item => item.id === draft.id ? previous : item));
      }
      return false;
    }
  }, [draftEvents]);

  const deleteDraft = useCallback(async (id: string): Promise<boolean> => {
    const target = draftEvents.find(item => item.id === id);
    if (!target) return false;

    const deletedAt = new Date().toISOString();
    const deletedNote = `Dihapus admin pada ${new Date(deletedAt).toLocaleString('id-ID')}`;
    const nextTarget: DraftEventItem = {
      ...target,
      progress: 'cancel',
      deleted: true,
      deletedAt,
      keterangan: target.keterangan ? `${target.keterangan} | ${deletedNote}` : deletedNote,
    };

    setDraftEvents(prev => prev.map(item => item.id === id ? nextTarget : item));
    if (!target?.sheetRow) return true;

    try {
      await apiDeleteDraft(target.sheetRow);
      return true;
    } catch (err) {
      console.error('Error deleting draft:', err);
      setDraftEvents(prev => prev.map(item => item.id === id ? target : item));
      return false;
    }
  }, [draftEvents]);

  const publishDraft = useCallback(async (id: string): Promise<boolean> => {
    const target = draftEvents.find(item => item.id === id);
    if (!target?.sheetRow) return false;

    try {
      await apiPublishDraft(target.sheetRow);
      const publishedAt = new Date().toISOString();
      setDraftEvents(prev => prev.map(item => item.id === id ? {
        ...item,
        progress: 'confirm',
        published: true,
        publishedAt,
        deleted: false,
        deletedAt: '',
      } : item));
      return true;
    } catch (err) {
      console.error('Error publishing draft:', err);
      return false;
    }
  }, [draftEvents]);

  return {
    draftEvents,
    activeDrafts,
    draftHistory,
    isLoading,
    error,
    refreshDrafts,
    addDraft,
    updateDraft,
    deleteDraft,
    publishDraft,
  };
}
