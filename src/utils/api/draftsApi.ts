import {
  adminAction,
  draftItemToDbRow,
} from './_shared';
import { apiPost, ApiError } from '../../lib/rest';
import type { DraftEventItem } from '../../types';

export async function createDraftEvent(
  draftData: Omit<DraftEventItem, 'id' | 'sheetRow' | 'rowIndex' | 'published' | 'publishedAt' | 'deleted' | 'deletedAt'>,
  proxyKind: 'admin' | 'public' = 'admin'
): Promise<{ row: number; id: string }> {
  if (proxyKind === 'public') {
    // POST /drafts publik — insert tanpa RETURNING (mirror alur RLS
    // anon insert-only legacy; publik tidak butuh id). Data dikirim via
    // adminAction-style { data } agar server zod menerima.
    try {
      await apiPost<{ success: boolean; error?: string }>('/drafts', { data: draftItemToDbRow(draftData) });
    } catch (err) {
      if (err instanceof ApiError) {
        throw new ApiError(err.message ?? 'Gagal membuat draft');
      }
      throw err;
    }
    return { row: 0, id: '' };
  }
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createDraft', { data: draftItemToDbRow(draftData) });
  if (!result.success) throw new ApiError(result.error || 'Gagal membuat draft');
  return { row: 0, id: result.id || '' };
}

export async function updateDraftEvent(draftData: Partial<DraftEventItem> & { id: string }): Promise<void> {
  const { id, ...rest } = draftData;
  const result = await adminAction<{ success: boolean; error?: string }>('updateDraft', { id, data: draftItemToDbRow(rest) });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui draft');
}

export async function deleteDraftEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteDraft', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus draft');
}

export async function publishDraftEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('publishDraft', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menerbitkan draft');
}

export async function restoreDraftEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('restoreDraft', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal memulihkan draft');
}