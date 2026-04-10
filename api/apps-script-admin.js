const { requireAdminSession } = require('./_lib/auth');

const ALLOWED_ACTIONS = new Set([
  'readDrafts',
  'create', 'update', 'delete',
  'createTheme', 'updateTheme', 'deleteTheme',
  'createDraft', 'updateDraft', 'deleteDraft', 'publishDraft', 'restoreDraft',
  'createLetterRequest',
  'bootstrapEventSheet', 'migrateLegacyEvents', 'migrateStableIds'
]);

module.exports = async (req, res) => {
  if (!requireAdminSession(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const url = String(process.env.APPS_SCRIPT_URL || '').trim();
  const token = String(process.env.ADMIN_API_TOKEN || '').trim();
  if (!url || !token) {
    return res.status(500).json({ success: false, error: 'Admin proxy belum dikonfigurasi' });
  }

  const action = String(req.body?.action || '').trim();
  if (!ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({ success: false, error: 'Action tidak diizinkan' });
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
};
