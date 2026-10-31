/**
 * REST client — akses data frontend ke backend VPS Express/Postgres.
 *
 * Opsi B: Supabase dilepas total. Media TETAP di R2 Cloudflare; lewat sini
 * hanya data JSON (presign pindah ke backend VPS).
 *
 * - Base: `VITE_API_URL` + `/api/v1`
 * - Envelope respons: `{ success, error?, data? }`
 * - Auth: cookie `sb-access-token` (HttpOnly di produksi; helper getAccessToken
 *   membacanya saat non-HttpOnly, mis. dev). Fetch selalu `credentials: 'include'`
 *   agar cookie ikut terkirim cross-origin ke host VITE_API_URL.
 * - Sesi kedaluwarsa: setiap 401 dari endpoint ber-sesi memanggil
 *   {@link setUnauthorizedHandler} (dipasang `useAuth`) supaya UI kembali ke
 *   layar login, bukan menampilkan dashboard kosong.
 */

const ACCESS_TOKEN_COOKIE = 'sb-access-token';

const API_V1_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || '')
  .replace(/\/+$/, '') + '/api/v1';

/** URL absolut ke REST — untuk kebutuhan non-JSON (download blob/CSV). */
export function apiUrl(path: string): string {
  return `${API_V1_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Error terstruktur dari REST (message + code + flag aplikasi opsional). */
export class ApiError extends Error {
  /** HTTP status (sebagai string), atau kode error aplikasi bila server mengirimnya. */
  readonly code?: string;
  /** Flag aplikasi dari body error (mis. errors validasi saat 400). */
  readonly payload?: Record<string, unknown>;

  constructor(message: string, code?: string, payload?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.payload = payload;
  }
}

export interface RestOptions<T = unknown> {
  /** Fallback pesan saat body error tidak JSON / tidak memuat `error` string. */
  errorMessageFallback?: (status: number) => string;
  /**
   * Validasi/parse opsional atas body JSON mentah (mis. zod `.parse`). Tanpa
   * ini body di-cast ke `T` apa adanya — kontrak bentuk data tetap milik mapper
   * eksplisit di `src/utils/api/*`, bukan rest client.
   */
  parse?: (raw: unknown) => T;
}

/** Info request yang menerima 401 — hanya path/metode, tanpa PII. */
export interface UnauthorizedInfo {
  method: 'GET' | 'POST';
  path: string;
}

type UnauthorizedHandler = (info: UnauthorizedInfo) => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * Pasang callback sesi-kedaluwarsa (satu per tab; aplikasi ini tanpa store).
 * `useAuth` memasangnya untuk mereset `user`, sehingga `/dashboard/*` kembali
 * menampilkan form login. Kirim `null` saat unmount.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

/**
 * Endpoint yang memang anonim (pengunjung tanpa sesi). 401 di sini TIDAK
 * boleh mereset sesi: halaman publik/survei anonim tidak membawa kredensial
 * yang bermakna, dan kegagalan satu request publik jangan sampai mengeluarkan
 * admin yang sedang membuka halaman publik.
 */
const ANONYMOUS_ENDPOINTS = [
  '/auth/login',
  '/events',
  '/themes',
  '/holidays',
  '/news',
  '/albums',
  '/areas',
  '/event-og',
  '/directory',
  '/registrations',
  '/sponsor-leads',
  '/sponsor/events',
  '/exhibitions',
  '/exhibition-leads',
  '/tenant-participations',
  '/tenant-event-proposals',
  '/survey/submit',
  '/survey/summary',
  '/tenant/submit',
  '/tenant/check',
  '/tenant/event-info',
  '/tenant/events',
  '/tenant/results-list',
  '/tenant/results-analytics',
  '/tenant/results-roster',
  '/tenant/directory',
  '/tenant/tenants',
  '/tenant/roster',
  '/tenant/tenant-detail',
];

function isAnonymousEndpoint(path: string): boolean {
  const [base] = path.split('?');
  if (!base) return false;
  return ANONYMOUS_ENDPOINTS.some(prefix => base === prefix || base.startsWith(`${prefix}/`));
}

function notifyUnauthorized(method: 'GET' | 'POST', path: string): void {
  if (!unauthorizedHandler || isAnonymousEndpoint(path)) return;
  try {
    unauthorizedHandler({ method, path });
  } catch {
    // Kegagalan handler UI tidak boleh menutupi ApiError 401 yang asli.
  }
}

