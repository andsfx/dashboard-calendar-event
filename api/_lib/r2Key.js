/**
 * Safe R2 object keys for gallery uploads.
 * Clients may only suggest a folder prefix; server builds the final key.
 */

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const ALLOWED_PREFIXES = ['events/', 'albums/', 'gallery/', 'site/', 'proposals/', 'registrations/', 'areas/'];

/**
 * @param {string} contentType
 * @returns {{ ok: true, contentType: string, ext: string } | { ok: false, error: string }}
 */
export function validateContentType(contentType) {
  const ct = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIME.has(ct)) {
    return { ok: false, error: 'Content type tidak diizinkan. Gunakan JPEG, PNG, WebP, GIF, PDF, atau DOC/DOCX.' };
  }
  return { ok: true, contentType: ct, ext: MIME_EXT[ct] };
}

/**
 * Build a safe object key. Ignores client-supplied path traversal.
 * @param {{ folder?: string, originalName?: string, contentType: string }} opts
 * @returns {{ ok: true, key: string, contentType: string } | { ok: false, error: string }}
 */
export function buildSafeObjectKey({ folder, originalName, contentType }) {
  const mime = validateContentType(contentType);
  if (!mime.ok) return mime;

  let prefix = String(folder || 'gallery/').replace(/\\/g, '/').trim();
  // strip absolute / null / traversal — force safe gallery/ fallback
  if (prefix.includes('..') || prefix.includes('\0') || prefix.startsWith('/') || !prefix) {
    prefix = 'gallery/';
  } else {
    prefix = prefix.replace(/^\/+/, '');
    if (!prefix.endsWith('/')) prefix += '/';
    const allowed = ALLOWED_PREFIXES.some((p) => prefix === p || prefix.startsWith(p));
    if (!allowed) prefix = 'gallery/';
  }

  // optional short original base (never used as path); strip ext to avoid double suffix
  const base = String(originalName || '')
    .split(/[/\\]/)
    .pop()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 40);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const key = `${prefix}${stamp}${base ? `-${base}` : ''}.${mime.ext}`;

  return { ok: true, key, contentType: mime.contentType };
}

/**
 * Validate an existing key before delete (must live under allowed prefixes, no ..).
 * @param {string} fileName
 * @returns {{ ok: true, key: string } | { ok: false, error: string }}
 */
export function validateExistingKey(fileName) {
  const key = String(fileName || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!key || key.includes('..') || key.includes('\0') || key.length > 512) {
    return { ok: false, error: 'fileName tidak valid' };
  }
  const allowed = ALLOWED_PREFIXES.some((p) => key.startsWith(p));
  if (!allowed) {
    return { ok: false, error: 'fileName di luar prefix yang diizinkan' };
  }
  return { ok: true, key };
}
