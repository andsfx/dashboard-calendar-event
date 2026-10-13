import { describe, expect, it } from 'vitest';

import {
  jakartaToday,
  notStartedOn,
  SAFE_DATE_PATTERN,
  startedOnOrBefore,
  startedStatusCase,
} from '../eventWindow.js';

/**
 * Regresi P0 (terverifikasi di produksi): GET /api/v1/tenant/events hanya
 * mengembalikan 1 dari 5 event aktif karena filter `status IN ('past','ongoing')`.
 *
 * `publishDraft` tidak pernah menulis kolom `status`, jadi tiap event dari draft
 * terkunci 'upcoming' selamanya — 258/258 event produksi. Kolom itu bukan sumber
 * kebenaran; tanggal yang authoritative (ADR 002).
 *
 * Predicate yang benar = "sudah mulai" (date_str <= hari ini WIB), mencakup
 * event selesai (past) maupun sedang berjalan (ongoing).
 */
describe('jakartaToday', () => {
  it('menghitung hari kalender WIB, bukan UTC, pada window 00:00-07:00 WIB', () => {
    // 2026-09-01 17:00 UTC sudah 2026-09-02 00:00 WIB.
    expect(jakartaToday(new Date('2026-09-01T17:00:00Z'))).toBe('2026-09-02');
    // 2026-09-02 16:00 UTC = 2026-09-02 23:00 WIB, masih hari yang sama.
    expect(jakartaToday(new Date('2026-09-02T16:00:00Z'))).toBe('2026-09-02');
  });
});

describe('startedOnOrBefore', () => {
  it('memakai placeholder parameter, bukan tanggal yang diinterpolasi', () => {
    const sql = startedOnOrBefore('e.date_str', '$2');
    expect(sql).toContain('$2::date');
    // Tidak boleh ada literal tanggal hasil perhitungan aplikasi di dalam SQL.
    expect(sql).not.toMatch(/'\d{4}-\d{2}-\d{2}'/);
  });

  it('menjaga kolom TEXT tetap aman terhadap data non-ISO dan bulan invalid', () => {
    const sql = startedOnOrBefore('e.date_str', '$2');
    expect(sql).toContain(`e.date_str ~ '${SAFE_DATE_PATTERN}'`);
    expect(sql).toContain("to_date(e.date_str, 'YYYY-MM-DD')");
  });

  it('menolak bulan 13 dan hari 32 agar to_date tidak melempar 22007', () => {
    // Kenessian nyata: pola longgar `\d{2}` membuat "2026-13-01" lolos guard
    // lalu menggagalkan to_date → seluruh endpoint 500.
    expect('2026-13-01').not.toMatch(new RegExp(SAFE_DATE_PATTERN));
    expect('2026-00-10').not.toMatch(new RegExp(SAFE_DATE_PATTERN));
    expect('2026-09-32').not.toMatch(new RegExp(SAFE_DATE_PATTERN));
    // Tanggal valid tetap lolos.
    expect('2026-09-01').toMatch(new RegExp(SAFE_DATE_PATTERN));
    expect('2026-12-31').toMatch(new RegExp(SAFE_DATE_PATTERN));
  });

  it('tidak pernah memberi regex guard pada kolom date_end yang bertipe DATE', () => {
    // `date ~ unknown` tidak eksis di Postgres; guard hanya untuk kolom TEXT.
    expect(startedStatusCase('e.date_str', 'e.date_end', '$2')).not.toContain('e.date_end ~');
  });
});

describe('keselamatan cast: to_date hanya lewat CASE', () => {
  // Postgres boleh mengevaluasi operand `AND` dalam urutan apa pun, jadi
  // `col ~ regex AND to_date(col, …)` masih bisa menjalankan to_date pada baris
  // malformed dan melempar 22007 — seluruh endpoint 500. Hanya CASE yang
  // dijamin berurutan.
  const helpers = {
    startedOnOrBefore: startedOnOrBefore('e.date_str', '$1'),
    notStartedOn: notStartedOn('e.date_str', '$1'),
    startedStatusCase: startedStatusCase('e.date_str', 'e.date_end', '$1'),
  };

  it('setiap helper memakai CASE WHEN <regex> THEN to_date(...)', () => {
    for (const [name, sql] of Object.entries(helpers)) {
      expect(sql, name).toContain("CASE WHEN e.date_str ~ '");
      expect(sql, name).toContain("THEN to_date(e.date_str, 'YYYY-MM-DD') END");
    }
  });

  it('tidak ada helper yang memakai pola `regex AND to_date(...)`', () => {
    for (const [name, sql] of Object.entries(helpers)) {
      // Bentuk berbahaya: regex diikuti AND lalu to_date pada kolom yang sama.
      expect(sql, name).not.toMatch(/~ '[^']*'\s+AND\s+to_date\(e\.date_str/);
    }
  });

  it('setiap to_date pada kolom tanggal berada di dalam CASE', () => {
    for (const [name, sql] of Object.entries(helpers)) {
      // Setiap kemunculan to_date(...) harus didahului 'CASE WHEN <col> ~ '.
      const occurrences = sql.split('to_date(').length - 1;
      const guarded = (sql.match(/CASE WHEN [A-Za-z_.]+ ~ '[^']*' THEN to_date\(/g) || []).length;
      expect(guarded, `${name}: ${occurrences} to_date, ${guarded} terjaga`).toBe(occurrences);
    }
  });

  it('perbandingan dilakukan pada hasil CASE, bukan kolom mentah', () => {
    expect(helpers.startedOnOrBefore).toContain('END IS NOT NULL AND');
    expect(helpers.notStartedOn).toContain('END IS NOT NULL AND');
  });
});

describe('startedStatusCase', () => {
  const sql = startedStatusCase('e.date_str', 'e.date_end', '$2');

  it('menangani date_end NULL eksplisit agar single-day tidak salah label', () => {
    // Tanpa klausa NULL, `NULL < $2::date` = NULL → ELSE 'ongoing' untuk semua.
    expect(sql).toContain('e.date_end IS NULL OR e.date_end < $2::date');
  });

  it('tidak pernah menghasilkan upcoming — hanya past atau ongoing', () => {
    expect(sql).toContain("THEN 'past'");
    expect(sql).toContain("ELSE 'ongoing'");
    expect(sql).not.toContain('upcoming');
  });

  it('membandingkan tanggal mulai hari ini sebagai ongoing (bukan upcoming)', () => {
    // `start < today` → belum; event yang mulai HARI INI jatuh ke ELSE ongoing.
    expect(sql).toContain('END < $2::date');
  });
});