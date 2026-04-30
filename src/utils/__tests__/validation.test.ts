import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateInstagram,
  EMAIL_REGEX,
  PHONE_REGEX,
  INSTAGRAM_REGEX,
} from '../validation';

describe('Email Validation', () => {
  describe('Valid emails', () => {
    it('should accept standard email format', () => {
      const result = validateEmail('user@example.com');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result.valid).toBe(true);
    });

    it('should accept email with numbers', () => {
      const result = validateEmail('user123@example.com');
      expect(result.valid).toBe(true);
    });

    it('should accept email with dots in local part', () => {
      const result = validateEmail('first.last@example.com');
      expect(result.valid).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result.valid).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = validateEmail('  user@example.com  ');
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid emails', () => {
    it('should reject empty string', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak boleh kosong');
    });

    it('should reject whitespace only', () => {
      const result = validateEmail('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak boleh kosong');
    });

    it('should reject email without @', () => {
      const result = validateEmail('userexample.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });

    it('should reject email without domain', () => {
      const result = validateEmail('user@');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });

    it('should reject email without local part', () => {
      const result = validateEmail('@example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });

    it('should reject too short email', () => {
      const result = validateEmail('a@b');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('terlalu pendek');
    });

    it('should reject too long email', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('terlalu panjang');
    });

    it('should reject email with spaces', () => {
      const result = validateEmail('user name@example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });

    it('should reject multiple @ signs', () => {
      const result = validateEmail('user@@example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });
  });

  describe('EMAIL_REGEX constant', () => {
    it('should be exported and functional', () => {
      expect(EMAIL_REGEX.test('user@example.com')).toBe(true);
      expect(EMAIL_REGEX.test('invalid')).toBe(false);
    });
  });
});

describe('Phone Validation', () => {
  describe('Valid phone numbers', () => {
    it('should accept 08xxx format', () => {
      const result = validatePhone('081234567890');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept +628xxx format', () => {
      const result = validatePhone('+6281234567890');
      expect(result.valid).toBe(true);
    });

    it('should accept 628xxx format', () => {
      const result = validatePhone('6281234567890');
      expect(result.valid).toBe(true);
    });

    it('should accept phone with spaces', () => {
      const result = validatePhone('0812 3456 7890');
      expect(result.valid).toBe(true);
    });

    it('should accept phone with dashes', () => {
      const result = validatePhone('0812-3456-7890');
      expect(result.valid).toBe(true);
    });

    it('should accept phone with mixed separators', () => {
      const result = validatePhone('+62 812-3456-7890');
      expect(result.valid).toBe(true);
    });

    it('should accept minimum length (10 digits)', () => {
      const result = validatePhone('0812345678');
      expect(result.valid).toBe(true);
    });

    it('should accept maximum length (14 digits)', () => {
      const result = validatePhone('08123456789012');
      expect(result.valid).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = validatePhone('  081234567890  ');
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid phone numbers', () => {
    it('should reject empty string', () => {
      const result = validatePhone('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak boleh kosong');
    });

    it('should reject whitespace only', () => {
      const result = validatePhone('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak boleh kosong');
    });

    it('should reject too short phone', () => {
      const result = validatePhone('08123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });

    it('should reject too long phone', () => {
      const result = validatePhone('0812345678901234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });

    it('should reject phone with letters', () => {
      const result = validatePhone('081234abc890');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hanya boleh berisi angka');
    });

    it('should reject phone with special characters', () => {
      const result = validatePhone('0812#3456@7890');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hanya boleh berisi angka');
    });

    it('should reject phone not starting with 08/+628/628', () => {
      const result = validatePhone('1234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });

    it('should reject phone starting with 09 (not valid Indonesian)', () => {
      const result = validatePhone('091234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });

    it('should reject international non-Indonesian format', () => {
      const result = validatePhone('+1234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });
  });

  describe('PHONE_REGEX constant', () => {
    it('should be exported and functional', () => {
      expect(PHONE_REGEX.test('081234567890')).toBe(true);
      expect(PHONE_REGEX.test('1234567890')).toBe(false);
    });
  });
});

describe('Instagram Validation', () => {
  describe('Valid Instagram inputs', () => {
    it('should accept @username format', () => {
      const result = validateInstagram('@johndoe');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept plain username', () => {
      const result = validateInstagram('johndoe');
      expect(result.valid).toBe(true);
    });

    it('should accept username with underscore', () => {
      const result = validateInstagram('@john_doe');
      expect(result.valid).toBe(true);
    });

    it('should accept username with dot', () => {
      const result = validateInstagram('@john.doe');
      expect(result.valid).toBe(true);
    });

    it('should accept username with numbers', () => {
      const result = validateInstagram('@john123');
      expect(result.valid).toBe(true);
    });

    it('should accept https://instagram.com/username', () => {
      const result = validateInstagram('https://instagram.com/johndoe');
      expect(result.valid).toBe(true);
    });

    it('should accept https://www.instagram.com/username', () => {
      const result = validateInstagram('https://www.instagram.com/johndoe');
      expect(result.valid).toBe(true);
    });

    it('should accept Instagram URL with trailing slash', () => {
      const result = validateInstagram('https://instagram.com/johndoe/');
      expect(result.valid).toBe(true);
    });

    it('should accept http://instagram.com/username', () => {
      const result = validateInstagram('http://instagram.com/johndoe');
      expect(result.valid).toBe(true);
    });

    it('should accept empty string (optional field)', () => {
      const result = validateInstagram('');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept whitespace only (optional field)', () => {
      const result = validateInstagram('   ');
      expect(result.valid).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = validateInstagram('  @johndoe  ');
      expect(result.valid).toBe(true);
    });

    it('should accept minimum length username (3 chars)', () => {
      const result = validateInstagram('@abc');
      expect(result.valid).toBe(true);
    });

    it('should accept maximum length username (30 chars)', () => {
      const result = validateInstagram('@' + 'a'.repeat(30));
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid Instagram inputs', () => {
    it('should reject too long input', () => {
      const result = validateInstagram('@' + 'a'.repeat(100));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('terlalu panjang');
    });

    it('should reject username with spaces', () => {
      const result = validateInstagram('@john doe');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });

    it('should reject username with special characters', () => {
      const result = validateInstagram('@john#doe');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });

    it('should reject non-Instagram URL', () => {
      const result = validateInstagram('https://facebook.com/johndoe');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Hanya link Instagram');
    });

    it('should reject malicious URL', () => {
      const result = validateInstagram('https://malicious.com/phishing');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Hanya link Instagram');
    });

    it('should reject random text', () => {
      const result = validateInstagram('random text here');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });

    it('should reject URL with path beyond username', () => {
      const result = validateInstagram('https://instagram.com/johndoe/p/ABC123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });
  });

  describe('INSTAGRAM_REGEX constant', () => {
    it('should be exported and functional', () => {
      expect(INSTAGRAM_REGEX.test('@johndoe')).toBe(true);
      expect(INSTAGRAM_REGEX.test('https://instagram.com/johndoe')).toBe(true);
      expect(INSTAGRAM_REGEX.test('johndoe')).toBe(true);
    });
  });
});

describe('Edge Cases', () => {
  describe('Null and undefined handling', () => {
    it('validateEmail should handle null', () => {
      const result = validateEmail(null as any);
      expect(result.valid).toBe(false);
    });

    it('validateEmail should handle undefined', () => {
      const result = validateEmail(undefined as any);
      expect(result.valid).toBe(false);
    });

    it('validatePhone should handle null', () => {
      const result = validatePhone(null as any);
      expect(result.valid).toBe(false);
    });

    it('validatePhone should handle undefined', () => {
      const result = validatePhone(undefined as any);
      expect(result.valid).toBe(false);
    });

    it('validateInstagram should handle null (optional)', () => {
      const result = validateInstagram(null as any);
      expect(result.valid).toBe(true);
    });

    it('validateInstagram should handle undefined (optional)', () => {
      const result = validateInstagram(undefined as any);
      expect(result.valid).toBe(true);
    });
  });

  describe('Unicode and special characters', () => {
    it('validateEmail should reject emoji', () => {
      const result = validateEmail('user😀@example.com');
      expect(result.valid).toBe(false);
    });

    it('validatePhone should reject emoji', () => {
      const result = validatePhone('0812😀34567890');
      expect(result.valid).toBe(false);
    });

    it('validateInstagram should reject emoji in username', () => {
      const result = validateInstagram('@john😀doe');
      expect(result.valid).toBe(false);
    });
  });

  describe('SQL injection attempts', () => {
    it('validatePhone should reject SQL injection', () => {
      const result = validatePhone("0812'; DROP TABLE users;--");
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hanya boleh berisi angka');
    });

    it('validateInstagram should reject SQL injection', () => {
      const result = validateInstagram("@admin'; DROP TABLE users;--");
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });
  });

  describe('SQL injection attempts', () => {
    it('validatePhone should reject SQL injection', () => {
      const result = validatePhone("0812'; DROP TABLE users;--");
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hanya boleh berisi angka');
    });

    it('validateInstagram should reject SQL injection', () => {
      const result = validateInstagram("@admin'; DROP TABLE users;--");
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak valid');
    });
  });

  describe('XSS attempts', () => {
    it('validateEmail should reject script tags', () => {
      const result = validateEmail('<script>alert("xss")</script>@example.com');
      expect(result.valid).toBe(false);
    });

    it('validateInstagram should reject script in URL', () => {
      const result = validateInstagram('https://instagram.com/<script>alert("xss")</script>');
      expect(result.valid).toBe(false);
    });
  });
});
