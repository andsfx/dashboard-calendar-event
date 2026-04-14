export default async function handler(req, res) {
  const url = String(process.env.APPS_SCRIPT_URL || '').trim();
  if (!url) {
    return res.status(500).json({ success: false, error: 'Public proxy belum dikonfigurasi' });
  }

  if (req.method === 'GET') {
    const action = String(req.query?.action || '').trim();
    if (action !== 'read') {
      return res.status(400).json({ success: false, error: 'Action tidak diizinkan' });
    }

    try {
      const response = await fetch(`${url}?action=read`);
      const text = await response.text();
      res.status(response.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message || 'Proxy request failed' });
    }
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const token = String(process.env.PUBLIC_SUBMIT_TOKEN || '').trim();
  if (!token) {
    return res.status(500).json({ success: false, error: 'Public proxy belum dikonfigurasi' });
  }

  const action = String(req.body?.action || '').trim();
  if (action !== 'createDraft') {
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
}
