/**
 * Migration Script: Google Sheets → Supabase
 * 
 * Usage:
 *   node migrate/sheets-to-supabase.mjs
 * 
 * Prerequisites:
 *   1. Run the SQL schema in migrate/supabase-schema.sql on your Supabase project first
 *   2. Set environment variables (or they'll be read from .env):
 *      - APPS_SCRIPT_URL
 *      - VITE_SUPABASE_URL
 *      - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    console.warn('Could not load .env file:', e.message);
  }
}

loadEnv();

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!APPS_SCRIPT_URL || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required environment variables.');
  console.error('  APPS_SCRIPT_URL:', APPS_SCRIPT_URL ? 'set' : 'MISSING');
  console.error('  VITE_SUPABASE_URL:', SUPABASE_URL ? 'set' : 'MISSING');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_KEY ? 'set' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- Fetch from Google Sheets ----

async function fetchFromSheets() {
  console.log('Fetching data from Google Sheets...');
  const res = await fetch(`${APPS_SCRIPT_URL}?action=read`);
  const data = await res.json();
  if (!data.success) throw new Error(`Sheets fetch failed: ${data.error}`);
  return data.data; // { events, themes, holidays }
}

async function fetchDraftsFromSheets() {
  console.log('Fetching drafts from Google Sheets...');
  const adminToken = process.env.ADMIN_API_TOKEN;
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'readDrafts', token: adminToken }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Drafts fetch failed: ${data.error}`);
  return data.data || [];
}

// ---- Transform helpers ----

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function transformEvent(ev) {
  return {
    id: ev.id || undefined, // let Supabase generate if empty
    date_str: ev.dateStr,
    date_end: ev.dateEnd || null,
    day: ev.day || '',
    tanggal: ev.tanggal || '',
    jam: ev.jam || '',
    acara: ev.acara || '',
    lokasi: ev.lokasi || '',
    eo: ev.eo || '',
    pic: ev.pic || '',
    phone: ev.phone || '',
    keterangan: ev.keterangan || '',
    month: ev.month || '',
    status: ev.status || 'upcoming',
    category: ev.category || 'Umum',
    categories: Array.isArray(ev.categories) ? ev.categories : (ev.category ? [ev.category] : ['Umum']),
    priority: ev.priority || 'medium',
    event_model: ev.eventModel || '',
    event_nominal: ev.eventNominal || '',
    event_model_notes: ev.eventModelNotes || '',
    source_draft_id: ev.sourceDraftId || '',
    is_multi_day: !!ev.isMultiDay,
    day_time_slots: ev.dayTimeSlots || null,
    event_type: ev.eventType || 'single',
    recurrence_group_id: ev.recurrenceGroupId || '',
    is_recurring: !!ev.isRecurring,
  };
}

function transformTheme(theme) {
  return {
    id: theme.id || undefined,
    name: theme.name || '',
    date_start: theme.dateStart,
    date_end: theme.dateEnd,
    color: theme.color || '#6366f1',
  };
}

function transformHoliday(h) {
  return {
    id: h.id || undefined,
    tanggal: h.tanggal || '',
    date_str: h.dateStr,
    day: h.day || '',
    month: h.month || '',
    name: h.name || '',
    type: h.type || 'libur_nasional',
    description: h.description || '',
  };
}

function transformDraft(d) {
  return {
    id: d.id || undefined,
    date_str: d.dateStr,
    date_end: d.dateEnd || null,
    day: d.day || '',
    tanggal: d.tanggal || '',
    jam: d.jam || '',
    acara: d.acara || '',
    lokasi: d.lokasi || '',
    eo: d.eo || '',
    pic: d.pic || '',
    phone: d.phone || '',
    keterangan: d.keterangan || '',
    internal_note: d.internalNote || '',
    month: d.month || '',
    category: d.category || 'Umum',
    categories: Array.isArray(d.categories) ? d.categories : (d.category ? [d.category] : ['Umum']),
    priority: d.priority || 'medium',
    event_model: d.eventModel || '',
    event_nominal: d.eventNominal || '',
    event_model_notes: d.eventModelNotes || '',
    progress: d.progress || 'draft',
    published: !!d.published,
    published_at: d.publishedAt || null,
    deleted: !!d.deleted,
    deleted_at: d.deletedAt || null,
    is_multi_day: false,
    day_time_slots: null,
    event_type: 'single',
    recurrence_group_id: '',
    is_recurring: false,
  };
}

// ---- Insert into Supabase ----

async function insertBatch(table, rows, label) {
  if (rows.length === 0) {
    console.log(`  ${label}: 0 rows (skipped)`);
    return;
  }
  
  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`  ${label} batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
      // Try inserting one by one to find the problematic row
      for (const row of batch) {
        const { error: singleErr } = await supabase.from(table).insert(row);
        if (singleErr) {
          console.error(`    Failed row (${row.acara || row.name || row.id}):`, singleErr.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
  }
  
  console.log(`  ${label}: ${inserted}/${rows.length} rows inserted`);
}

// ---- Main ----

async function main() {
  console.log('=== Migration: Google Sheets → Supabase ===\n');
  
  // 1. Fetch from Sheets
  const sheetsData = await fetchFromSheets();
  let drafts = [];
  try {
    drafts = await fetchDraftsFromSheets();
  } catch (e) {
    console.warn('Could not fetch drafts (admin token may be missing):', e.message);
  }
  
  console.log(`\nFetched from Sheets:`);
  console.log(`  Events: ${sheetsData.events?.length || 0}`);
  console.log(`  Themes: ${sheetsData.themes?.length || 0}`);
  console.log(`  Holidays: ${sheetsData.holidays?.length || 0}`);
  console.log(`  Drafts: ${drafts.length}`);
  
  // 2. Transform
  const events = (sheetsData.events || []).map(transformEvent);
  const themes = (sheetsData.themes || []).map(transformTheme);
  const holidays = (sheetsData.holidays || []).map(transformHoliday);
  const draftRows = drafts.map(transformDraft);
  
  // 3. Insert into Supabase
  console.log(`\nInserting into Supabase...`);
  await insertBatch('events', events, 'Events');
  await insertBatch('annual_themes', themes, 'Themes');
  await insertBatch('holidays', holidays, 'Holidays');
  await insertBatch('draft_events', draftRows, 'Drafts');
  
  // 4. Verify
  console.log(`\nVerifying...`);
  const { count: evCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
  const { count: thCount } = await supabase.from('annual_themes').select('*', { count: 'exact', head: true });
  const { count: hoCount } = await supabase.from('holidays').select('*', { count: 'exact', head: true });
  const { count: drCount } = await supabase.from('draft_events').select('*', { count: 'exact', head: true });
  
  console.log(`  Events in Supabase: ${evCount}`);
  console.log(`  Themes in Supabase: ${thCount}`);
  console.log(`  Holidays in Supabase: ${hoCount}`);
  console.log(`  Drafts in Supabase: ${drCount}`);
  
  console.log(`\n=== Migration complete! ===`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
