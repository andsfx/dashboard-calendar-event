import { createHash } from 'node:crypto';
import { requireAdminSession } from './_lib/auth.js';

const ALLOWED_ACTIONS = new Set([
  'debugProxyConfig',
  'readDrafts',
  'create', 'update', 'delete',
  'createTheme', 'updateTheme', 'deleteTheme',
  'createDraft', 'updateDraft', 'deleteDraft', 'publishDraft', 'restoreDraft',
  'createLetterRequest',
  'bootstrapEventSheet', 'migrateLegacyEvents', 'migrateStableIds'
]);

function getTokenFingerprint(token) {
  if (!token) return null;
  return createHash('sha256').update(token).digest('hex').slice(0, 12);
}

export default async function handler(req, res) {
  if (!requireAdminSession(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const url = String(process.env.APPS_SCRIPT_URL || '').trim();
  const adminToken = String(process.env.ADMIN_API_TOKEN || '').trim();
  const publicSubmitToken = String(process.env.PUBLIC_SUBMIT_TOKEN || '').trim();
  if (!url || !adminToken) {
    return res.status(500).json({ success: false, error: 'Admin proxy belum dikonfigurasi' });
  }

  const action = String(req.body?.action || '').trim();
  if (!ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({ success: false, error: 'Action tidak diizinkan' });
  }

  const token = action === 'createDraft'
    ? publicSubmitToken || adminToken
    : adminToken;

  if (action === 'debugProxyConfig') {
    return res.status(200).json({
      success: true,
      data: {
        appsScriptUrlConfigured: Boolean(url),
        appsScriptUrl: url,
        adminTokenConfigured: Boolean(adminToken),
        adminTokenFingerprint: getTokenFingerprint(adminToken),
        publicSubmitTokenConfigured: Boolean(publicSubmitToken),
        publicSubmitTokenFingerprint: getTokenFingerprint(publicSubmitToken),
        activeTokenForCreateDraftFingerprint: getTokenFingerprint(publicSubmitToken || adminToken),
      },
    });
  }

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
