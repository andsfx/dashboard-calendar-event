import { adminAction, slugify } from './_shared';
import { apiGet, apiPost, ApiError } from '../../lib/rest';
import type { AreaPhoto, EventArea, EventPhoto, PhotoAlbum } from '../../types';

// Row mentah snake_case dari backend REST (server whitelist kolom, BUKAN mapping —
// pemilik snake→camel tetap mapper client di file ini / _shared.ts).
interface DbAlbumRow {
  id: string; name: string; slug: string; description: string; event_date: string;
  cover_photo_url: string; sort_order: number;
  event_id: string; lokasi: string; theme_id: string;
}
interface DbEventPhotoRow {
  id: string; url: string; caption: string; event_date: string; sort_order: number;
  album_id: string; event_id: string;
}
interface DbAreaPhotoRow {
  id: string; area_id: string; url: string; caption: string; sort_order: number;
}
interface DbAlbumsResponse { albums: DbAlbumRow[]; photos: DbEventPhotoRow[]; }
interface DbAlbumDetailResponse { album: DbAlbumRow; photos: DbEventPhotoRow[]; }
interface DbAreasResponse { areas: DbEventAreaRow[]; photos: DbAreaPhotoRow[]; }

// ─── Event Photos ───────────────────────────────────────────────

export async function fetchEventPhotos(): Promise<EventPhoto[]> {
  const { photos } = await apiGet<DbAlbumsResponse>('/albums');
  // Semua foto (tanpa relasi album) — urut sort_order (urutan server).
  return (photos || []).map(p => ({
    id: p.id, url: p.url, caption: p.caption || '', eventDate: p.event_date || '',
    sortOrder: p.sort_order || 0, albumId: p.album_id || '',
  }));
}

export async function deleteEventPhoto(id: string, url: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteEventPhoto', { id, url });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus foto');
}

export async function createEventPhotoRecord(data: {
  url: string; caption?: string; event_id?: string; event_date?: string; sort_order?: number;
}): Promise<{ id: string; sortOrder: number }> {
  const result = await adminAction<{ success: boolean; error?: string; id?: string; sortOrder?: number }>(
    'createEventPhoto', { data }
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal menyimpan foto');
  return { id: result.id || '', sortOrder: result.sortOrder || 0 };
}

export async function linkAlbumToEvent(albumId: string, eventId: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('linkAlbumToEvent', { id: albumId, eventId });
  if (!result.success) throw new ApiError(result.error || 'Gagal menautkan album');
}

export async function updateEventPhotoOrder(photos: Array<{ id: string; sortOrder: number }>): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateEventPhotoOrder', { data: photos });
  if (!result.success) throw new ApiError(result.error || 'Gagal mengurutkan foto');
}

// ─── Photo Albums ────────────────────────────────────────────────

export async function fetchAlbums(): Promise<PhotoAlbum[]> {
  const { albums, photos } = await apiGet<DbAlbumsResponse>('/albums');
  // Hitung jumlah foto per album dari payload /albums (album_id blank → luar album).
  const countMap: Record<string, number> = {};
  for (const p of (photos || [])) {
    if (p.album_id) countMap[p.album_id] = (countMap[p.album_id] || 0) + 1;
  }
  return (albums || []).map(row => ({
    id: row.id, name: row.name, slug: row.slug, description: row.description || '',
    eventDate: row.event_date || '', coverPhotoUrl: row.cover_photo_url || '',
    sortOrder: row.sort_order || 0, photoCount: countMap[row.id] || 0,
    eventId: row.event_id || '', lokasi: row.lokasi || '', themeId: row.theme_id || '',
  }));
}

export async function fetchAlbumBySlug(slug: string): Promise<{ album: PhotoAlbum; photos: EventPhoto[] } | null> {
  try {
    const { album, photos } = await apiGet<DbAlbumDetailResponse>(`/albums/${encodeURIComponent(slug)}`);
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
  } catch (err) {
    // Server 404 saat album tak ada (mirror .single(): null).
    if (err instanceof ApiError && err.code === '404') return null;
    throw err;
  }
}

