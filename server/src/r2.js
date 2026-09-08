/**
 * R2 (Cloudflare) — port api/r2-upload.js + api/r2-delete.js + api/_lib/r2Key.js
 * ke Express router VPS.
 *
 *   POST /api/v1/r2/presign   — presigned PUT (klien upload langsung ke R2)
 *   POST /api/v1/r2/delete    — hapus object (validasi key via allowlist prefix)
 *
 * Media TETAP di R2; hanya presign yang pindah ke backend VPS.
 * Kedua endpoint require role staff (superadmin/admin), mirror legacy.
 *
 * Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *      R2_BUCKET_NAME (default metmal-gallery), R2_PUBLIC_URL (untuk publicUrl).
 */
import { Router } from 'express';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { requireRole, logActivity } from './auth.js';

// ─── R2 client (mirror api/r2-upload.js) ─────────────────────────
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';

export const r2Ready = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'metmal-gallery';
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

// ─── r2Key port (api/_lib/r2Key.js) ──────────────────────────────
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

function validateContentType(contentType) {
  const ct = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIME.has(ct)) {
    return { ok: false, error: 'Content type tidak diizinkan. Gunakan JPEG, PNG, WebP, GIF, PDF, atau DOC/DOCX.' };
  }
  return { ok: true, contentType: ct, ext: MIME_EXT[ct] };
}

function buildSafeObjectKey({ folder, originalName, contentType }) {
  const mime = validateContentType(contentType);
  if (!mime.ok) return mime;

  let prefix = String(folder || 'gallery/').replace(/\\/g, '/').trim();
  if (prefix.includes('..') || prefix.includes('\0') || prefix.startsWith('/') || !prefix) {
    prefix = 'gallery/';
  } else {
    prefix = prefix.replace(/^\/+/, '');
    if (!prefix.endsWith('/')) prefix += '/';
    const allowed = ALLOWED_PREFIXES.some((p) => prefix === p || prefix.startsWith(p));
    if (!allowed) prefix = 'gallery/';
  }

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

function validateExistingKey(fileName) {
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

// ─── Helper terpakai routes/admin.js (mirror api/supabase-admin.js) ─────

/** Ubah public URL R2 → object key (kosong bila URL di luar R2_PUBLIC_URL). */
function publicUrlToKey(url) {
  if (!url) return '';
  let key = String(url);
  if (R2_PUBLIC_URL && key.startsWith(R2_PUBLIC_URL)) {
    key = key.slice(R2_PUBLIC_URL.length).replace(/^\//, '');
  }
  return key;
}

/** Hapus object R2 best-effort (tidak melempar; warn + log). */
export async function deleteR2File(url) {
  const key = publicUrlToKey(url);
  if (!key || !R2_PUBLIC_URL) return;
  try {
    await R2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  } catch (err) {
    console.warn('[deleteR2File] Failed to delete from R2:', url, err.message);
  }
}

/** Hapus object R2 yang MELEMPAR saat gagal — alur butuh kepastian (m-2). */
export async function deleteR2FileOrThrow(url) {
  const key = publicUrlToKey(url);
  if (!key || !R2_PUBLIC_URL) return;
  await R2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

/** Cap ukuran file proposal sponsor (sinkron SponsorManagerModal.MAX_FILE_SIZE = 20MB). */
export const MAX_PROPOSAL_BYTES = 20 * 1024 * 1024;

/**
 * Signature magic-bytes per MIME yang diizinkan (sinkron ALLOWED_MIME di atas).
 * M-3 (audit): verifikasi isi file, bukan hanya Content-Type yang diklaim.
 * Fail-closed: tipe tak dikenal / isi tidak cocok → tolak.
 */
const MIME_MAGIC = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF — konfirmasi 'WEBP' di offset 8
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
  'application/msword': [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]], // OLE2
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4b, 0x03, 0x04]], // ZIP (docx)
};

