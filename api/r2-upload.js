import { requireAdminSession } from './_lib/auth.js';
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
  if (!requireAdminSession(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
      return res.status(400).json({ success: false, error: 'Missing fileName or contentType' });
    }

    const bucket = process.env.R2_BUCKET_NAME || 'metmal-gallery';
    const publicUrl = process.env.R2_PUBLIC_URL || '';

    // Generate presigned URL for direct client upload to R2
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(R2, command, { expiresIn: 300 }); // 5 min expiry

    const url = `${publicUrl}/${fileName}`;
    res.status(200).json({ success: true, uploadUrl, publicUrl: url, fileName });
  } catch (error) {
    console.error('R2 presign error:', error);
    res.status(500).json({ success: false, error: error.message || 'Presign failed' });
  }
}