interface ParsedErrorFields {
  message: string | null;
  code?: string;
  payload?: Record<string, unknown>;
}

/**
 * Ambil pesan/kode/flag dari body error `{ success:false, error?, code?, ... }`
 * — dipakai jalur HTTP >= 400 DAN envelope `{success:false}` di HTTP 200.
 * Tanpa jalur kedua, `code`/`payload` hilang dan pemanggil tidak bisa
 * membedakan "tidak ada" dari "coba lagi".
 */
function parseErrorFields(body: unknown): ParsedErrorFields {
  if (!body || typeof body !== 'object') return { message: null };
  const parsed = body as Record<string, unknown>;
  const message = typeof parsed.error === 'string' && parsed.error
    ? parsed.error
    : typeof parsed.message === 'string' && parsed.message
      ? parsed.message
      : null;
  const code = typeof parsed.code === 'string'
    ? parsed.code
    : typeof parsed.code === 'number'
      ? String(parsed.code)
      : undefined;
  // Flag aplikasi (errors validasi dll.) diteruskan agar pemanggil bisa
  // membacanya tanpa parse body manual.
  const { error: _e, message: _m, code: _c, success: _s, ...rest } = parsed;
  return { message, code, payload: Object.keys(rest).length > 0 ? rest : undefined };
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
  options: RestOptions<T> = {},
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
    // Pesan fetch mentah berbahasa Inggris ("Failed to fetch") dan tidak
    // informatif; setiap konsumen meneruskan err.message apa adanya ke UI.
    // Teks asli disimpan di payload untuk diagnosa, bukan untuk ditampilkan.
    throw new ApiError(
      'Gagal terhubung ke server. Periksa koneksi lalu coba lagi.',
      'NETWORK',
      { detail: err instanceof Error ? err.message : String(err) },
    );
  }

  if (!response.ok) {
    // body bukan JSON / kosong → parseErrorFields mengembalikan message null
    // (fallback). try/catch, bukan `.catch()`, agar `json()` yang melempar
    // sinkron (mock/fetch tertentu) tetap tertangkap.
    let rawBody: unknown;
    try {
      rawBody = await response.json();
    } catch {
      rawBody = undefined;
    }
    const fields = parseErrorFields(rawBody);
    if (response.status === 401) notifyUnauthorized(method, path);
    const fallback =
      options.errorMessageFallback?.(response.status) ?? `Permintaan gagal (HTTP ${response.status})`;
    throw new ApiError(fields.message ?? fallback, fields.code ?? String(response.status), fields.payload);
  }

  // Cast tanpa validasi runtime adalah default yang disengaja: setiap modul API
  // memetakan snake_case → camelCase secara eksplisit, dan memaksa schema di
  // sini akan menduplikasi kontrak (plus menyeret zod ke setiap bundle).
  // Pemanggil yang butuh jaminan bentuk boleh mengirim `options.parse`.
  const json: unknown = await response.json();
  return options.parse ? options.parse(json) : (json as T);
}

/**
 * GET publik (tanpa auth): unwrap envelope — kembalikan `data`.
 * Saat body `{ success: false }` di HTTP 200 → lempar ApiError dengan
 * `code`/`payload` dari body (bukan hanya pesan).
 */
export async function apiGet<T>(path: string, options: RestOptions<T> = {}): Promise<T> {
  const body = await request<unknown>('GET', path, undefined, options);
  if (!body || typeof body !== 'object') return body as T;
  const rec = body as { success?: unknown; data?: unknown };
  if (rec.success === false) {
    const fields = parseErrorFields(body);
    throw new ApiError(
      fields.message ?? `Gagal memuat ${path}`,
      fields.code,
      fields.payload,
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
  options: RestOptions<T> = {},
): Promise<T> {
  return request<T>('POST', path, body, options);
}

/**
 * Bungkus ulang `ApiError` dengan pesan cadangan TANPA membuang `code`/`payload`.
 * Non-ApiError dikembalikan apa adanya agar pemanggil tetap `throw` error aslinya.
 *
 * Gunakan `message` bila pemanggil sudah menyusun pesan sendiri (mis. gabungan
 * `errors` validasi); `fallback` dipakai saat pesan server kosong.
 */
export function rewrapApiError(err: unknown, fallback: string, message?: string): unknown {
  if (!(err instanceof ApiError)) return err;
  return new ApiError(message || err.message || fallback, err.code, err.payload);
}