export async function createAlbum(name: string, description: string, eventDate: string, eventId?: string, lokasi?: string, themeId?: string): Promise<PhotoAlbum> {
  const slg = slugify(name) || `album-${Date.now()}`;
  const data: Record<string, unknown> = { name, slug: slg, description, event_date: eventDate };
  if (eventId) data.event_id = eventId;
  if (lokasi) data.lokasi = lokasi;
  if (themeId) data.theme_id = themeId;
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>('createAlbum', { data });
  if (!result.success) throw new ApiError(result.error || 'Gagal membuat album');
  return { id: result.id || '', name, slug: slg, description, eventDate, coverPhotoUrl: '', sortOrder: 0, photoCount: 0, eventId, lokasi, themeId };
}

export async function deleteAlbum(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteAlbum', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus album');
}

export async function setAlbumCover(albumId: string, coverPhotoUrl: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('setAlbumCover', { id: albumId, coverPhotoUrl });
  if (!result.success) throw new ApiError(result.error || 'Gagal mengatur cover');
}

// ─── R2 Storage ─────────────────────────────────────────────────

export async function uploadToR2(file: File, folder = 'gallery/'): Promise<string> {
  // POST /api/v1/r2/presign — auth via cookie sb-access-token (apiPost kirim credentials).
  let presignResult: { success: boolean; error?: string; uploadUrl?: string; publicUrl?: string };
  try {
    presignResult = await apiPost('/r2/presign', { folder, originalName: file.name, contentType: file.type });
  } catch (err) {
    if (err instanceof ApiError) throw new ApiError(err.message ?? 'Gagal menyiapkan upload');
    throw err;
  }
  if (!presignResult.success) throw new ApiError(presignResult.error || 'Gagal menyiapkan upload');
  if (!presignResult.uploadUrl || !presignResult.publicUrl) throw new ApiError('Gagal menyiapkan upload');
  const uploadRes = await fetch(presignResult.uploadUrl, {
    method: 'PUT', headers: { 'Content-Type': file.type }, body: file,
  });
  if (!uploadRes.ok) throw new ApiError('Gagal mengunggah file');
  return presignResult.publicUrl;
}

export async function deleteFromR2(url: string): Promise<void> {
  const publicUrlBase = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/$/, '');
  let fileName = url;
  if (publicUrlBase && url.startsWith(publicUrlBase)) fileName = url.slice(publicUrlBase.length + 1);
  // POST /api/v1/r2/delete — auth via cookie sb-access-token (apiPost kirim credentials).
  try {
    const result = await apiPost<{ success: boolean; error?: string }>('/r2/delete', { fileName });
    if (!result.success) {
      throw new ApiError(result.error || 'Gagal menghapus file');
    }
  } catch (err) {
    if (err instanceof ApiError) {
      throw new ApiError(err.message ?? 'Gagal menghapus file');
    }
    throw err;
  }
}

