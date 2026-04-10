const { getAdminSessionToken } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const expectedPassword = String(process.env.ADMIN_PASSWORD || '').trim();
  const sessionToken = getAdminSessionToken();
  const providedPassword = String(req.body?.password || '').trim();

  if (!expectedPassword || !sessionToken) {
    return res.status(500).json({ success: false, error: 'Admin auth belum dikonfigurasi' });
  }

  if (providedPassword !== expectedPassword) {
    return res.status(401).json({ success: false, error: 'Password salah' });
  }

  res.setHeader('Set-Cookie', `admin_session=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=28800`);
  return res.status(200).json({ success: true });
};
