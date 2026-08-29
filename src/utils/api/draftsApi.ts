import { supabase } from '../../lib/supabase';
import {
  SupabaseApiError, adminAction,
  draftItemToDbRow,
} from './_shared';
import type { DraftEventItem } from '../../types';

export async function createDraftEvent(
  draftData: Omit<DraftEventItem, 'id' | 'sheetRow' | 'rowIndex' | 'published' | 'publishedAt' | 'deleted' | 'deletedAt'>,
  proxyKind: 'admin' | 'public' = 'admin'
): Promise<{ row: number; id: string }> {
  if (proxyKind === 'public') {
    const dbRow = draftItemToDbRow(draftData);
    const { data, error } = await supabase.from('draft_events').insert(dbRow).select('id').single();
    if (error) throw new SupabaseApiError(`Public draft creation failed: ${error.message}`);
    return { row: 0, id: data?.id || '' };
  }
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createDraft', { data: draftItemToDbRow(draftData) });
  if (!result.success) throw new SupabaseApiError(result.error || 'Create draft failed');
  return { row: 0, id: result.id || '' };
}

export async function updateDraftEvent(draftData: Partial<DraftEventItem> & { id: string }): Promise<void> {
  const { id, ...rest } = draftData;
  const result = await adminAction<{ success: boolean; error?: string }>('updateDraft', { id, data: draftItemToDbRow(rest) });
  if (!result.success) throw new SupabaseApiError(result.error || 'Update draft failed');
}

export async function deleteDraftEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteDraft', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete draft failed');
}

export async function publishDraftEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('publishDraft', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Gagal menerbitkan draft');
}

export async function restoreDraftEvent(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('restoreDraft', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Restore draft failed');
}