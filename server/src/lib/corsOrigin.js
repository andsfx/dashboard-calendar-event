/**
 * Pencocokan origin CORS — whitelist eksak + pola glob beranchor.
 *
 * Entri `CORS_ORIGIN` tanpa `*` harus sama persis; entri ber-`*` diperlakukan
 * sebagai pola. Pola dipakai untuk hostname deployment Vercel yang berubah
 * setiap push (`https://metmal-community-<hash>-andy-safiis-projects.vercel.app`):
 * slug tim di ekor hostname membuat pola hanya cocok untuk deployment milik
 * akun sendiri — project `vercel.app` milik orang lain memakai slug berbeda.
 *
 * `*` cocok dengan nol atau lebih karakter apa pun, tetapi regex-nya beranchor
 * (`^…$`) dan bagian literalnya di-escape, sehingga host yang hanya berawalan
 * atau berakhiran sama (mis. `https://<pola>.evil.com`) TIDAK lolos. Karena
 * itu jangan pernah menulis pola selebar `https://*.vercel.app`.
 *
 * Diparse sekali saat boot (env statis) — bukan per request.
 */

/** @param {string} raw isi `CORS_ORIGIN` (daftar dipisah koma) */
export function buildOriginMatcher(raw) {
  const exact = new Set();
  const patterns = [];

  const entries = String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const entry of entries) {
    if (!entry.includes('*')) {
      exact.add(entry);
      continue;
    }
    const source = entry
      .split('*')
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');
    patterns.push(new RegExp(`^${source}$`));
  }

  // Tanpa Origin (same-origin, curl, health check) selalu lolos: CORS hanya
  // mengatur apa yang boleh DIBACA browser lintas-origin. Tanpa konfigurasi,
  // daftar kosong = default-deny untuk request ber-browser lintas-origin.
  return (origin) => !origin || exact.has(origin) || patterns.some((re) => re.test(origin));
}
