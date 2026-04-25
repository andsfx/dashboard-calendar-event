// Simulate exactly what the production app does
import { createClient } from '@supabase/supabase-js';

// Use the exact same values that would be in the Vercel build
const url = 'https://xddqinydbuargyfseycw.supabase.co';
const key = 'sb_publishable_ujBcyIJnqq91hmwfGUbe0w_E4ChLVVN';

const supabase = createClient(url, key);

// Simulate fetchEvents from supabaseApi.ts
async function fetchEvents() {
  const [eventsRes, themesRes, holidaysRes] = await Promise.all([
    supabase.from('events').select('*').order('date_str', { ascending: true }),
    supabase.from('annual_themes').select('*').order('date_start', { ascending: true }),
    supabase.from('holidays').select('*').order('date_str', { ascending: true }),
  ]);

  console.log('Events error:', eventsRes.error);
  console.log('Events count:', eventsRes.data?.length);
  console.log('Themes error:', themesRes.error);
  console.log('Themes count:', themesRes.data?.length);
  console.log('Holidays error:', holidaysRes.error);
  console.log('Holidays count:', holidaysRes.data?.length);

  if (eventsRes.error) throw new Error(eventsRes.error.message);
  if (themesRes.error) throw new Error(themesRes.error.message);
  if (holidaysRes.error) throw new Error(holidaysRes.error.message);

  // Test mapping first event
  const row = eventsRes.data[0];
  try {
    const mapped = {
      id: row.id,
      rowIndex: 0,
      tanggal: row.tanggal,
      dateStr: row.date_str,
      dateEnd: row.date_end || undefined,
      day: row.day,
      jam: row.jam || '',
      acara: row.acara,
      lokasi: row.lokasi || '',
      eo: row.eo || '',
      pic: row.pic || '',
      phone: row.phone || '',
      keterangan: row.keterangan || '',
      month: row.month,
      status: row.status || 'upcoming',
      category: row.category || 'Umum',
      categories: Array.isArray(row.categories) ? row.categories : ['Umum'],
      priority: row.priority || 'medium',
      eventModel: row.event_model || '',
      eventNominal: row.event_nominal || '',
      eventModelNotes: row.event_model_notes || '',
      sourceDraftId: row.source_draft_id || '',
      isMultiDay: row.is_multi_day || false,
      dayTimeSlots: Array.isArray(row.day_time_slots) ? row.day_time_slots : undefined,
      eventType: row.event_type || 'single',
      recurrenceGroupId: row.recurrence_group_id || '',
      isRecurring: row.is_recurring || false,
    };
    console.log('\nFirst event mapped successfully:', mapped.acara);
    console.log('dateStr:', mapped.dateStr, typeof mapped.dateStr);
  } catch (e) {
    console.error('MAPPING ERROR:', e.message);
  }

  console.log('\nAll OK - fetchEvents would return', eventsRes.data.length, 'events');
}

fetchEvents().catch(e => console.error('FATAL:', e));
