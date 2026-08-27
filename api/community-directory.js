import { getServiceSupabase } from './_lib/auth.js';
import { enforceRateLimit } from './_lib/rateLimit.js';

/**
 * GET /api/community-directory
 *
 * Public directory of approved community registrations and the public events
 * they have organized. Data is sanitized server-side (service_role read):
 * PII columns (pic, phone, email, admin_note, community_name, community_type,
 * preferred_date, type_specific_data) are never returned.
 *
 * Response:
 * {
 *   success: true,
 *   organizations: [
 *     { id, name, type, description, link, eventCount, upcomingEventCount }
 *   ],
 *   categories: ['community', 'eo', ...]   // org types present in the result
 * }
 */

const VALID_TYPES = new Set(['community', 'school', 'company', 'eo', 'campus', 'government', 'ngo', 'other']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=240');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method tidak diizinkan. Gunakan GET.' });
    return;
  }
  if (!enforceRateLimit(req, res, 'community-directory', 60, 60_000)) return;

  try {
    const supabase = getServiceSupabase();

    const orgsRes = await supabase
      .from('community_registrations')
      .select('id, organization_name, organization_type, description, instagram, status')
      .order('created_at', { ascending: false });
    if (orgsRes.error) throw orgsRes.error;

    // organization_id belum ada sampai migration DDL dijalankan.
    // Fallback: query tanpa kolom, lalu match by nama eo (lihat loop count).
    let eventsRes = await supabase.from('events').select('organization_id, eo, date_str, date_end');
    let hasOrgId = !eventsRes.error;
    if (eventsRes.error) {
      eventsRes = await supabase.from('events').select('eo, date_str, date_end');
      if (eventsRes.error) throw eventsRes.error;
    }

    const seen = new Set();
    const orgs = [];
    for (const row of orgsRes.data || []) {
      if (row.status !== 'approved') continue;
      const name = String(row.organization_name || '').trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      orgs.push({
        id: row.id,
        name,
        type: VALID_TYPES.has(row.organization_type) ? row.organization_type : 'other',
        description: String(row.description || '').trim() || undefined,
        link: normalizeInstagram(row.instagram),
        eventCount: 0,
        upcomingEventCount: 0,
      });
    }

    // Canonical event counts: match by exact organization_id (relasi formal);
    // fallback ke name-match on kolom `eo` hanya untuk event yang belum ter-link
    // (sebelum migration backfill `organization_id` dijalankan).
    const nowIso = new Date().toISOString().slice(0, 10);
    const events = (eventsRes.data || []).map((ev) => ({
      orgId: ev.organization_id ? String(ev.organization_id) : null,
      eoLower: String(ev.eo || '').trim().toLowerCase(),
      dateEnd: String(ev.date_end || ev.date_str || ''),
    }));

    for (const org of orgs) {
      const nameLower = org.name.toLowerCase();
      for (const ev of events) {
        if (ev.orgId) {
          // Sudah ter-link: hitung hanya untuk owner id-nya.
          if (ev.orgId !== org.id) continue;
        } else {
          // Belum ter-link: fallback match nama EO spesifik.
          if (nameLower.length < 3 || ev.eoLower !== nameLower) continue;
        }
        org.eventCount += 1;
        if (ev.dateEnd >= nowIso) org.upcomingEventCount += 1;
      }
    }

    const categories = Array.from(new Set(orgs.map((o) => o.type)));
    res.status(200).json({ success: true, organizations: orgs, categories });
  } catch (err) {
    console.error('[community-directory]', err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan saat mengambil direktori organisasi.' });
  }
}

function normalizeInstagram(raw) {
  const v = String(raw || '').trim();
  if (!v) return undefined;
  if (v.startsWith('http://') || v.startsWith('https://')) {
    try {
      const u = new URL(v);
      const username = u.pathname.split('/').filter(Boolean)[0];
      return username ? `https://instagram.com/${encodeURIComponent(username)}` : v;
    } catch {
      return v;
    }
  }
  const bare = v.replace(/^@/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(bare) ? `https://instagram.com/${encodeURIComponent(bare)}` : v;
}
