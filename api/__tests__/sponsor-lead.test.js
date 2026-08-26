/**
 * Test endpoint publik api/sponsor-lead.js — audit sponsorship M-1 + M-2.
 *
 * Kontrak yang dijaga:
 * - Validasi server-side (zod) — pola sama persis dgn src/utils/validation.ts.
 * - Insert via service-role HANYA kolom yang diizinkan; status/internal_notes/id
 *   dari klien TIDAK PERNAH masuk payload insert (di-strip zod).
 * - 400 validasi / 429 rate limit / 500 error DB / 200 sukses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: {
    allowed: true,
    insertResult: { error: null },
    lastInsert: null,
  },
}));

vi.mock('../_lib/auth.js', () => ({
  getServiceSupabase: () => ({
    from: () => ({
      insert: (data) => {
        state.lastInsert = data;
        return { error: state.insertResult.error, data: null };
      },
    }),
  }),
}));

vi.mock('../_lib/rateLimit.js', () => ({
  enforceRateLimit: (_req, res) => {
    if (!state.allowed) {
      res.status(429).json({
        success: false,
        error: 'Terlalu banyak permintaan. Coba lagi sebentar.',
        retry_after: 60,
      });
      return false;
    }
    return true;
  },
}));

import handler from '../sponsor-lead.js';

function mockReq(method = 'POST', body = {}) {
  return { method, body, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
}

function mockRes() {
  return {
    statusCode: 200,
    _json: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._json = payload; return this; },
    setHeader() { return this; },
    end() { return this; },
  };
}

const VALID = {
  eventId: 'evt_1',
  companyName: 'PT Maju Jaya',
  contactName: 'Budi Santoso',
  phone: '0812-3456-7890',
  email: 'budi@example.com',
  message: 'Tertarik support event ini',
};

describe('POST /api/sponsor-lead', () => {
  beforeEach(() => {
    state.allowed = true;
    state.insertResult = { error: null };
    state.lastInsert = null;
  });

  it('valid submit → 200 { success: true }', async () => {
    const res = mockRes();
    await handler(mockReq('POST', VALID), res);
    expect(res.statusCode).toBe(200);
    expect(res._json).toEqual({ success: true });
  });

  it('insert hanya kolom yang diizinkan; status/internal_notes dari klien di-strip (M-2)', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { ...VALID, status: 'agreed', internal_notes: 'PWNED', id: 'custom-123' }), res);
    expect(res.statusCode).toBe(200);
    expect(state.lastInsert).toEqual({
      event_id: 'evt_1',
      company_name: 'PT Maju Jaya',
      contact_name: 'Budi Santoso',
      phone: '0812-3456-7890',
      email: 'budi@example.com',
      message: 'Tertarik support event ini',
    });
    expect(state.lastInsert).not.toHaveProperty('status');
    expect(state.lastInsert).not.toHaveProperty('internal_notes');
    expect(state.lastInsert).not.toHaveProperty('id');
  });

  it('string di-sanitasi: trim + null-byte dihapus', async () => {
    const res = mockRes();
    await handler(mockReq('POST', {
      ...VALID,
      companyName: '  PT Maju\0Jaya  ',
      email: undefined,
      message: undefined,
    }), res);
    expect(res.statusCode).toBe(200);
    expect(state.lastInsert.company_name).toBe('PT MajuJaya');
    expect(state.lastInsert.email).toBe('');
    expect(state.lastInsert.message).toBe('');
  });

  it('phone tidak valid → 400 dengan details.phone', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { ...VALID, phone: '!!!not-a-phone!!!' }), res);
    expect(res.statusCode).toBe(400);
    expect(res._json.success).toBe(false);
    expect(res._json.details.phone).toBeTruthy();
  });

  it('email tidak valid → 400 dengan details.email', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { ...VALID, email: 'not-an-email@' }), res);
    expect(res.statusCode).toBe(400);
    expect(res._json.details.email).toBeTruthy();
  });

  it('field wajib kosong → 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { ...VALID, companyName: '   ' }), res);
    expect(res.statusCode).toBe(400);
    expect(res._json.details.companyName).toBeTruthy();
  });

  it('message > 2000 karakter → 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { ...VALID, message: 'a'.repeat(2001) }), res);
    expect(res.statusCode).toBe(400);
    expect(res._json.details.message).toBeTruthy();
  });

  it('companyName > 200 karakter → 400', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { ...VALID, companyName: 'a'.repeat(201) }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rate limit exceeded → 429 (M-1)', async () => {
    state.allowed = false;
    const res = mockRes();
    await handler(mockReq('POST', VALID), res);
    expect(res.statusCode).toBe(429);
    expect(state.lastInsert).toBeNull();
  });

  it('method GET → 405', async () => {
    const res = mockRes();
    await handler(mockReq('GET'), res);
    expect(res.statusCode).toBe(405);
    expect(state.lastInsert).toBeNull();
  });

  it('event_id tidak ada (FK violation) → 400', async () => {
    state.insertResult = { error: { code: '23503', message: 'fk violation' } };
    const res = mockRes();
    await handler(mockReq('POST', VALID), res);
    expect(res.statusCode).toBe(400);
    expect(res._json.error).toContain('Event tidak ditemukan');
  });

  it('error DB lain → 500, tanpa bocorkan detail', async () => {
    state.insertResult = { error: { code: '42P01', message: 'relation does not exist' } };
    const res = mockRes();
    await handler(mockReq('POST', VALID), res);
    expect(res.statusCode).toBe(500);
    expect(res._json.error).not.toContain('relation does not exist');
  });
});