export async function uploadAlbumPhoto(albumId: string, file: File, caption?: string): Promise<EventPhoto> {
  const finalCaption = caption?.trim() || file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  const url = await uploadToR2(file);
  const result = await adminAction<{ success: boolean; error?: string; id?: string; sortOrder?: number }>(
    'createAlbumPhoto', { data: { url, caption: finalCaption, album_id: albumId } }
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal menyimpan foto');
  return { id: result.id || '', url, caption: finalCaption, eventDate: '', sortOrder: result.sortOrder || 0, albumId };
}

export async function deleteAlbumPhoto(id: string, url: string): Promise<void> {
  await deleteFromR2(url);
  const result = await adminAction<{ success: boolean; error?: string }>('deleteAlbumPhoto', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus foto');
}

// ─── Foto Area Event ──────────────────────────────────────────────

interface DbEventAreaRow {
  id: string;
  name: string;
  description: string;
  cover_photo_url: string;
  sort_order: number;
  is_active: boolean;
}

export async function fetchEventAreas(): Promise<EventArea[]> {
  const { areas, photos } = await apiGet<DbAreasResponse>('/areas');
  // Server sudah filter is_active = true; hitung foto per area dari payload.
  const countMap = new Map<string, number>();
  for (const p of photos || []) {
    if (p.area_id) countMap.set(p.area_id, (countMap.get(p.area_id) || 0) + 1);
  }
  return (areas || []).map(row => dbEventAreaToEventArea(row as DbEventAreaRow, countMap.get((row as DbEventAreaRow).id) || 0));
}

/** DB → app mapper (boundary: snake_case → camelCase, pola dbAlbum → PhotoAlbum). */
export function dbEventAreaToEventArea(row: DbEventAreaRow, photoCount = 0): EventArea {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    coverPhotoUrl: row.cover_photo_url || '',
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    photoCount: photoCount || 0,
  };
}

/** Foto milik satu area, urut sort_order (DB → app mapper). */
export async function fetchAreaPhotos(areaId: string): Promise<AreaPhoto[]> {
  const { photos } = await apiGet<DbAreasResponse>('/areas');
  return (photos || [])
    .filter(p => p.area_id === areaId)
    .map(p => ({
      id: p.id, url: p.url, caption: p.caption || '', areaId: p.area_id, sortOrder: p.sort_order || 0,
    }));
}

export async function createEventArea(name: string, description: string, coverPhotoUrl?: string): Promise<EventArea> {
  const result = await adminAction<{ success: boolean; error?: string; id?: string }>(
    'createEventArea',
    { data: { name, description, cover_photo_url: coverPhotoUrl || '', sort_order: 0, is_active: true } },
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal membuat area event');
  return {
    id: result.id || '', name, description, coverPhotoUrl: coverPhotoUrl || '',
    sortOrder: 0, isActive: true, photoCount: 0,
  };
}

export async function updateEventArea(id: string, data: Partial<EventArea>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.description !== undefined) row.description = data.description;
  if (data.coverPhotoUrl !== undefined) row.cover_photo_url = data.coverPhotoUrl;
  if (data.sortOrder !== undefined) row.sort_order = data.sortOrder;
  if (data.isActive !== undefined) row.is_active = data.isActive;
  const result = await adminAction<{ success: boolean; error?: string }>('updateEventArea', { id, data: row });
  if (!result.success) throw new ApiError(result.error || 'Gagal memperbarui area event');
}

export async function deleteEventArea(id: string): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('deleteEventArea', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus area event');
}

// ─── Location mapping (backfill lokasi → area) ───

/** Baris mentah dari server — distinct lokasi + hitungan event yang belum dipetakan. */
export interface LocationMappingRow {
  lokasi: string;
  eventCount: number;
  draftCount: number;
  /** area_id yang sudah terisi (null = belum dipetakan) */
  currentAreaId: string | null;
}

export async function fetchLocationMapping(): Promise<LocationMappingRow[]> {
  const result = await adminAction<{ success: boolean; error?: string; data?: LocationMappingRow[] }>(
    'getLocationMapping',
    {},
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal memuat data pemetaan lokasi');
  return (result.data || []).map(r => ({
    lokasi: String(r.lokasi),
    eventCount: Number(r.eventCount) || 0,
    draftCount: Number(r.draftCount) || 0,
    currentAreaId: r.currentAreaId || null,
  }));
}

export interface LocationMappingResult {
  /** Jumlah baris yang area_id-nya baru diisi. */
  updated: number;
  /** Jumlah baris yang teks lokasinya diseragamkan. */
  renamed: number;
}

export async function applyLocationMapping(
  mappings: Array<{ lokasi: string; areaId?: string; targetLokasi?: string }>,
): Promise<LocationMappingResult> {
  const result = await adminAction<{ success: boolean; error?: string; updated?: number; renamed?: number }>(
    'applyLocationMapping',
    { mappings },
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal menerapkan pemetaan lokasi');
  return { updated: result.updated ?? 0, renamed: result.renamed ?? 0 };
}

/** Upload + buat record foto area (cover & galeri). Folder R2 'areas/'. */
export async function uploadAreaPhoto(areaId: string, file: File, caption?: string): Promise<AreaPhoto> {
  const finalCaption = caption?.trim() || file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  const url = await uploadToR2(file, 'areas/');
  const result = await adminAction<{ success: boolean; error?: string; id?: string; sortOrder?: number }>(
    'createAreaPhoto', { data: { url, caption: finalCaption, area_id: areaId } },
  );
  if (!result.success) throw new ApiError(result.error || 'Gagal menyimpan foto area');
  return { id: result.id || '', url, caption: finalCaption, areaId, sortOrder: result.sortOrder || 0 };
}

export async function deleteAreaPhoto(id: string, url: string): Promise<void> {
  await deleteFromR2(url);
  const result = await adminAction<{ success: boolean; error?: string }>('deleteAreaPhoto', { id });
  if (!result.success) throw new ApiError(result.error || 'Gagal menghapus foto area');
}

export async function updateAreaPhotoOrder(photos: Array<{ id: string; sortOrder: number }>): Promise<void> {
  const result = await adminAction<{ success: boolean; error?: string }>('updateAreaPhotoOrder', { data: photos });
  if (!result.success) throw new ApiError(result.error || 'Gagal mengurutkan foto area');
}