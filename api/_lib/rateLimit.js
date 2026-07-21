/**
 * In-memory sliding-window rate limit (best-effort on serverless).
 * Cold starts reset the map — still blocks burst abuse per instance.
 */

const buckets = new Map();

export function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || String(req.headers['x-real-ip'] || '').trim() || req.socket?.remoteAddress || 'unknown';
}

/**
 * @param {object} req
 * @param {object} res
 * @param {string} bucketKey e.g. 'login'
 * @param {number} max max hits per window
 * @param {number} windowMs window length
 * @returns {boolean} true if allowed; false if 429 already sent
 */
export function enforceRateLimit(req, res, bucketKey, max, windowMs) {
  const ip = clientIp(req);
  const key = `${bucketKey}:${ip}`;
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }
  entry.count += 1;

  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (now >= v.resetAt) buckets.delete(k);
    }
  }

  const remaining = Math.max(0, max - entry.count);
  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  res.setHeader('X-RateLimit-Limit', String(max));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > max) {
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      success: false,
      error: 'Terlalu banyak permintaan. Coba lagi sebentar.',
      retry_after: retryAfter,
    });
    return false;
  }
  return true;
}
