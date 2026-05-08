import { requireAuth, logActivity } from './_lib/auth.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

/**
 * GET  /api/instagram-sync — Public: return cached Instagram posts
 * POST /api/instagram-sync — Admin: scrape posts via Apify, cache to R2, save to site_settings
 * 
 * Body: { urls: ["https://instagram.com/p/xxx/", ...] }
 * 
 * Stores cached data in site_settings with key "instagram_cache"
 */
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Public: return cached posts from site_settings
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('site_settings')
        .select('value')
        .eq('key', 'instagram_cache')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return res.status(200).json({ success: true, posts: data?.value || [] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Auth required for sync
  const authInfo = await requireAuth(req, res, ['superadmin', 'admin']);
  if (!authInfo) return;

  const { urls } = req.body || {};
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ success: false, error: 'urls array is required' });
  }

  if (!APIFY_TOKEN) {
    return res.status(500).json({ success: false, error: 'APIFY_API_TOKEN not configured' });
  }

  try {
    // 1. Call Apify Instagram Post Scraper (synchronous run)
    const apifyInput = {
      directUrls: urls.map(u => u.trim()).filter(Boolean),
      resultsLimit: urls.length,
    };

    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-post-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apifyInput),
      }
    );

    if (!runResponse.ok) {
      const errText = await runResponse.text();
      throw new Error(`Apify request failed (${runResponse.status}): ${errText}`);
    }

    const posts = await runResponse.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(200).json({ success: true, synced: 0, message: 'No posts returned from Apify' });
    }

    // 2. Process each post: cache image to R2
    const cachedPosts = [];

    for (const post of posts) {
      try {
        const imageUrl = post.displayUrl || (post.images && post.images[0]) || '';
        let cachedImageUrl = '';

        // Download image and upload to R2
        if (imageUrl) {
          const imgResponse = await fetch(imageUrl);
          if (imgResponse.ok) {
            const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
            const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
            const ext = contentType.includes('png') ? 'png' : 'jpg';
            const fileName = `instagram/${post.shortCode || Date.now()}.${ext}`;

            const bucket = process.env.R2_BUCKET_NAME || 'metmal-gallery';
            await R2.send(new PutObjectCommand({
              Bucket: bucket,
              Key: fileName,
              Body: imgBuffer,
              ContentType: contentType,
            }));

            const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
            cachedImageUrl = `${publicUrl}/${fileName}`;
          }
        }

        cachedPosts.push({
          postUrl: post.url || '',
          shortCode: post.shortCode || '',
          imageUrl,
          cachedImageUrl,
          caption: (post.caption || '').slice(0, 500),
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          ownerUsername: post.ownerUsername || '',
          postTimestamp: post.timestamp || null,
          syncedAt: new Date().toISOString(),
        });
      } catch (postErr) {
        console.error('Post processing error:', postErr.message);
      }
    }

    // 3. Save to site_settings as JSON
    const sb = getSupabase();
    const { error: upsertError } = await sb
      .from('site_settings')
      .upsert(
        { key: 'instagram_cache', value: cachedPosts, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (upsertError) throw upsertError;

    await logActivity(authInfo, 'instagram_sync', 'instagram', null, { count: cachedPosts.length }, req);

    return res.status(200).json({
      success: true,
      synced: cachedPosts.length,
      posts: cachedPosts,
    });
  } catch (err) {
    console.error('Instagram sync error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Sync failed' });
  }
}
