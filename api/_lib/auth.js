export function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';
  const parts = cookieHeader.split(';').map(part => part.trim());
  const prefix = `${name}=`;
  const hit = parts.find(part => part.startsWith(prefix));
  return hit ? decodeURIComponent(hit.slice(prefix.length)) : '';
}

export function getAdminSessionToken() {
  return String(process.env.ADMIN_SESSION_TOKEN || 'admin-session-testing').trim();
}

export function requireAdminSession(req, res) {
  const expected = getAdminSessionToken();
  if (!expected) {
    res.status(500).json({ success: false, error: 'ADMIN_SESSION_TOKEN belum dikonfigurasi' });
    return false;
  }

  const actual = getCookie(req, 'admin_session');
  if (!actual || actual !== expected) {
    res.status(401).json({ success: false, error: 'Unauthorized admin session' });
    return false;
  }

  return true;
}