/** Verifikasi magic bytes object R2 dari public URL (dipakai setEventProposal). */
export async function verifyMimeMagicBytes(url, mimeType) {
  const key = publicUrlToKey(url);
  if (!key || !R2_PUBLIC_URL) return { ok: false, error: 'File URL tidak valid' };
  const ct = String(mimeType || '').split(';')[0].trim().toLowerCase();
  const signatures = MIME_MAGIC[ct];
  if (!signatures) return { ok: false, error: 'Tipe file tidak dikenali.' };
  const obj = await R2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key, Range: 'bytes=0-31' }));
  const buf = Buffer.from(await obj.Body.transformToByteArray());
  const matchesSig = signatures.some((sig) => sig.every((byte, i) => buf[i] === byte));
  if (!matchesSig) return { ok: false, error: 'Isi file tidak sesuai dengan tipe yang dipilih.' };
  if (ct === 'image/webp') {
    const isWebp = buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
    if (!isWebp) return { ok: false, error: 'Isi file tidak sesuai dengan tipe WebP.' };
  }
  return { ok: true };
}

/**
 * HEAD object R2 dari public URL — verifikasi keberadaan + ContentLength
 * (setEventProposal: cap 20MB; ContentLength TIDAK ditandatangani saat
 * presign, jadi dicek post-upload via HEAD).
 * @returns {{ ok: true, contentLength: number } | { ok: false, notFound?: boolean, error: string }}
 */
export async function headR2File(url) {
  const key = publicUrlToKey(url);
  if (!key || !R2_PUBLIC_URL) return { ok: false, error: 'File URL tidak valid' };
  try {
    const head = await R2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return { ok: true, contentLength: Number(head.ContentLength || 0) };
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404) {
      return { ok: false, notFound: true, error: 'File tidak ditemukan di storage. Silakan unggah ulang.' };
    }
    console.error('[headR2File] HEAD R2 failed:', key, err.message);
    return { ok: false, error: 'Gagal memeriksa file di storage' };
  }
}

// ─── Router ──────────────────────────────────────────────────────
const router = Router();

/** Semua endpoint R2 butuh staff; 503 bersih bila R2 belum dikonfigurasi. */
router.use((_req, res, next) => {
  if (!r2Ready) {
    return res.status(503).json({ success: false, error: 'Layanan upload sedang tidak tersedia.' });
  }
  next();
});

// ─── POST /r2/presign ────────────────────────────────────────────
router.post('/presign', requireRole(['superadmin', 'admin']), async (req, res, next) => {
  try {
    const { fileName, contentType, folder, originalName } = req.body || {};

    let folderHint = folder;
    if (!folderHint && fileName) {
      const raw = String(fileName).replace(/\\/g, '/');
      const idx = raw.lastIndexOf('/');
      folderHint = idx > 0 ? raw.slice(0, idx + 1) : 'gallery/';
    }

    const safe = buildSafeObjectKey({
      folder: folderHint,
      originalName: originalName || (fileName ? String(fileName).split('/').pop() : ''),
      contentType,
    });
    if (!safe.ok) return res.status(400).json({ success: false, error: safe.error });

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: safe.key,
      ContentType: safe.contentType,
    });

    const uploadUrl = await getSignedUrl(R2, command, { expiresIn: 300 });
    const url = `${R2_PUBLIC_URL}/${safe.key}`;

    logActivity(req.auth?.user || null, 'upload_r2_file', 'r2', safe.key, {
      folder: safe.key.slice(0, safe.key.lastIndexOf('/') + 1),
      contentType: safe.contentType,
    }, req);

    res.json({ success: true, uploadUrl, publicUrl: url, fileName: safe.key });
  } catch (error) {
    console.error('R2 presign error:', error);
    next(error);
  }
});

// ─── POST /r2/delete ─────────────────────────────────────────────
router.post('/delete', requireRole(['superadmin', 'admin']), async (req, res, next) => {
  try {
    const { fileName } = req.body || {};
    const safe = validateExistingKey(fileName);
    if (!safe.ok) return res.status(400).json({ success: false, error: safe.error });

    await R2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: safe.key }));
    res.json({ success: true });
  } catch (error) {
    console.error('R2 delete error:', error);
    next(error);
  }
});

export default router;
export { R2_BUCKET, R2_PUBLIC_URL };