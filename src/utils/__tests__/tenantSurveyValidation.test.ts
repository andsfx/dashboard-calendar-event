import { describe, it, expect } from 'vitest';
import { validateTenantSurvey } from '../validation';
import { SURVEY_OPTIONS } from '../../constants/survey-options';

// ─── validateTenantSurvey (v3 schema) ────────────────────────────

describe('validateTenantSurvey', () => {
  const validData = (): Record<string, unknown> => ({
    event_id: 'evt_test123',
    nama_gerai: 'Kopi Metmal',
    lokasi_zona: SURVEY_OPTIONS.lokasi_zona[0],
    kategori: SURVEY_OPTIONS.kategori[0],
    kenaikan_traffic: SURVEY_OPTIONS.kenaikan_traffic[0],
    kenaikan_sales: SURVEY_OPTIONS.kenaikan_sales[0],
    feedback_teks: 'Event bagus',
    pic_name: 'Budi',
    pic_phone: '081234567890',
  });

  describe('Valid submissions', () => {
    it('should accept a fully valid v3 survey', () => {
      const result = validateTenantSurvey(validData());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept survey without optional feedback_teks', () => {
      const data = validData();
      delete data.feedback_teks;
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(true);
    });

    it('should accept survey without optional pic fields', () => {
      const data = validData();
      delete data.pic_name;
      delete data.pic_phone;
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('Required fields (non-draft)', () => {
    it('should reject missing event_id', () => {
      const data = validData();
      data.event_id = '';
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Event ID'))).toBe(true);
    });

    it('should reject missing nama_gerai for submit', () => {
      const data = validData();
      data.nama_gerai = '';
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('nama gerai'))).toBe(true);
    });

    it('should reject nama_gerai exceeding 100 chars', () => {
      const data = validData();
      data.nama_gerai = 'x'.repeat(101);
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('100 karakter'))).toBe(true);
    });

    it('should reject missing lokasi_zona for submit', () => {
      const data = validData();
      data.lokasi_zona = '';
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('lokasi zona'))).toBe(true);
    });

    it('should reject invalid lokasi_zona not in options', () => {
      const data = validData();
      data.lokasi_zona = 'Zona Palsu';
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('lokasi zona'))).toBe(true);
    });

    it('should reject missing kategori for submit', () => {
      const data = validData();
      data.kategori = '';
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('kategori'))).toBe(true);
    });

    it('should reject invalid kategori not in options', () => {
      const data = validData();
      data.kategori = 'Kategori Palsu';
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('kategori'))).toBe(true);
    });

    it('should reject missing kenaikan_traffic for submit', () => {
      const data = validData();
      data.kenaikan_traffic = '';
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('traffic'))).toBe(true);
    });

    it('should reject invalid kenaikan_traffic not in options', () => {
      const data = validData();
      data.kenaikan_traffic = 'Naik Banget';
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('traffic'))).toBe(true);
    });

    it('should reject missing kenaikan_sales for submit', () => {
      const data = validData();
      data.kenaikan_sales = '';
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('sales'))).toBe(true);
    });

    it('should reject invalid kenaikan_sales not in options', () => {
      const data = validData();
      data.kenaikan_sales = 'Laris Manis';
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('sales'))).toBe(true);
    });
  });

  describe('Draft mode (isDraft=true)', () => {
    it('should accept empty required fields in draft mode', () => {
      const data: Record<string, unknown> = {
        event_id: 'evt_test123',
        nama_gerai: '',
        lokasi_zona: '',
        kategori: '',
        kenaikan_traffic: '',
        kenaikan_sales: '',
      };
      const result = validateTenantSurvey(data, true);
      expect(result.valid).toBe(true);
    });

    it('should still require event_id in draft mode', () => {
      const data: Record<string, unknown> = {
        event_id: '',
        nama_gerai: '',
      };
      const result = validateTenantSurvey(data, true);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Event ID'))).toBe(true);
    });

    it('should still validate nama_gerai length in draft mode', () => {
      const data: Record<string, unknown> = {
        event_id: 'evt_test123',
        nama_gerai: 'x'.repeat(101),
      };
      const result = validateTenantSurvey(data, true);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('100 karakter'))).toBe(true);
    });
  });

  describe('Text field length limits', () => {
    it('should reject overly long feedback_teks (v3)', () => {
      const data = validData();
      data.feedback_teks = 'a'.repeat(2001);
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('feedback_teks'))).toBe(true);
    });

    it('should reject overly long feedback_comment (legacy)', () => {
      const data = validData();
      data.feedback_comment = 'a'.repeat(2001);
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('feedback_comment'))).toBe(true);
    });

    it('should reject overly long improvement_suggestion', () => {
      const data = validData();
      data.improvement_suggestion = 'x'.repeat(2001);
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(false);
    });

    it('should reject overly long tenant_organization', () => {
      const data = validData();
      data.tenant_organization = 'o'.repeat(201);
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(false);
    });

    it('should reject overly long pic_name', () => {
      const data = validData();
      data.pic_name = 'p'.repeat(101);
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('pic_name'))).toBe(true);
    });

    it('should reject overly long pic_phone', () => {
      const data = validData();
      data.pic_phone = '0'.repeat(21);
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('pic_phone'))).toBe(true);
    });

    it('should accept empty comment fields', () => {
      const data = validData();
      data.feedback_teks = '';
      data.feedback_comment = '';
      data.improvement_suggestion = '';
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('Multiple errors', () => {
    it('should collect all errors at once', () => {
      const data: Record<string, unknown> = {
        event_id: '',
        nama_gerai: '',
        lokasi_zona: '',
        kategori: '',
        kenaikan_traffic: '',
        kenaikan_sales: '',
      };
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      // event_id + 5 required v3 fields = 6 errors
      expect(result.errors.length).toBeGreaterThanOrEqual(6);
    });
  });
});
