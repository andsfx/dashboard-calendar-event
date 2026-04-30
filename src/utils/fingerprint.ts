/**
 * Lightweight device fingerprint for survey duplicate detection.
 * No external dependencies — uses built-in Web APIs.
 *
 * Combines: canvas, screen, timezone, language, platform
 * Cached in localStorage after first generation.
 */

const STORAGE_KEY = 'metmal_device_fp';

/** Simple string hash (djb2) — fast, no crypto needed for fingerprint */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(36);
}

/** Canvas fingerprint — draws text and extracts pixel data hash */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(50, 0, 80, 50);
    ctx.fillStyle = '#069';
    ctx.fillText('MetMal Survey 🏬', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('fingerprint', 4, 30);

    return hashString(canvas.toDataURL());
  } catch {
    return 'canvas-err';
  }
}

/** Collect all signals and combine into a single fingerprint */
function generateFingerprint(): string {
  const signals: string[] = [
    // Canvas
    getCanvasFingerprint(),
    // Screen
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    // Timezone
    String(new Date().getTimezoneOffset()),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    // Language
    navigator.language || '',
    (navigator.languages || []).join(','),
    // Platform
    navigator.platform || '',
    // Hardware hints
    String(navigator.hardwareConcurrency || 0),
    String((navigator as unknown as Record<string, unknown>).deviceMemory || 0),
    // Touch support
    String(navigator.maxTouchPoints || 0),
  ];

  return hashString(signals.join('|'));
}

/**
 * Get device fingerprint — cached in localStorage.
 * Returns a short alphanumeric string (8-12 chars).
 */
export function getDeviceFingerprint(): string {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return cached;

    const fp = generateFingerprint();
    localStorage.setItem(STORAGE_KEY, fp);
    return fp;
  } catch {
    // localStorage blocked (incognito, etc.) — generate fresh each time
    return generateFingerprint();
  }
}
