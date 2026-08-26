/**
 * Server-side action payload validation (zod).
 * Mirrors critical schemas from src/lib/schemas.ts.
 * Keep in sync when adding new admin actions.
 */
import { z } from 'zod';

const prioritySchema = z.enum(['high', 'medium', 'low']);
const eventModelSchema = z.enum(['', 'free', 'bayar', 'support']);
const eventTypeSchema = z.enum(['single', 'multi_day', 'recurring']);
const dayTimeSlotSchema = z.object({ date: z.string(), jam: z.string() });

const createEventDataSchema = z.object({
  date_str: z.string().min(1),
  date_end: z.string().nullable().optional(),
  day: z.string().optional().default(''),
  tanggal: z.string().optional().default(''),
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
}).passthrough();

const ACTION_SCHEMAS = {
  createEvent: z.object({ action: z.literal('createEvent'), data: createEventDataSchema }),
  updateEvent: z.object({ action: z.literal('updateEvent'), id: z.string().min(1), data: z.object({}).passthrough() }),
  deleteEvent: z.object({ action: z.literal('deleteEvent'), id: z.string().min(1) }),
  batchCreateEvents: z.object({ action: z.literal('batchCreateEvents'), data: z.array(createEventDataSchema).min(1) }),
  deleteRecurringSeries: z.object({ action: z.literal('deleteRecurringSeries'), groupId: z.string().min(1) }),
  createDraft: z.object({ action: z.literal('createDraft'), data: z.object({}).passthrough() }),
  updateDraft: z.object({ action: z.literal('updateDraft'), id: z.string().min(1), data: z.object({}).passthrough() }),
  deleteDraft: z.object({ action: z.literal('deleteDraft'), id: z.string().min(1) }),
  publishDraft: z.object({ action: z.literal('publishDraft'), id: z.string().min(1) }),
  restoreDraft: z.object({ action: z.literal('restoreDraft'), id: z.string().min(1) }),
  readDrafts: z.object({ action: z.literal('readDrafts') }),
  createTheme: z.object({
    action: z.literal('createTheme'),
    data: z.object({ name: z.string().min(1), date_start: z.string(), date_end: z.string(), color: z.string() }).passthrough(),
  }),
  updateTheme: z.object({ action: z.literal('updateTheme'), id: z.string().min(1), data: z.object({}).passthrough() }),
  deleteTheme: z.object({ action: z.literal('deleteTheme'), id: z.string().min(1) }),
  updateSiteSettings: z.object({ action: z.literal('updateSiteSettings'), key: z.string().min(1), value: z.unknown() }),
  createAlbum: z.object({ action: z.literal('createAlbum'), data: z.object({ name: z.string().min(1) }).passthrough() }),
  deleteAlbum: z.object({ action: z.literal('deleteAlbum'), id: z.string().min(1) }),
  setAlbumCover: z.object({ action: z.literal('setAlbumCover'), id: z.string().min(1), coverPhotoUrl: z.string() }),
  createAlbumPhoto: z.object({
    action: z.literal('createAlbumPhoto'),
    data: z.object({ url: z.string().min(1), album_id: z.string().min(1) }).passthrough(),
  }),
  deleteAlbumPhoto: z.object({ action: z.literal('deleteAlbumPhoto'), id: z.string().min(1) }),
  linkAlbumToEvent: z.object({ action: z.literal('linkAlbumToEvent'), id: z.string().min(1), eventId: z.string().min(1) }),
  updateEventPhotoOrder: z.object({
    action: z.literal('updateEventPhotoOrder'),
    data: z.array(z.object({ id: z.string(), sortOrder: z.number() })),
  }),
  createEventPhoto: z.object({
    action: z.literal('createEventPhoto'),
    data: z.object({ url: z.string().min(1) }).passthrough(),
  }),
  deleteEventPhoto: z.object({ action: z.literal('deleteEventPhoto'), id: z.string().min(1), url: z.string().optional() }),
  readRegistrations: z.object({ action: z.literal('readRegistrations') }),
  updateRegistrationStatus: z.object({
    action: z.literal('updateRegistrationStatus'),
    id: z.string().min(1),
    status: z.string(),
    adminNote: z.string().optional(),
  }),
  listNewsArticles: z.object({ action: z.literal('listNewsArticles') }),
  createNewsArticle: z.object({ action: z.literal('createNewsArticle'), data: z.object({ title: z.string().min(1) }).passthrough() }),
  updateNewsArticle: z.object({ action: z.literal('updateNewsArticle'), id: z.string().min(1), data: z.object({}).passthrough() }),
  deleteNewsArticle: z.object({ action: z.literal('deleteNewsArticle'), id: z.string().min(1) }),
};

/**
 * Validate req.body against the action schema.
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function validateAction(body) {
  const action = String(body?.action || '').trim();
  if (!action) return { ok: false, error: 'Action is required' };

  const schema = ACTION_SCHEMAS[action];
  if (!schema) {
    // Unknown action — let switch handle with "Unknown action" error
    return { ok: true, data: body };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { ok: false, error: `Validation failed: ${msg}` };
  }
  return { ok: true, data: result.data };
}
