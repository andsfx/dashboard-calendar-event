/**
 * GET /api/event-og?id=<eventId> — OG/Twitter meta injection untuk /events/:id.
 *
 * Diakses crawler (WhatsApp/Facebook/Telegram) via vercel.json rewrite
 *   /events/:id* → /api/event-og?id=:id
 * karena crawler tidak menjalankan JS — client-side meta swap tidak terlihat.
 *
 * Perilaku:
 * - Row ada & bukan draft → inject meta og / twitter + JSON-LD Event ke <head>.
 * - Row null/draft/error → serve index.html apa adanya (SPA render 404 client-side).
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const SITE_NAME = 'Metropolitan Mall Bekasi';
const DEFAULT_OG_IMAGE_PATH = '/og-image.jpg';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const id = String(req.query?.id || '').trim();

  // index.html dasar — SPA shell untuk semua kasus
  let html = '';
  try {
    const proto = String(req.headers['x-forwarded-proto'] || 'https');
    const host = req.headers.host;
    html = await fetch(`${proto}://${host}/index.html`, { signal: AbortSignal.timeout(5000) }).then(r => r.text());
  } catch {
    try {
      html = await readFile(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');
    } catch {
      html = '<!doctype html><html lang="id"><head><meta charset="UTF-8"></head><body><div id="root"></div></body></html>';
    }
  }

  // Tanpa id / konfigurasi Supabase tidak ada → shell polos
  if (!id || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return sendHtml(res, html);
  }

  let event = null;
  let fetchFailed = false;
  try {
    const url = `${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(id)}&status=neq.draft&select=*`;
    const resp = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      const rows = await resp.json();
      event = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    } else {
      fetchFailed = true;
    }
  } catch (err) {
    console.error('[event-og] supabase fetch failed:', err?.message);
    fetchFailed = true;
  }

  if (fetchFailed) {
    // Gagal transient (Supabase down) → fail-open: shell polos 200 TANPA noindex,
    // agar crawler tidak menghapus halaman valid saat kembali normal.
    return sendHtml(res, html, { noIndex: false, noStore: true });
  }

  if (!event) {
    // Tidak ketemu / draft → 404 + noindex: dead link keluar dari index crawler.
    return sendHtml(res, html, { noIndex: true, notFound: true });
  }

  const proto = String(req.headers['x-forwarded-proto'] || 'https');
  const host = req.headers.host || '';
  const origin = `${proto}://${host}`;
  const pageUrl = `${origin}/events/${event.id}`;

  const dateLabel = buildDateLabel(event);
  const descParts = [dateLabel, event.jam, event.lokasi].filter(Boolean);
  const description = descParts.length > 0
    ? `${event.acara} — ${descParts.join(' · ')} di ${SITE_NAME}.`
    : `${event.acara} di ${SITE_NAME}.`;
  const title = `${event.acara} — Jadwal Event ${SITE_NAME}`;
  const ogImage = event.poster_url
    ? (String(event.poster_url).startsWith('http') ? event.poster_url : `${origin}${event.poster_url}`)
    : `${origin}${DEFAULT_OG_IMAGE_PATH}`;
  const injected = buildMetaBlock({ title, description, pageUrl, ogImage, origin, event });

  // Crawler pakai tag PERTAMA yang cocok — buang og/twitter/title bawaan shell
  // supaya meta event yang ter-inject tidak kalah oleh duplikat base.
  html = html
    .replace(/<meta property="og:[^>]*>/g, '')
    .replace(/<meta name="twitter:[^>]*>/g, '')
    .replace(/<title>[^<]*<\/title>/, '');
  html = html.replace('</head>', `${injected}\n</head>`);

  return sendHtml(res, html, { noIndex: false });
}

// ─── Helpers ─────────────────────────────────────────────────────

function sendHtml(res, html, { noIndex = false, notFound = false, noStore = false } = {}) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (noStore) {
    res.setHeader('Cache-Control', 'private, no-store');
  } else if (notFound) {
    // 404 jarang berubah — cache pendek di CDN
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  } else {
    // Event valid — meta OG relatif stabil, cache lebih panjang
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  }
  if (noIndex) res.setHeader('X-Robots-Tag', 'noindex');
  return res.status(notFound ? 404 : 200).send(html);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const OG_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const OG_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Format tanggal Indonesia untuk preview OG (bukan ISO mentah) — lokal, tanpa import util TS.
 *  Parse bagian tanggal ISO langsung; jangan lewat Date (offset +07:00 menggeser hari ke belakang saat dibaca UTC). */
function formatTanggalIndo(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate || ''));
  if (!m) return String(isoDate || '');
  const [, y, mo, dd] = m;
  const dayIdx = (Math.floor(Date.UTC(+y, +mo - 1, +dd) / 86400000) + 4) % 7; // 1970-01-01 = Kamis
  return `${OG_DAYS[dayIdx]}, ${+dd} ${OG_MONTHS[+mo - 1]} ${y}`;
}

function buildDateLabel(event) {
  if (!event.date_str) return '';
  if (event.date_end) return `${formatTanggalIndo(event.date_str)} s.d. ${formatTanggalIndo(event.date_end)}`;
  return formatTanggalIndo(event.date_str);
}

function buildMetaBlock({ title, description, pageUrl, ogImage, origin, event }) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(pageUrl);
  const img = escapeHtml(ogImage);

  // JSON-LD Event schema (startDate wajib ISO; endDate hanya bila ada)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.acara,
    startDate: event.date_str || undefined,
    endDate: event.date_end || undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: pageUrl,
    image: [ogImage],
    location: event.lokasi
      ? { '@type': 'Place', name: event.lokasi, address: { '@type': 'PostalAddress', addressLocality: 'Bekasi', addressCountry: 'ID' } }
      : undefined,
    organizer: event.eo
      ? { '@type': 'Organization', name: event.eo, url: origin }
      : undefined,
    description: description,
  };

  const lines = [
    `    <title>${t}</title>`,
    `    <meta property="og:type" content="event" />`,
    `    <meta property="og:title" content="${t}" />`,
    `    <meta property="og:description" content="${d}" />`,
    `    <meta property="og:image" content="${img}" />`,
    `    <meta property="og:url" content="${u}" />`,
    `    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `    <meta property="og:locale" content="id_ID" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${t}" />`,
    `    <meta name="twitter:description" content="${d}" />`,
    `    <meta name="twitter:image" content="${img}" />`,
    `    <script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('</', '<\\/')}</script>`,
  ];

  return lines.join('\n');
}
