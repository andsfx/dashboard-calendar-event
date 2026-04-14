export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  res.setHeader('Set-Cookie', 'admin_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0');
  return res.status(200).json({ success: true });
}
