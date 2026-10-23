// ─── Typed client errors ─────────────────────────────────────────
// Leaf module: diekstrak dari schemas.ts agar import AdminError tidak
// menyeret zod runtime ke bundle client.

import { ApiError } from './rest';

export type AdminErrorKind =
  | 'Unauthorized'
  | 'Forbidden'
  | 'NotFound'
  | 'Conflict'
  | 'Validation'
  | 'ServerError'
  | 'Network'
  | 'Unknown';

export class AdminError extends Error {
  constructor(
    public kind: AdminErrorKind,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AdminError';
  }

  static fromHttpStatus(status: number, message: string): AdminError {
    switch (status) {
      case 401: return new AdminError('Unauthorized', message, status);
      case 403: return new AdminError('Forbidden', message, status);
      case 404: return new AdminError('NotFound', message, status);
      case 409: return new AdminError('Conflict', message, status);
      case 400: return new AdminError('Validation', message, status);
      case 500: case 502: case 503: return new AdminError('ServerError', message, status);
      default: return new AdminError('Unknown', message, status);
    }
  }
}

/**
 * Normalisasi error apa pun dari lapisan REST menjadi {@link AdminError}.
 *
 * Tanpa ini setiap kegagalan mutasi jatuh ke `kind: 'Unknown'`: `ApiError`
 * (dilempar `lib/rest`) BUKAN `AdminError`, sehingga seluruh cabang
 * `Unauthorized`/`Forbidden`/`Conflict` di hook tidak pernah tercapai dan
 * sesi yang kedaluwarsa tampil sebagai "Perubahan belum tersimpan. Silakan
 * coba lagi." — pengguna mengulang terus tanpa tahu harus masuk ulang.
 *
 * `ApiError.code` berisi status HTTP sebagai string, atau 'NETWORK' bila
 * request tidak pernah sampai ke server.
 */
export function toAdminError(err: unknown): AdminError {
  if (err instanceof AdminError) return err;
  const message = err instanceof Error ? err.message : String(err);
  if (err instanceof ApiError) {
    if (err.code === 'NETWORK') return new AdminError('Network', message, 0);
    const status = Number(err.code);
    if (Number.isInteger(status) && status >= 400 && status <= 599) {
      return AdminError.fromHttpStatus(status, message);
    }
  }
  return new AdminError('Unknown', message, 0);
}
