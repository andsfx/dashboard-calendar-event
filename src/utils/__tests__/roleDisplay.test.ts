import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ROLE_DISPLAY_NAMES } from '../roleDisplay';
import type { UserRole } from '../../types/auth';

const ALL_ROLES: UserRole[] = [
  'superadmin',
  'admin',
  'viewer',
  'demo',
  'eo_tenant',
  'tenant_relation',
];

describe('ROLE_DISPLAY_NAMES', () => {
  it('memetakan setiap UserRole ke label yang tidak kosong', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_DISPLAY_NAMES[role], `role ${role} tanpa label`).toBeTruthy();
    }
    // Tidak ada peran yang bocor dari tabel.
    expect(Object.keys(ROLE_DISPLAY_NAMES).sort()).toEqual([...ALL_ROLES].sort());
  });

  it('tidak memakai satu label untuk semua peran', () => {
    const labels = ALL_ROLES.map(role => ROLE_DISPLAY_NAMES[role]);
    expect(new Set(labels).size).toBe(ALL_ROLES.length);
  });

  it('tidak pernah menyebut viewer/demo/tenant sebagai Administrator', () => {
    // Regresi bug: pelat peran rail menulis "Administrator" untuk SEMUA peran
    // selain superadmin, sehingga viewer, demo, dan akun tenant melihat diri
    // mereka sebagai admin.
    for (const role of ['viewer', 'demo', 'eo_tenant', 'tenant_relation'] as const) {
      expect(ROLE_DISPLAY_NAMES[role]).not.toMatch(/administrator/i);
    }
  });
});

describe('permukaan admin — label peran tidak boleh hardcoded', () => {
  const read = (rel: string) => readFileSync(resolve(process.cwd(), 'src', rel), 'utf8');

  it('AdminSidebar membaca peran nyata, bukan literal "Administrator"', () => {
    const src = read('components/dashboard/AdminSidebar.tsx');
    expect(src).toContain('ROLE_DISPLAY_NAMES[user.role]');
    // Literal lama tidak boleh muncul lagi sebagai teks yang dirender.
    expect(src).not.toMatch(/['"]Administrator['"]/);
  });

  it('gate badan modul Konten memakai flag View yang sama dengan rail', () => {
    const src = read('components/dashboard/DashboardPage.tsx');
    // Rail memakai canViewSettings/canViewSponsorship; badan harus sama, jika
    // tidak akun demo mendarat di halaman kosong.
    expect(src).not.toMatch(/canManageSettings\s*&&\s*dashboardPath === '\/content\//);
  });
});
