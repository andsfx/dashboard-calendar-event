// ─── Typed client errors ─────────────────────────────────────────
// Leaf module: diekstrak dari schemas.ts agar import AdminError tidak
// menyeret zod runtime ke bundle client.

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
