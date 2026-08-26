import { requireAuth, getServiceSupabase, logActivity } from './_lib/auth.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { validateAction } from './_lib/schemas.js';

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'metmal-gallery';

async function deleteR2File(url) {
  if (!url || !R2_PUBLIC_URL) return;
  try {
    let key = url;
    if (url.startsWith(R2_PUBLIC_URL)) {
      key = url.slice(R2_PUBLIC_URL.length).replace(/^\//, '');
    }
    if (!key) return;
    await R2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  } catch (err) {
    console.warn('[deleteR2File] Failed to delete from R2:', url, err.message);
  }
}

export default async function handler(req, res) {
  // Dual auth: Supabase Auth first, legacy cookie fallback
  const authInfo = await requireAuth(req, res, ['superadmin', 'admin']);
  if (!authInfo) return; // 401/403 already sent

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const action = String(req.body?.action || '').trim();
  if (!action) {
    return res.status(400).json({ success: false, error: 'Action is required' });
  }

  // Boundary: unknown → trusted (zod schema per action)
  const validated = validateAction(req.body);
  if (!validated.ok) {
    return res.status(400).json({ success: false, error: validated.error });
  }
  // Use validated data for subsequent switch (req.body still available for unvalidated fields)
  req.body = validated.data;

  try {
    const sb = getServiceSupabase();
    let result;

    switch (action) {
      // ---- Events ----
      case 'createEvent': {
        const { data, error } = await sb.from('events').insert(req.body.data).select('id').single();
        if (error) throw error;
        result = { success: true, id: data.id };
        await logActivity(authInfo, 'create_event', 'event', data.id, { acara: req.body.data?.acara }, req);
        break;
      }
      case 'updateEvent': {
        if (!req.body.id) return res.status(400).json({ success: false, error: 'Event ID is required' });
        const { error } = await sb.from('events').update(req.body.data).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        await logActivity(authInfo, 'update_event', 'event', req.body.id, { fields: Object.keys(req.body.data || {}) }, req);
        break;
      }
      case 'deleteEvent': {
        if (!req.body.id) return res.status(400).json({ success: false, error: 'Event ID is required' });
        const { error } = await sb.from('events').delete().eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        await logActivity(authInfo, 'delete_event', 'event', req.body.id, null, req);
        break;
      }
      case 'batchCreateEvents': {
        const rows = req.body.data;
        if (!Array.isArray(rows) || rows.length === 0) {
          result = { success: false, error: 'No events data provided' };
          break;
        }
        const { data, error } = await sb.from('events').insert(rows).select('id');
        if (error) throw error;
        const results = (data || []).map(r => ({ id: r.id }));
        result = { success: true, results, count: results.length };
        await logActivity(authInfo, 'batch_create_events', 'event', null, { count: results.length }, req);
        break;
      }
      case 'deleteRecurringSeries': {
        const groupId = req.body.groupId;
        if (!groupId) {
          result = { success: false, error: 'Group ID is required' };
          break;
        }
        const { data, error } = await sb.from('events').delete().eq('recurrence_group_id', groupId).select('id');
        if (error) throw error;
        result = { success: true, deletedCount: (data || []).length };
        await logActivity(authInfo, 'delete_recurring_series', 'event', groupId, { deletedCount: (data || []).length }, req);
        break;
      }

      // ---- Annual Themes ----
      case 'createTheme': {
        const { data, error } = await sb.from('annual_themes').insert(req.body.data).select('id').single();
        if (error) throw error;
        result = { success: true, id: data.id };
        await logActivity(authInfo, 'create_theme', 'theme', data.id, { name: req.body.data?.name }, req);
        break;
      }
      case 'updateTheme': {
        if (!req.body.id) return res.status(400).json({ success: false, error: 'Theme ID is required' });
        const { error } = await sb.from('annual_themes').update(req.body.data).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        await logActivity(authInfo, 'update_theme', 'theme', req.body.id, null, req);
        break;
      }
      case 'deleteTheme': {
        if (!req.body.id) return res.status(400).json({ success: false, error: 'Theme ID is required' });
        const { error } = await sb.from('annual_themes').delete().eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        await logActivity(authInfo, 'delete_theme', 'theme', req.body.id, null, req);
        break;
      }

      // ---- Draft Events ----
      case 'readDrafts': {
        const { data, error } = await sb.from('draft_events').select('*').order('date_str', { ascending: true });
        if (error) throw error;
        result = { success: true, data: data || [] };
        break;
      }
      case 'createDraft': {
        const { data, error } = await sb.from('draft_events').insert(req.body.data).select('id').single();
        if (error) throw error;
        result = { success: true, id: data.id };
        await logActivity(authInfo, 'create_draft', 'draft', data.id, { acara: req.body.data?.acara }, req);
        break;
      }
      case 'updateDraft': {
        if (!req.body.id) return res.status(400).json({ success: false, error: 'Draft ID is required' });
        const { error } = await sb.from('draft_events').update(req.body.data).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        await logActivity(authInfo, 'update_draft', 'draft', req.body.id, null, req);
        break;
      }
      case 'deleteDraft': {
        if (!req.body.id) return res.status(400).json({ success: false, error: 'Draft ID is required' });
        const now = new Date().toISOString();
        const { error } = await sb.from('draft_events').update({
          progress: 'cancel',
          deleted: true,
          deleted_at: now,
        }).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        await logActivity(authInfo, 'delete_draft', 'draft', req.body.id, null, req);
        break;
      }
      case 'publishDraft': {
        const draftId = req.body.id;
        if (!draftId) return res.status(400).json({ success: false, error: 'Draft ID is required' });
        // 1. Fetch the draft
        const { data: draft, error: fetchErr } = await sb.from('draft_events').select('*').eq('id', draftId).single();
        if (fetchErr) throw fetchErr;
        if (!draft) throw new Error('Draft not found');
        // Hard forbid re-publish (T-002 / ADR 001) — no second Event spawn
        if (draft.published) {
          return res.status(409).json({ success: false, error: 'Draft already published' });
        }
        if (draft.deleted) {
          return res.status(400).json({ success: false, error: 'Draft is deleted' });
        }
        if (draft.progress !== 'confirm') {
          return res.status(400).json({ success: false, error: 'Draft must be confirmed before publishing' });
        }

        // 2. Idempotency: event may exist from partial prior attempt
        const { data: existing } = await sb.from('events').select('id').eq('source_draft_id', draftId).maybeSingle();
        if (!existing) {
          // 3. Create event from draft (status cache left null/default; client derives on read)
          const eventRow = {
            date_str: draft.date_str,
            date_end: draft.date_end,
            day: draft.day,
            tanggal: draft.tanggal,
            jam: draft.jam,
            acara: draft.acara,
            lokasi: draft.lokasi,
            eo: draft.eo,
            pic: draft.pic,
            phone: draft.phone,
            keterangan: draft.keterangan,
            month: draft.month,
            category: draft.category,
            categories: draft.categories,
            priority: draft.priority,
            event_model: draft.event_model,
            event_nominal: draft.event_nominal,
            event_model_notes: draft.event_model_notes,
            source_draft_id: draftId,
            is_multi_day: draft.is_multi_day,
            day_time_slots: draft.day_time_slots,
            event_type: draft.event_type,
            recurrence_group_id: draft.recurrence_group_id,
            is_recurring: draft.is_recurring,
          };
          const { error: insertErr } = await sb.from('events').insert(eventRow);
          if (insertErr) throw insertErr;
        }

        // 4. Mark draft as published
        const { error: updateErr } = await sb.from('draft_events').update({
          published: true,
          published_at: new Date().toISOString(),
          progress: 'confirm',
        }).eq('id', draftId);
        if (updateErr) throw updateErr;

        result = { success: true };
        await logActivity(authInfo, 'publish_draft', 'draft', draftId, { acara: draft.acara }, req);
        break;
      }
      case 'restoreDraft': {
        if (!req.body.id) return res.status(400).json({ success: false, error: 'Draft ID is required' });
        const { error } = await sb.from('draft_events').update({
          progress: 'draft',
          deleted: false,
          deleted_at: null,
        }).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        await logActivity(authInfo, 'restore_draft', 'draft', req.body.id, null, req);
        break;
      }

      // ---- Site Settings ----
      case 'updateSiteSettings': {
        const { error } = await sb.from('site_settings').upsert({
          key: req.body.key,
          value: req.body.value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
        if (error) throw error;
        result = { success: true };
        await logActivity(authInfo, 'update_site_settings', 'settings', req.body.key, null, req);
        break;
      }

      // ---- Photo Albums ----
      case 'createAlbum': {
        const { data, error } = await sb.from('photo_albums').insert(req.body.data).select('id').single();
        if (error) throw error;
        result = { success: true, id: data.id };
        await logActivity(authInfo, 'create_album', 'album', data.id, { title: req.body.data?.title }, req);
        break;
      }
      case 'deleteAlbum': {
        if (!req.body.id) return res.status(400).json({ success: false, error: 'Album ID is required' });
        // Fetch all photo URLs before deleting DB rows
        const { data: photos } = await sb.from('event_photos').select('id, url').eq('album_id', req.body.id);
        // Delete photo rows from DB
        const { error: photoDeleteErr } = await sb.from('event_photos').delete().eq('album_id', req.body.id);
        if (photoDeleteErr) throw photoDeleteErr;
        // Delete files from R2 (fire-and-forget per file, don't block on failures)
        if (photos && photos.length > 0) {
          await Promise.allSettled(photos.map(p => deleteR2File(p.url)));
        }
        const { error } = await sb.from('photo_albums').delete().eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        await logActivity(authInfo, 'delete_album', 'album', req.body.id, null, req);
        break;
      }
      case 'setAlbumCover': {
        const { error } = await sb.from('photo_albums').update({ cover_photo_url: req.body.coverPhotoUrl }).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case 'createAlbumPhoto': {
        const { data: maxData } = await sb.from('event_photos').select('sort_order').eq('album_id', req.body.data.album_id).order('sort_order', { ascending: false }).limit(1);
        const nextOrder = (maxData?.[0]?.sort_order ?? -1) + 1;
        const photoRow = { ...req.body.data, sort_order: nextOrder };
        const { data, error } = await sb.from('event_photos').insert(photoRow).select('id, sort_order').single();
        if (error) throw error;
        result = { success: true, id: data.id, sortOrder: data.sort_order };
        break;
      }
      case 'deleteAlbumPhoto': {
        const { error } = await sb.from('event_photos').delete().eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // ---- News / Blog ----
      case 'listNewsArticles': {
        const { data, error } = await sb.from('news_articles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        result = { success: true, data: data || [] };
        break;
      }
      case 'createNewsArticle': {
        const { data, error } = await sb.from('news_articles').insert(req.body.data).select('id').single();
        if (error) throw error;
        result = { success: true, id: data.id };
        await logActivity(authInfo, 'create_news', 'news', data.id, { title: req.body.data?.title }, req);
        break;
      }
      case 'updateNewsArticle': {
        if (!req.body.id) return res.status(400).json({ success: false, error: 'News ID is required' });
        const updateData = { ...req.body.data };
        if (updateData.status === 'published') {
          updateData.published_at = new Date().toISOString();
        }
        const { error } = await sb.from('news_articles').update(updateData).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        await logActivity(authInfo, 'update_news', 'news', req.body.id, null, req);
        break;
      }
      case 'deleteNewsArticle': {
        if (!req.body.id) return res.status(400).json({ success: false, error: 'News ID is required' });
        const { data: existing } = await sb.from('news_articles').select('cover_image_url').eq('id', req.body.id).single();
        const { error } = await sb.from('news_articles').delete().eq('id', req.body.id);
        if (error) throw error;
        await deleteR2File(existing?.cover_image_url || '');
        result = { success: true };
        await logActivity(authInfo, 'delete_news', 'news', req.body.id, null, req);
        break;
      }


      // ---- Community Registrations ----
      case 'readRegistrations': {
        const { data, error } = await sb.from('community_registrations').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        result = { success: true, data: data || [] };
        break;
      }
      case 'updateRegistrationStatus': {
        const updateData = { status: req.body.status };
        if (req.body.adminNote !== undefined) updateData.admin_note = req.body.adminNote;
        const { error } = await sb.from('community_registrations').update(updateData).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        await logActivity(authInfo, 'update_registration_status', 'registration', req.body.id, { status: req.body.status }, req);
        break;
      }

      // ---- Event Photos ----
      case 'createEventPhoto': {
        // Get current max sort_order
        const { data: maxData } = await sb.from('event_photos').select('sort_order').order('sort_order', { ascending: false }).limit(1);
        const nextOrder = (maxData?.[0]?.sort_order ?? -1) + 1;
        const photoRow = { ...req.body.data, sort_order: nextOrder };
        const { data, error } = await sb.from('event_photos').insert(photoRow).select('id, sort_order').single();
        if (error) throw error;
        result = { success: true, id: data.id, sortOrder: data.sort_order };
        break;
      }
      case 'deleteEventPhoto': {
        const { error: dbErr } = await sb.from('event_photos').delete().eq('id', req.body.id);
        if (dbErr) throw dbErr;
        await deleteR2File(req.body.url || '');
        result = { success: true };
        break;
      }
      case 'updateEventPhotoOrder': {
        const updates = req.body.data;
        if (!Array.isArray(updates)) {
          result = { success: false, error: 'Invalid data' };
          break;
        }
        // Batch: single update with IN clause + per-row CASE
        // ponytail: Supabase JS client lacks bulk CASE update; use Promise.all
        // for parallel instead of sequential. Upgrade to RPC when photo count > 100.
        await Promise.all(updates.map(item =>
          sb.from('event_photos').update({ sort_order: item.sortOrder }).eq('id', item.id)
        ));
        result = { success: true };
        break;
      }
      case 'linkAlbumToEvent': {
        const albumId = req.body.id || req.body.albumId;
        const eventId = req.body.eventId || req.body.event_id;
        if (!albumId || !eventId) {
          result = { success: false, error: 'albumId and eventId required' };
          break;
        }
        const { error } = await sb
          .from('photo_albums')
          .update({ event_id: eventId })
          .eq('id', albumId);
        if (error) throw error;
        result = { success: true };
        await logActivity(authInfo, 'link_album_event', 'album', albumId, { event_id: eventId }, req);
        break;
      }

      default:
        result = { success: false, error: `Unknown action: ${action}` };
    }

    res.status(200).json(result);
  } catch (error) {
    console.error(`Supabase admin action '${action}' error:`, error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
