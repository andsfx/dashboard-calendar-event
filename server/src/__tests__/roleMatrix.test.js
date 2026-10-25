/**
 * Matriks role baca-saja (`demo` vs `viewer`) — kontrak keamanan.
 *
 * Demo adalah akun peragaan: seluruh permukaan dashboard boleh dilihat.
 * Viewer hanya boleh membaca permukaan yang SPEC.md §2 berikan: registrasi
 * komunitas + kolaborasi tenant. Sebelum pemisahan ini keduanya berbagi satu
 * allowlist, sehingga viewer bisa membaca event, draft, surat, dan lead sponsor
 * yang bukan haknya.
 *
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import {
  canAccessSurveyEvent,
  canPerformAdminAction,
  DEMO_READ_ACTIONS,
  READ_ONLY_ACTIONS,
  VIEWER_READ_ACTIONS,
  SURVEY_READ_ROLES,
  SURVEY_EXPORT_ROLES,
  TENANT_EXPORT_ROLES,
  maskPiiDeep,
  publicUser,
} from '../auth.js';

/** 15 aksi baca yang memang dibuka untuk demo (perilaku lama, tidak berubah). */
const DEMO_ONLY_READ_ACTIONS = [
  'listEvents',
  'readDrafts',
  'listLetters',
  'listSponsorLeads',
  'listExhibitions',
  'listExhibitionLeads',
  'getLocationMapping',
  'listExhibitionActivations',
];

const VIEWER_ALLOWED = [
  'readRegistrations',
  'listTenantEventProposals',
  'listTenantParticipations',
  'listTenantParticipationOptions',
];

const VIEWER_DENIED_READS = [
  'listEvents',
  'readDrafts',
  'listSponsorLeads',
  'listLetters',
  'listExhibitions',
  'listExhibitionLeads',
];

describe('viewer — allowlist sempit', () => {
  it('menolak aksi baca yang bukan haknya', () => {
    for (const action of VIEWER_DENIED_READS) {
      expect(canPerformAdminAction('viewer', action), action).toBe(false);
    }
  });

  it('mengizinkan registrasi & kolaborasi tenant', () => {
    for (const action of VIEWER_ALLOWED) {
      expect(canPerformAdminAction('viewer', action), action).toBe(true);
    }
  });

  it('menolak seluruh aksi tulis', () => {
    for (const action of ['updateRegistrationStatus', 'deleteEvent', 'createLetter', 'publishDraft']) {
      expect(canPerformAdminAction('viewer', action), action).toBe(false);
    }
  });
});

describe('demo — seluruh aksi baca terbuka', () => {
  it('mengizinkan ke-15 aksi baca', () => {
    expect(DEMO_READ_ACTIONS.size).toBe(15);
    for (const action of DEMO_READ_ACTIONS) {
      expect(canPerformAdminAction('demo', action), action).toBe(true);
    }
  });

  it('tetap menolak aksi tulis', () => {
    for (const action of ['createEvent', 'deleteEvent', 'updateRegistrationStatus', 'createLetter']) {
      expect(canPerformAdminAction('demo', action), action).toBe(false);
    }
  });

  it('READ_ONLY_ACTIONS tetap alias ke DEMO_READ_ACTIONS', () => {
    expect(READ_ONLY_ACTIONS).toBe(DEMO_READ_ACTIONS);
  });

  it('memuat aksi baca demo-only yang ditolak viewer', () => {
    for (const action of DEMO_ONLY_READ_ACTIONS) {
      expect(DEMO_READ_ACTIONS.has(action), action).toBe(true);
      expect(VIEWER_READ_ACTIONS.has(action), action).toBe(false);
    }
  });
});

describe('staff — tidak dibatasi allowlist', () => {
  it('lolos untuk aksi apa pun', () => {
    for (const role of ['superadmin', 'admin', 'eo_tenant', 'tenant_relation']) {
      expect(canPerformAdminAction(role, 'deleteEvent'), role).toBe(true);
    }
  });
});

describe('daftar role ekspor/global', () => {
  it('SURVEY_READ_ROLES memuat demo', () => {
    expect(SURVEY_READ_ROLES).toEqual(expect.arrayContaining(['superadmin', 'admin', 'viewer', 'eo_tenant', 'demo']));
  });

  it('SURVEY_EXPORT_ROLES = staff + viewer, tanpa demo & eo_tenant', () => {
    expect(SURVEY_EXPORT_ROLES).toEqual(['superadmin', 'admin', 'viewer']);
    expect(SURVEY_EXPORT_ROLES).not.toContain('demo');
    // EO hanya boleh event yang ditugaskan; CSV memuat satu event penuh.
    expect(SURVEY_EXPORT_ROLES).not.toContain('eo_tenant');
  });

  it('TENANT_EXPORT_ROLES staff saja (tanpa demo & tenant_relation)', () => {
    expect(TENANT_EXPORT_ROLES).toEqual(['superadmin', 'admin']);
  });
});

