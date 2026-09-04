import { z } from 'zod';

// ─── DB → App boundary schemas (replace `as` casts) ──────────────

export const eventStatusSchema = z.enum(['upcoming', 'ongoing', 'past', 'draft']);
export const eventModelSchema = z.enum(['', 'free', 'bayar', 'support']);
export const eventTypeSchema = z.enum(['single', 'multi_day', 'recurring']);
export const prioritySchema = z.enum(['high', 'medium', 'low']);

const dayTimeSlotSchema = z.object({
  date: z.string(),
  jam: z.string(),
});

// ponytail: DB row schema — only fields we actually read from Supabase.
// Add fields here when new DB columns are introduced.
export const dbEventSchema = z.object({
  id: z.string(),
  date_str: z.string(),
  date_end: z.string().nullable().optional(),
  day: z.string(),
  tanggal: z.string(),
  jam: z.string(),
  acara: z.string(),
  lokasi: z.string(),
  eo: z.string(),
  pic: z.string(),
  phone: z.string(),
  keterangan: z.string(),
  month: z.string(),
  status: z.string(),
  category: z.string(),
  categories: z.array(z.string()).nullable().default([]),
  priority: z.string(),
  event_model: z.string(),
  event_nominal: z.string(),
  event_model_notes: z.string(),
  source_draft_id: z.string().nullable().optional(),
  is_multi_day: z.boolean().optional(),
  day_time_slots: z.array(dayTimeSlotSchema).nullable().optional(),
  event_type: z.string().nullable().optional(),
  recurrence_group_id: z.string().nullable().optional(),
  is_recurring: z.boolean().optional(),
  poster_url: z.string().nullable().optional(),
});

// ─── Admin action payload schemas (server-side validation) ────────

export const createEventSchema = z.object({
  action: z.literal('createEvent'),
  data: z.object({
    date_str: z.string().min(1),
    date_end: z.string().nullable().optional(),
    day: z.string(),
    tanggal: z.string(),
    jam: z.string().optional().default(''),
    acara: z.string().min(1, 'Nama acara wajib diisi'),
    lokasi: z.string().optional().default(''),
    eo: z.string().optional().default(''),
    pic: z.string().optional().default(''),
    phone: z.string().optional().default(''),
    keterangan: z.string().optional().default(''),
    month: z.string().optional().default(''),
    category: z.string().optional().default(''),
    categories: z.array(z.string()).optional().default([]),
    priority: prioritySchema.optional().default('medium'),
    event_model: eventModelSchema.optional().default(''),
    event_nominal: z.string().optional().default(''),
    event_model_notes: z.string().optional().default(''),
    status: z.string().optional(),
    source_draft_id: z.string().optional(),
    is_multi_day: z.boolean().optional(),
    day_time_slots: z.array(dayTimeSlotSchema).nullable().optional(),
    event_type: eventTypeSchema.optional(),
    recurrence_group_id: z.string().optional(),
    is_recurring: z.boolean().optional(),
    poster_url: z.string().nullable().optional(),
  }).passthrough(), // allow extra fields Supabase might add
});

export const updateEventSchema = z.object({
  action: z.literal('updateEvent'),
  id: z.string().min(1, 'Event ID is required'),
  data: z.object({}).passthrough(),
});

export const deleteEventSchema = z.object({
  action: z.literal('deleteEvent'),
  id: z.string().min(1, 'Event ID is required'),
});

export const batchCreateEventsSchema = z.object({
  action: z.literal('batchCreateEvents'),
  data: z.array(z.object({}).passthrough()).min(1, 'No events data provided'),
});

export const deleteRecurringSeriesSchema = z.object({
  action: z.literal('deleteRecurringSeries'),
  groupId: z.string().min(1, 'Group ID is required'),
});

export const createDraftSchema = z.object({
  action: z.literal('createDraft'),
  data: z.object({}).passthrough(),
});

export const updateDraftSchema = z.object({
  action: z.literal('updateDraft'),
  id: z.string().min(1, 'Draft ID is required'),
  data: z.object({}).passthrough(),
});

export const deleteDraftSchema = z.object({
  action: z.literal('deleteDraft'),
  id: z.string().min(1, 'Draft ID is required'),
});

export const publishDraftSchema = z.object({
  action: z.literal('publishDraft'),
  id: z.string().min(1, 'Draft ID is required'),
});

export const restoreDraftSchema = z.object({
  action: z.literal('restoreDraft'),
  id: z.string().min(1, 'Draft ID is required'),
});

export const readDraftsSchema = z.object({
  action: z.literal('readDrafts'),
});

// Theme schemas
export const createThemeSchema = z.object({
  action: z.literal('createTheme'),
  data: z.object({
    name: z.string().min(1),
    date_start: z.string(),
    date_end: z.string(),
    color: z.string(),
  }).passthrough(),
});

export const updateThemeSchema = z.object({
  action: z.literal('updateTheme'),
  id: z.string().min(1, 'Theme ID is required'),
  data: z.object({}).passthrough(),
});

export const deleteThemeSchema = z.object({
  action: z.literal('deleteTheme'),
  id: z.string().min(1, 'Theme ID is required'),
});

export const updateSiteSettingsSchema = z.object({
  action: z.literal('updateSiteSettings'),
  key: z.string().min(1),
  value: z.unknown(),
});

// Album schemas
export const createAlbumSchema = z.object({
  action: z.literal('createAlbum'),
  data: z.object({
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional().default(''),
    event_date: z.string().optional().default(''),
  }).passthrough(),
});

