import { requireAdminSession } from './_lib/auth.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

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
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ success: false, error: 'Missing fileName' });
    }

    const bucket = process.env.R2_BUCKET_NAME || 'metmal-gallery';

    await R2.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: fileName,
    }));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('R2 delete error:', error);
    res.status(500).json({ success: false, error: error.message || 'Delete failed' });
  }
}
