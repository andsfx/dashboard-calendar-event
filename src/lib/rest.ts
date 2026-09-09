/**
 * REST client — pengganti supabase-js di frontend.
 *
 * Opsi B: Supabase dilepas total, backend Express/Postgres di VPS. Media TETAP
 * di R2 Cloudflare; lewat sini hanya data JSON (presign pindah ke backend VPS).
 *
 * - Base: `VITE_API_URL` + `/api/v1`
 * - Envelope respons tetap seperti api/*.js lama: `{ success, error?, data? }`
 * - Auth: cookie `sb-access-token` (HttpOnly di server; helper ini membacanya
 *   saat non-HttpOnly, mis. dev). Fetch selalu `credentials: 'include'` agar
 *   cookie ikut terkirim cross-origin ke host VITE_API_URL.
 */

const ACCESS_TOKEN_COOKIE = 'sb-access-token';

const API_V1_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || '')
  .replace(/\/+$/, '') + '/api/v1';

/** URL absolut ke REST — untuk kebutuhan non-JSON (download blob/CSV). */
export function apiUrl(path: string): string {
  return `${API_V1_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Error terstruktur dari REST — pengganti SupabaseApiError (message + code opsional). */
export class ApiError extends Error {
  /** HTTP status, atau kode error aplikasi bila server mengirimnya. */
  readonly code?: string;
  /** Flag aplikasi dari body error (mis. already_submitted saat 409). */
  readonly payload?: Record<string, unknown>;

  constructor(message: string, code?: string, payload?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.payload = payload;
  }
}

export interface RestOptions {
  /** Fallback pesan saat body error tidak JSON / tidak memuat `error` string. */
  errorMessageFallback?: (status: number) => string;
}

/** Ambil access token dari cookie sb-access-token ('' bila HttpOnly tak terbaca JS). */
export function getAccessToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${ACCESS_TOKEN_COOKIE}=([^;]+)`));
  const value = match?.[1];
  return value ? decodeURIComponent(value) : '';
}

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  options: RestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_V1_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : 'Gagal terhubung ke server',
      'NETWORK',
    );
  }

  if (!response.ok) {
    let message: string | null = null;
    let code: string | undefined;
    let payload: Record<string, unknown> | undefined;
    try {
      const parsed = (await response.json()) as {
        error?: unknown;
        message?: unknown;
        code?: unknown;
        already_submitted?: unknown;
        errors?: unknown;
      } & Record<string, unknown>;
      if (typeof parsed.error === 'string' && parsed.error) message = parsed.error;
      else if (typeof parsed.message === 'string' && parsed.message) message = parsed.message;
      if (typeof parsed.code === 'string') code = parsed.code;
      else if (typeof parsed.code === 'number') code = String(parsed.code);
      // Flag aplikasi (already_submitted, errors) diteruskan agar pemanggil
      // bisa bedakan 409-duplikat vs 400-validasi tanpa baca body manual.
      const { error: _e, message: _m, code: _c, success: _s, ...rest } = parsed;
      if (Object.keys(rest).length > 0) payload = rest;
    } catch {
      // body bukan JSON — pakai fallback
    }
    const fallback =
      options.errorMessageFallback?.(response.status) ?? `Permintaan gagal (HTTP ${response.status})`;
    throw new ApiError(message ?? fallback, code ?? String(response.status), payload);
  }

  return (await response.json()) as T;
}

/**
 * GET publik (tanpa auth): unwrap envelope — kembalikan `data`.
 * Saat body `{ success: false }` di HTTP 200 → lempar ApiError.
 */
export async function apiGet<T>(path: string, options: RestOptions = {}): Promise<T> {
  const body = await request<unknown>('GET', path, undefined, options);
  if (!body || typeof body !== 'object') return body as T;
  const rec = body as { success?: unknown; error?: unknown; data?: unknown };
  if (rec.success === false) {
    throw new ApiError(
      typeof rec.error === 'string' && rec.error ? rec.error : `Gagal memuat ${path}`,
    );
  }
  return ('data' in rec ? rec.data : rec) as T;
}

/**
 * POST (admin/auth): kembalikan seluruh body JSON apa adanya (flat, seperti
 * respons adminAction lama yang memuat `success` + field action). Pemanggil
 * membaca `success`/`data`/`id` sesuai kebutuhan.
 */
export async function apiPost<T>(
  path: string,
  body?: unknown,
  options: RestOptions = {},
): Promise<T> {
  return request<T>('POST', path, body, options);
}
