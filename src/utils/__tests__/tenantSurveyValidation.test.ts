import { describe, it, expect } from 'vitest';
import {
  validateRating,
  validateTenantSurvey,
  TENANT_RATING_KEYS,
  TENANT_RATING_LABELS,
  TENANT_RATING_MIN,
  TENANT_RATING_MAX,
} from '../validation';

// ─── validateRating ─────────────────────────────────────────────

describe('validateRating (1-5 scale)', () => {
  it('should accept valid ratings 1-5', () => {
    for (let i = TENANT_RATING_MIN; i <= TENANT_RATING_MAX; i++) {
      const result = validateRating(i);
      expect(result.valid).toBe(true);
    }
  });

  it('should accept null and undefined (nullable for drafts)', () => {
    expect(validateRating(null).valid).toBe(true);
    expect(validateRating(undefined).valid).toBe(true);
  });

  it('should reject 0', () => {
    const result = validateRating(0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1 dan 5');
  });

  it('should reject 6', () => {
    const result = validateRating(6);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1 dan 5');
  });

  it('should reject negative numbers', () => {
    const result = validateRating(-1);
    expect(result.valid).toBe(false);
  });

  it('should reject non-integer numbers', () => {
    const result = validateRating(3.5);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('bilangan bulat');
  });

  it('should include field name in error message', () => {
    const result = validateRating(15, 'Venue');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Venue');
  });

  it('should respect custom min/max', () => {
    expect(validateRating(5, 'X', 1, 10).valid).toBe(true);
    expect(validateRating(11, 'X', 1, 10).valid).toBe(false);
    expect(validateRating(0, 'X', 1, 10).valid).toBe(false);
  });
});

// ─── validateTenantSurvey ───────────────────────────────────────

describe('validateTenantSurvey', () => {
  const validData = (): Record<string, unknown> => {
    const data: Record<string, unknown> = {
      event_id: 'evt_test123',
      tenant_name: 'Test EO',
      tenant_organization: 'Test Org',
      tenant_email: 'test@example.com',
      tenant_phone: '081234567890',
      feedback_comment: 'Great event',
      improvement_suggestion: 'More parking',
    };
    for (const key of TENANT_RATING_KEYS) {
      data[key] = 4;
    }
    return data;
  };

  describe('Valid submissions', () => {
    it('should accept a fully valid survey with all required ratings', () => {
      const result = validateTenantSurvey(validData());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept survey with optional overall_rating', () => {
      const data = validData();
      data.overall_rating = 5;
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(true);
    });

    it('should accept survey without optional email/phone', () => {
      const data = validData();
      data.tenant_email = '';
      data.tenant_phone = '';
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('Required fields', () => {
    it('should reject missing event_id', () => {
      const data = validData();
      data.event_id = '';
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Event ID'))).toBe(true);
    });

    it('should reject missing tenant_name for submit', () => {
      const data = validData();
      data.tenant_name = '';
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('nama tenant'))).toBe(true);
    });

    it('should allow empty tenant_name for draft', () => {
      const data = validData();
      data.tenant_name = '';
      for (const key of TENANT_RATING_KEYS) {
        data[key] = null;
      }
      const result = validateTenantSurvey(data, true);
      expect(result.valid).toBe(true);
    });
  });

  describe('Rating validation (1-5 scale)', () => {
    it('should reject missing required rating for submit', () => {
      const data = validData();
      data.venue_rating = 0;
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Venue'))).toBe(true);
    });

    it('should reject rating > 5', () => {
      const data = validData();
      data.management_rating = 6;
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(false);
    });

    it('should reject rating < 1', () => {
      const data = validData();
      data.booth_facility_rating = 0;
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(false);
    });

    it('should accept null ratings in draft mode', () => {
      const data = validData();
      for (const key of TENANT_RATING_KEYS) {
        data[key] = null;
      }
      const result = validateTenantSurvey(data, true);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid overall_rating if provided', () => {
      const data = validData();
      data.overall_rating = 10;
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(false);
    });

    it('should allow null overall_rating', () => {
      const data = validData();
      data.overall_rating = null;
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('Text length limits', () => {
    it('should reject overly long feedback_comment', () => {
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

    it('should accept empty comment fields', () => {
      const data = validData();
      data.feedback_comment = '';
      data.improvement_suggestion = '';
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('Email and phone validation', () => {
    it('should reject invalid email format', () => {
      const data = validData();
      data.tenant_email = 'not-an-email';
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('email'))).toBe(true);
    });

    it('should reject invalid phone format', () => {
      const data = validData();
      data.tenant_phone = '12345';
      const result = validateTenantSurvey(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('telepon'))).toBe(true);
    });
  });

  describe('Multiple errors', () => {
    it('should collect all errors at once', () => {
      const data: Record<string, unknown> = {
        event_id: '',
        tenant_name: '',
      };
      for (const key of TENANT_RATING_KEYS) {
        data[key] = 0;
      }
      const result = validateTenantSurvey(data, false);
      expect(result.valid).toBe(false);
      // Should have at least event_id + tenant_name + 4 ratings = 6 errors
      expect(result.errors.length).toBeGreaterThanOrEqual(6);
    });
  });
});

// ─── TENANT_RATING_LABELS completeness ──────────────────────────

describe('TENANT_RATING_LABELS', () => {
  it('should have a label for every required rating key', () => {
    for (const key of TENANT_RATING_KEYS) {
      expect(TENANT_RATING_LABELS[key]).toBeDefined();
      expect(typeof TENANT_RATING_LABELS[key]).toBe('string');
      expect(TENANT_RATING_LABELS[key].length).toBeGreaterThan(0);
    }
  });

  it('should have exactly 4 required rating keys (tenant spec)', () => {
    expect(TENANT_RATING_KEYS).toHaveLength(4);
    expect(TENANT_RATING_KEYS).toContain('venue_rating');
    expect(TENANT_RATING_KEYS).toContain('management_rating');
    expect(TENANT_RATING_KEYS).toContain('event_organization_rating');
    expect(TENANT_RATING_KEYS).toContain('booth_facility_rating');
  });
});
