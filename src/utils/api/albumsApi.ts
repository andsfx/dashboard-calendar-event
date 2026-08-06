/**
 * Albums & Photos domain API — re-exports from supabaseApi barrel.
 * Import from here for album/photo operations.
 */
export {
  fetchEventPhotos,
  uploadEventPhoto,
  deleteEventPhoto,
  createEventPhotoRecord,
  linkAlbumToEvent,
  updateEventPhotoOrder,
  fetchAlbums,
  fetchAlbumBySlug,
  createAlbum,
  deleteAlbum,
  setAlbumCover,
  uploadToR2,
  deleteFromR2,
  uploadAlbumPhoto,
  deleteAlbumPhoto,
} from '../supabaseApi';
