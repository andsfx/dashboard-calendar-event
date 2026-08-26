import { supabase } from '../../lib/supabase';
import { SupabaseApiError, adminAction, slugify } from './_shared';
import type { EventPhoto, PhotoAlbum } from '../../types';

// ─── Event Photos ───────────────────────────────────────────────

export async function fetchEventPhotos(): Promise<EventPhoto[]> {
  const { data, error } = await supabase.from('event_photos').select('*').order('sort_order', { ascending: true });
  if (error) throw new SupabaseApiError(`Fetch event photos failed: ${error.message}`);
  return (data || []).map(row => ({
    id: row.id, url: row.url, caption: row.caption,
    eventDate: row.event_date || '', sortOrder: row.sort_order || 0,
  }));
}

export async function uploadEventPhoto(file: File, caption: string, eventDate: string): Promise<EventPhoto> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('event-photos').upload(fileName, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new SupabaseApiError(`Upload failed: ${uploadError.message}`);
  const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(fileName);
  const url = urlData.publicUrl;
  const result = await adminAction<{ success: boolean; error?: string; id?: string; sortOrder?: number }>(
    'createEventPhoto', { data: { url, caption, event_date: eventDate } }
  );
  if (!result.success) throw new SupabaseApiError(result.error || 'Create photo record failed');
  return { id: result.id || '', url, caption, eventDate, sortOrder: result.sortOrder || 0 };
}

export async function deleteEventPhoto(id: string, url: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteEventPhoto', { id, url });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete photo failed');
}

export async function createEventPhotoRecord(data: {
  url: string; caption?: string; event_id?: string; event_date?: string; sort_order?: number;
}): Promise<{ id: string; sortOrder: number }> {
  const result = await adminAction<{ success: boolean; error?: string; id?: string; sortOrder?: number }>(
    'createEventPhoto', { data }
  );
  if (!result.success) throw new SupabaseApiError(result.error || 'Create photo record failed');
  return { id: result.id || '', sortOrder: result.sortOrder || 0 };
}

export async function linkAlbumToEvent(albumId: string, eventId: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('linkAlbumToEvent', { id: albumId, eventId });
  if (!result.success) throw new SupabaseApiError(result.error || 'Link album failed');
}

export async function updateEventPhotoOrder(photos: Array<{ id: string; sortOrder: number }>): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateEventPhotoOrder', { data: photos });
  if (!result.success) throw new SupabaseApiError(result.error || 'Update photo order failed');
}

// ─── Photo Albums ────────────────────────────────────────────────

export async function fetchAlbums(): Promise<PhotoAlbum[]> {
  const { data: albums, error } = await supabase.from('photo_albums').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw new SupabaseApiError(`Fetch albums failed: ${error.message}`);
  const { data: photos } = await supabase.from('event_photos').select('album_id');
  const countMap: Record<string, number> = {};
  for (const p of (photos || [])) { if (p.album_id) countMap[p.album_id] = (countMap[p.album_id] || 0) + 1; }
  return (albums || []).map(row => ({
    id: row.id, name: row.name, slug: row.slug, description: row.description || '',
    eventDate: row.event_date || '', coverPhotoUrl: row.cover_photo_url || '',
    sortOrder: row.sort_order || 0, photoCount: countMap[row.id] || 0,
    eventId: row.event_id || '', lokasi: row.lokasi || '', themeId: row.theme_id || '',
  }));
}

export async function fetchAlbumBySlug(slug: string): Promise<{ album: PhotoAlbum; photos: EventPhoto[] } | null> {
  const { data: album, error } = await supabase.from('photo_albums').select('*').eq('slug', slug).single();
  if (error || !album) return null;
  const { data: photos } = await supabase.from('event_photos').select('*').eq('album_id', album.id).order('sort_order', { ascending: true });
  return {
    album: {
      id: album.id, name: album.name, slug: album.slug, description: album.description || '',
      eventDate: album.event_date || '', coverPhotoUrl: album.cover_photo_url || '',
      sortOrder: album.sort_order || 0, photoCount: (photos || []).length,
      eventId: album.event_id || '', lokasi: album.lokasi || '', themeId: album.theme_id || '',
    },
    photos: (photos || []).map(p => ({
      id: p.id, url: p.url, caption: p.caption || '', eventDate: p.event_date || '',
      sortOrder: p.sort_order || 0, albumId: p.album_id || '',
    })),
  };
}

export async function createAlbum(name: string, description: string, eventDate: string, eventId?: string, lokasi?: string, themeId?: string): Promise<PhotoAlbum> {
  const slg = slugify(name) || `album-${Date.now()}`;
  const data: Record<string, unknown> = { name, slug: slg, description, event_date: eventDate };
  if (eventId) data.event_id = eventId;
  if (lokasi) data.lokasi = lokasi;
  if (themeId) data.theme_id = themeId;
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createAlbum', { data });
  if (!result.success) throw new SupabaseApiError(result.error || 'Create album failed');
  return { id: result.id || '', name, slug: slg, description, eventDate, coverPhotoUrl: '', sortOrder: 0, photoCount: 0, eventId, lokasi, themeId };
}

export async function deleteAlbum(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteAlbum', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete album failed');
}

export async function setAlbumCover(albumId: string, coverPhotoUrl: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('setAlbumCover', { id: albumId, coverPhotoUrl });
  if (!result.success) throw new SupabaseApiError(result.error || 'Set cover failed');
}

// ─── R2 Storage ─────────────────────────────────────────────────

export async function uploadToR2(file: File, folder = 'gallery/'): Promise<string> {
  const presignRes = await fetch('/api/r2-upload', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ folder, originalName: file.name, contentType: file.type }),
  });
  const presignResult = await presignRes.json();
  if (!presignResult.success) throw new SupabaseApiError(presignResult.error || 'R2 presign failed');
  const uploadRes = await fetch(presignResult.uploadUrl, {
    method: 'PUT', headers: { 'Content-Type': file.type }, body: file,
  });
  if (!uploadRes.ok) throw new SupabaseApiError(`R2 upload failed: ${uploadRes.status}`);
  return presignResult.publicUrl;
}

export async function deleteFromR2(url: string): Promise<void> {
  const publicUrlBase = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/$/, '');
  let fileName = url;
  if (publicUrlBase && url.startsWith(publicUrlBase)) fileName = url.slice(publicUrlBase.length + 1);
  const res = await fetch('/api/r2-delete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ fileName }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new SupabaseApiError(body.error || `R2 delete failed (${res.status})`);
  }
}

export async function uploadAlbumPhoto(albumId: string, file: File, caption?: string): Promise<EventPhoto> {
  const finalCaption = caption?.trim() || file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  const url = await uploadToR2(file);
  const result = await adminAction<{ success: boolean; error?: string; id?: string; sortOrder?: number }>(
    'createAlbumPhoto', { data: { url, caption: finalCaption, album_id: albumId } }
  );
  if (!result.success) throw new SupabaseApiError(result.error || 'Create photo record failed');
  return { id: result.id || '', url, caption: finalCaption, eventDate: '', sortOrder: result.sortOrder || 0, albumId };
}

export async function deleteAlbumPhoto(id: string, url: string): Promise<void> {
  await deleteFromR2(url);
  const result = await adminAction<{ success: boolean; error?: string }>('deleteAlbumPhoto', { id });
  if (!result.success) throw new SupabaseApiError(result.error || 'Delete photo failed');
}