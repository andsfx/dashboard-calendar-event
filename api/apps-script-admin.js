import { requireAuth } from './_lib/auth.js';

/**
 * Legacy Google Apps Script proxy — OPS MIGRATION ONLY (ADR 004 / SPEC-hygiene).
 *
 * Product paths (do NOT add here):
 * - Event/Draft/publish → /api/supabase-admin
 * - Letter product → GeneratedLetter in Supabase (LetterGenerator); no createLetterRequest
 *
 * Allowed actions are sheet migration/bootstrap one-offs only.
 */
const ALLOWED_ACTIONS = new Set([
  'bootstrapEventSheet',
  'migrateLegacyEvents',
  'migrateStableIds',
]);

export default async function handler(req, res) {
  const authInfo = await requireAuth(req, res, ['superadmin', 'admin']);
  if (!authInfo) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const url = String(process.env.APPS_SCRIPT_URL || '').trim();
  const adminToken = String(process.env.ADMIN_API_TOKEN || '').trim();
  if (!url || !adminToken) {
    return res.status(500).json({ success: false, error: 'Admin proxy belum dikonfigurasi' });
  }

  const action = String(req.body?.action || '').trim();
  if (!ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({
      success: false,
      error: 'Action tidak diizinkan (migration-only proxy; letter/Event/Draft use Supabase)',
    });
  }

  const token = adminToken;

  const payload = { ...req.body, token };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Proxy request failed' });
  }
}
