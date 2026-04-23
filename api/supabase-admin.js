import { requireAdminSession } from './_lib/auth.js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase belum dikonfigurasi');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export default async function handler(req, res) {
  if (!requireAdminSession(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const action = String(req.body?.action || '').trim();
  if (!action) {
    return res.status(400).json({ success: false, error: 'Action is required' });
  }

  try {
    const sb = getSupabase();
    let result;

    switch (action) {
      // ---- Events ----
      case 'createEvent': {
        const { data, error } = await sb.from('events').insert(req.body.data).select('id').single();
        if (error) throw error;
        result = { success: true, id: data.id };
        break;
      }
      case 'updateEvent': {
        const { error } = await sb.from('events').update(req.body.data).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case 'deleteEvent': {
        const { error } = await sb.from('events').delete().eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
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
        break;
      }

      // ---- Annual Themes ----
      case 'createTheme': {
        const { data, error } = await sb.from('annual_themes').insert(req.body.data).select('id').single();
        if (error) throw error;
        result = { success: true, id: data.id };
        break;
      }
      case 'updateTheme': {
        const { error } = await sb.from('annual_themes').update(req.body.data).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case 'deleteTheme': {
        const { error } = await sb.from('annual_themes').delete().eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
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
        break;
      }
      case 'updateDraft': {
        const { error } = await sb.from('draft_events').update(req.body.data).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case 'deleteDraft': {
        // Soft delete: set progress=cancel, deleted=true
        const now = new Date().toISOString();
        const { error } = await sb.from('draft_events').update({
          progress: 'cancel',
          deleted: true,
          deleted_at: now,
        }).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case 'publishDraft': {
        const draftId = req.body.id;
        // 1. Fetch the draft
        const { data: draft, error: fetchErr } = await sb.from('draft_events').select('*').eq('id', draftId).single();
        if (fetchErr) throw fetchErr;
        if (!draft) throw new Error('Draft not found');
        if (draft.published) throw new Error('Draft already published');
        if (draft.deleted) throw new Error('Draft is deleted');
        if (draft.progress !== 'confirm') throw new Error('Draft must be confirmed before publishing');

        // 2. Create event from draft
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

        // 3. Mark draft as published
        const { error: updateErr } = await sb.from('draft_events').update({
          published: true,
          published_at: new Date().toISOString(),
        }).eq('id', draftId);
        if (updateErr) throw updateErr;

        result = { success: true };
        break;
      }
      case 'restoreDraft': {
        const { error } = await sb.from('draft_events').update({
          progress: 'draft',
          deleted: false,
          deleted_at: null,
        }).eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // ---- Site Settings ----
      case 'updateSiteSettings': {
        const { error } = await sb.from('site_settings').upsert({
          key: req.body.key,
          value: req.body.value,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        result = { success: true };
        break;
      }

      // ---- Photo Albums ----
      case 'createAlbum': {
        const { data, error } = await sb.from('photo_albums').insert(req.body.data).select('id').single();
        if (error) throw error;
        result = { success: true, id: data.id };
        break;
      }
      case 'deleteAlbum': {
        // Delete all photos in album first
        await sb.from('event_photos').delete().eq('album_id', req.body.id);
        const { error } = await sb.from('photo_albums').delete().eq('id', req.body.id);
        if (error) throw error;
        result = { success: true };
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
        // Delete from table
        const { error: dbErr } = await sb.from('event_photos').delete().eq('id', req.body.id);
        if (dbErr) throw dbErr;
        // Delete from storage
        try {
          const photoUrl = req.body.url || '';
          const fileName = photoUrl.split('/').pop();
          if (fileName) {
            await sb.storage.from('event-photos').remove([fileName]);
          }
        } catch (storageErr) {
          console.warn('Storage delete warning:', storageErr.message);
        }
        result = { success: true };
        break;
      }
      case 'updateEventPhotoOrder': {
        const updates = req.body.data;
        if (!Array.isArray(updates)) {
          result = { success: false, error: 'Invalid data' };
          break;
        }
        for (const item of updates) {
          const { error } = await sb.from('event_photos').update({ sort_order: item.sortOrder }).eq('id', item.id);
          if (error) throw error;
        }
        result = { success: true };
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
