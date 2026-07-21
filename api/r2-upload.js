import { requireAuth } from './_lib/auth.js';
import { buildSafeObjectKey } from './_lib/r2Key.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export default async function handler(req, res) {
  const authInfo = await requireAuth(req, res, ['superadmin', 'admin']);
  if (!authInfo) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { fileName, contentType, folder, originalName } = req.body || {};

    // Prefer explicit folder; fall back to dirname of legacy fileName
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
    if (!safe.ok) {
      return res.status(400).json({ success: false, error: safe.error });
    }

    const bucket = process.env.R2_BUCKET_NAME || 'metmal-gallery';
    const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: safe.key,
      ContentType: safe.contentType,
    });

    const uploadUrl = await getSignedUrl(R2, command, { expiresIn: 300 });
    const url = `${publicUrl}/${safe.key}`;
    res.status(200).json({
      success: true,
      uploadUrl,
      publicUrl: url,
      fileName: safe.key,
    });
  } catch (error) {
    console.error('R2 presign error:', error);
    res.status(500).json({ success: false, error: error.message || 'Presign failed' });
  }
}