export const deleteAlbumSchema = z.object({
  action: z.literal('deleteAlbum'),
  id: z.string().min(1, 'Album ID is required'),
});

export const setAlbumCoverSchema = z.object({
  action: z.literal('setAlbumCover'),
  id: z.string().min(1),
  coverPhotoUrl: z.string(),
});

export const createAlbumPhotoSchema = z.object({
  action: z.literal('createAlbumPhoto'),
  data: z.object({
    url: z.string().min(1),
    caption: z.string().optional().default(''),
    album_id: z.string().min(1),
  }).passthrough(),
});

export const deleteAlbumPhotoSchema = z.object({
  action: z.literal('deleteAlbumPhoto'),
  id: z.string().min(1),
});

export const linkAlbumToEventSchema = z.object({
  action: z.literal('linkAlbumToEvent'),
  id: z.string().min(1),
  eventId: z.string().min(1),
});

export const updateEventPhotoOrderSchema = z.object({
  action: z.literal('updateEventPhotoOrder'),
  data: z.array(z.object({
    id: z.string(),
    sortOrder: z.number(),
  })),
});

export const createEventPhotoSchema = z.object({
  action: z.literal('createEventPhoto'),
  data: z.object({
    url: z.string().min(1),
    caption: z.string().optional().default(''),
    event_date: z.string().optional().default(''),
  }).passthrough(),
});

export const deleteEventPhotoSchema = z.object({
  action: z.literal('deleteEventPhoto'),
  id: z.string().min(1),
  url: z.string().optional().default(''),
});

// Event area schemas
export const createEventAreaSchema = z.object({
  action: z.literal('createEventArea'),
  data: z.object({
    name: z.string().min(1, 'Nama area wajib diisi'),
    description: z.string().optional().default(''),
    cover_photo_url: z.string().optional().default(''),
    sort_order: z.number().optional().default(0),
    is_active: z.boolean().optional().default(true),
  }).passthrough(),
});

export const updateEventAreaSchema = z.object({
  action: z.literal('updateEventArea'),
  id: z.string().min(1, 'Area ID is required'),
  data: z.object({}).passthrough(),
});

export const deleteEventAreaSchema = z.object({
  action: z.literal('deleteEventArea'),
  id: z.string().min(1, 'Area ID is required'),
});

export const createAreaPhotoSchema = z.object({
  action: z.literal('createAreaPhoto'),
  data: z.object({
    url: z.string().min(1),
    caption: z.string().optional().default(''),
    area_id: z.string().min(1),
  }).passthrough(),
});

export const deleteAreaPhotoSchema = z.object({
  action: z.literal('deleteAreaPhoto'),
  id: z.string().min(1),
});

export const updateAreaPhotoOrderSchema = z.object({
  action: z.literal('updateAreaPhotoOrder'),
  data: z.array(z.object({
    id: z.string(),
    sortOrder: z.number(),
  })),
});

// Registration schemas
export const readRegistrationsSchema = z.object({
  action: z.literal('readRegistrations'),
});

export const updateRegistrationStatusSchema = z.object({
  action: z.literal('updateRegistrationStatus'),
  id: z.string().min(1),
  status: z.string(),
  adminNote: z.string().optional().default(''),
});

// ─── Action → schema map ─────────────────────────────────────────

export const ACTION_SCHEMAS: Record<string, z.ZodType> = {
  createEvent: createEventSchema,
  updateEvent: updateEventSchema,
  deleteEvent: deleteEventSchema,
  batchCreateEvents: batchCreateEventsSchema,
  deleteRecurringSeries: deleteRecurringSeriesSchema,
  createDraft: createDraftSchema,
  updateDraft: updateDraftSchema,
  deleteDraft: deleteDraftSchema,
  publishDraft: publishDraftSchema,
  restoreDraft: restoreDraftSchema,
  readDrafts: readDraftsSchema,
  createTheme: createThemeSchema,
  updateTheme: updateThemeSchema,
  deleteTheme: deleteThemeSchema,
  updateSiteSettings: updateSiteSettingsSchema,
  createAlbum: createAlbumSchema,
  deleteAlbum: deleteAlbumSchema,
  setAlbumCover: setAlbumCoverSchema,
  createAlbumPhoto: createAlbumPhotoSchema,
  deleteAlbumPhoto: deleteAlbumPhotoSchema,
  linkAlbumToEvent: linkAlbumToEventSchema,
  updateEventPhotoOrder: updateEventPhotoOrderSchema,
  createEventPhoto: createEventPhotoSchema,
  deleteEventPhoto: deleteEventPhotoSchema,
  readRegistrations: readRegistrationsSchema,
  updateRegistrationStatus: updateRegistrationStatusSchema,
  createEventArea: createEventAreaSchema,
  updateEventArea: updateEventAreaSchema,
  deleteEventArea: deleteEventAreaSchema,
  createAreaPhoto: createAreaPhotoSchema,
  deleteAreaPhoto: deleteAreaPhotoSchema,
  updateAreaPhotoOrder: updateAreaPhotoOrderSchema,
};

// ─── Typed client errors ─────────────────────────────────────────

// ponytail: AdminError dipindah ke ./adminError (leaf module) supaya importer
// tidak menyeret zod ke bundle client. Re-export dipertahankan untuk parity.
export { AdminError, type AdminErrorKind } from './adminError';