describe('maskPiiDeep', () => {
  it('menyamarkan PII bersarang tanpa merusak struktur', () => {
    const input = {
      title: 'Surat Peminjaman',
      pic: { nama: 'Budi Santoso', telepon: '081234567890', email: 'budi@mail.com' },
      tenant_name: 'Toko Sepatu',
      items: [{ nama_gerai: 'Cabang A', no_hp: '081298765432' }],
      kontak: 'Siti Aminah',
      jumlah: 3,
    };

    const out = maskPiiDeep(input);

    expect(out.title).toBe('Surat Peminjaman');
    expect(out.tenant_name).toBe('Toko Sepatu');
    expect(out.pic.nama).toBe('B***i S***o');
    expect(out.pic.telepon).toBe('********7890');
    expect(out.pic.email).toBe('b***i@mail.com');
    expect(out.items[0].nama_gerai).toBe('C***g A');
    expect(out.items[0].no_hp).toBe('********5432');
    expect(out.kontak).toBe('S***i A***h');
    expect(out.jumlah).toBe(3);
    // argumen tidak dimutasi
    expect(input.pic.nama).toBe('Budi Santoso');
  });

  it('meneruskan nilai non-objek apa adanya', () => {
    expect(maskPiiDeep(null)).toBeNull();
    expect(maskPiiDeep('budi@mail.com')).toBe('budi@mail.com');
  });

  it('menangani kunci nyata LetterRequestItem (camelCase) + alamat', () => {
    const letter = {
      nomor: '001/A/B/2026',
      namaEO: 'PT Kreatif Nusantara',
      penanggungJawab: 'Budi Santoso',
      nomorTelepon: '081234567890',
      alamatEO: 'Jl. Sudirman No. 1',
    };

    const out = maskPiiDeep(letter);

    expect(out.nomor).toBe('001/A/B/2026');
    expect(out.namaEO).toBe('P***T K***f N***a');
    expect(out.penanggungJawab).toBe('B***i S***o');
    expect(out.nomorTelepon).toBe('********7890');
    expect(out.alamatEO).toBe('***');
  });

  it('menangani varian snake_case & singkatan', () => {
    const out = maskPiiDeep({
      nama_eo: 'PT Kreatif',
      penanggung_jawab: 'Siti Aminah',
      nomor_telepon: '081298765432',
      notelp: '081255556666',
      alamat: 'Jl. Gatot Subroto 5',
    });

    expect(out.nama_eo).toBe('P***T K***f');
    expect(out.penanggung_jawab).toBe('S***i A***h');
    expect(out.nomor_telepon).toBe('********5432');
    expect(out.notelp).toBe('********6666');
    expect(out.alamat).toBe('***');
  });

  it('tidak over-mask kunci yang mirip (mis. alamat_email, namamu)', () => {
    const out = maskPiiDeep({ alamat_email: 'a@b.com', namamu: 'Budi', nomor: '001' });
    // `alamat_email` cocok pola email? Tidak: anchor ketat → tetap utuh.
    expect(out.alamat_email).toBe('a@b.com');
    expect(out.namamu).toBe('Budi');
    expect(out.nomor).toBe('001');
  });
});

describe('canAccessSurveyEvent', () => {
  it('staff/viewer/demo boleh semua event', () => {
    for (const role of ['superadmin', 'admin', 'viewer', 'demo']) {
      expect(canAccessSurveyEvent({ role }, 'evt_1'), role).toBe(true);
    }
  });

  it('eo_tenant hanya event di assigned_events', () => {
    const eo = { role: 'eo_tenant', assigned_events: ['evt_1', 'evt_2'] };
    expect(canAccessSurveyEvent(eo, 'evt_1')).toBe(true);
    expect(canAccessSurveyEvent(eo, 'evt_2')).toBe(true);
    expect(canAccessSurveyEvent(eo, 'evt_3')).toBe(false);
  });

  it('eo_tenant tanpa/tanpa assigned_events ditolak', () => {
    expect(canAccessSurveyEvent({ role: 'eo_tenant' }, 'evt_1')).toBe(false);
    expect(canAccessSurveyEvent({ role: 'eo_tenant', assigned_events: null }, 'evt_1')).toBe(false);
    expect(canAccessSurveyEvent({ role: 'eo_tenant', assigned_events: [] }, 'evt_1')).toBe(false);
  });

  it('role lain (tenant_relation/eo tak dikenal) & eventId kosong ditolak', () => {
    expect(canAccessSurveyEvent({ role: 'tenant_relation' }, 'evt_1')).toBe(false);
    expect(canAccessSurveyEvent(null, 'evt_1')).toBe(false);
    expect(canAccessSurveyEvent({ role: 'admin' }, '')).toBe(false);
  });
});

describe('publicUser', () => {
  it('menyertakan assigned_events (array) agar SPA bisa memfilter', () => {
    const out = publicUser({
      id: 'u1', email: 'eo@example.com', display_name: 'EO', role: 'eo_tenant',
      assigned_events: ['evt_1'], token_version: 0, password_hash: 'x',
    });

    expect(out).toEqual({
      id: 'u1', email: 'eo@example.com', display_name: 'EO', role: 'eo_tenant',
      assigned_events: ['evt_1'],
    });
    // Tidak membocorkan kolom sensitif.
    expect(out).not.toHaveProperty('password_hash');
    expect(out).not.toHaveProperty('token_version');
  });

  it('default ke array kosong bila kolom tidak ada / bukan array', () => {
    expect(publicUser({ id: 'u1', role: 'admin' }).assigned_events).toEqual([]);
    expect(publicUser({ id: 'u1', role: 'admin', assigned_events: null }).assigned_events).toEqual([]);
    expect(publicUser({ id: 'u1', role: 'admin', assigned_events: 'evt_1' }).assigned_events).toEqual([]);
  });
});
