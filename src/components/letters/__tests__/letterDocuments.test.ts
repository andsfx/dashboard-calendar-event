import { describe, expect, it } from 'vitest';
import type { EventItem } from '../../../types';
import { normalizeLetterData, readDocType, isSikDocument } from '../../../lib/letterDocType';
import {
  buildInitialPair, validateRequired, SIK_SYARAT, SIK_REQUIRED_FIELDS, SIK_ERRORS,
  EMPTY_SIK, DOC_TYPE_LABEL,
  EMPTY_SKE, SKE_REQUIRED_FIELDS, SKE_ERRORS, SKE_PAID_FIELDS,
} from '../letterDocuments';

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 'evt_1', sheetRow: 1, rowIndex: 0,
    dateStr: '2026-05-09', dateEnd: '2026-05-10', day: 'Sabtu  ', jam: '10.00 - 19.00',
    acara: 'Lomba Sanggar Tari Kreasi', lokasi: 'Panggung Lt 3',
    eo: 'Sanggar Tari Srikandi', pic: 'Rani Kusumawardhani', phone: '0812-3456-7890',
    keterangan: '', month: 'Mei', category: 'Hiburan', categories: ['Hiburan'],
    priority: 'medium', eventModel: 'free', eventNominal: '', eventModelNotes: '',
    tanggal: '9 Mei 2026', status: 'upcoming',
    ...overrides,
  };
}

describe('docType — diskriminator di JSONB, tanpa DDL', () => {
  it('baris lama tanpa docType dibaca sebagai SKE', () => {
    expect(readDocType({ nomorSurat: '001/X/2026' })).toBe('ske');
    expect(readDocType(null)).toBe('ske');
  });

  it('docType sik dibedakan, nilai asing jatuh ke ske', () => {
    expect(readDocType({ docType: 'sik' })).toBe('sik');
    expect(readDocType({ docType: 'lain' })).toBe('ske');
  });

  it('normalizeLetterData menyuntik docType tanpa membuang field warisan', () => {
    const old = { nomorSurat: '001/X/2026', hariTanggalLoading: 'Jumat, 8 Mei 2026' };
    const out = normalizeLetterData(old);
    expect(out.docType).toBe('ske');
    expect(out.nomorSurat).toBe('001/X/2026');
    expect((out as typeof old).hariTanggalLoading).toBe('Jumat, 8 Mei 2026');
    expect(isSikDocument(out)).toBe(false);
  });

  it('isSikDocument mempersempit union ke SikRequestItem', () => {
    const sik = normalizeLetterData({ docType: 'sik', ...EMPTY_SIK });
    expect(isSikDocument(sik)).toBe(true);
    expect(DOC_TYPE_LABEL[readDocType(sik)]).toBe('Surat Izin Kerja');
  });
});

describe('buildInitialPair — auto-isi dari event produksi', () => {
  it('SKE format resmi: Pimpinan Unit, menyetujui dari PIC + nama EO, WIB suffix', () => {
    const { ske } = buildInitialPair(makeEvent());
    expect(ske.hariTanggalPelaksanaan).toBe('Sabtu, 9 Mei 2026');
    expect(ske.namaEO).toBe('Sanggar Tari Srikandi');
    expect(ske.tempatSurat).toBe('Bekasi');
    expect(ske.penandatanganJabatan).toBe('Pimpinan Unit');
    expect(ske.waktuPelaksanaan).toBe('10.00 - 19.00 WIB');
    expect(ske.menyetujuiNama).toBe('Rani Kusumawardhani');
    expect(ske.menyetujuiOrg).toBe('Sanggar Tari Srikandi');
    expect(ske.nomorTelepon).toBe('0812-3456-7890');
  });

  it('WIB tidak digandakan bila event.jam sudah menyertakannya', () => {
    const { ske } = buildInitialPair(makeEvent({ jam: '08.00 - 18.00 WIB' }));
    expect(ske.waktuPelaksanaan).toBe('08.00 - 18.00 WIB');
  });

  it('jadwal loading tidak lagi diauto-isi di SKE (milik SIK)', () => {
    const { ske } = buildInitialPair(makeEvent());
    expect(ske.hariTanggalLoading).toBe('');
    expect(ske.waktuLoading).toBe('');
  });

  it('nomorTelepon terisi otomatis tapi tidak wajib', () => {
    const { ske } = buildInitialPair(makeEvent({ phone: '' }));
    expect(ske.nomorTelepon).toBe('');
    expect(SKE_REQUIRED_FIELDS).not.toContain('nomorTelepon');
  });

  it('SKE_REQUIRED_FIELDS: loading dihapus, menyetujuiNama masuk', () => {
    expect(SKE_REQUIRED_FIELDS).not.toContain('hariTanggalLoading');
    expect(SKE_REQUIRED_FIELDS).not.toContain('waktuLoading');
    expect(SKE_REQUIRED_FIELDS).toContain('menyetujuiNama');
  });

  it('EMPTY_SKE memuat field format resmi + varian berbayar kosong', () => {
    expect(EMPTY_SKE.menyetujuiNama).toBe('');
    expect(EMPTY_SKE.menyetujuiOrg).toBe('');
    expect(EMPTY_SKE.biayaKebersihan).toBe('');
    expect(EMPTY_SKE.vaBank).toBe('');
    expect(SKE_PAID_FIELDS).toEqual(['biayaKebersihan', 'vaBank']);
  });

  it('validasi SKE: menyetujuiNama kosong → galat; loading tidak divalidasi', () => {
    const errors = validateRequired(EMPTY_SKE, SKE_REQUIRED_FIELDS, SKE_ERRORS);
    expect(errors.menyetujuiNama).toBe('Nama penyetuju (EO) wajib diisi');
    expect(errors.hariTanggalLoading).toBeUndefined();
    expect(errors.waktuLoading).toBeUndefined();
  });

  it('field SKE terisi → tanpa galat', () => {
    const filled = { ...EMPTY_SKE, ...Object.fromEntries(SKE_REQUIRED_FIELDS.map((f) => [f, 'isi'])) };
    expect(validateRequired(filled, SKE_REQUIRED_FIELDS, SKE_ERRORS)).toEqual({});
  });

  it('SIK mengambil alih jadwal loading + No. Hp lapangan', () => {
    const { sik } = buildInitialPair(makeEvent());
    expect(sik.nomorHp).toBe('0812-3456-7890');
    expect(sik.jenisKegiatan).toBe('Loading & Unloading Lomba Sanggar Tari Kreasi');
    expect(sik.tanggalMulai).toBe('9 Mei 2026');
    expect(sik.tanggalSelesai).toBe('2026-05-10');
    expect(sik.penandatanganJabatan).toBe('Marcomm Manager');
  });

  it('event single-day memakai tanggal yang sama untuk mulai & selesai', () => {
    const { sik } = buildInitialPair(makeEvent({ dateEnd: undefined, tanggal: '1 Juni 2026' }));
    expect(sik.tanggalMulai).toBe('1 Juni 2026');
    expect(sik.tanggalSelesai).toBe('1 Juni 2026');
  });
});

describe('SIK_SYARAT & validasi per field', () => {
  it('enam syarat tetap, termasuk larangan merokok', () => {
    expect(SIK_SYARAT).toHaveLength(6);
    expect(SIK_SYARAT.at(-1)).toContain('DILARANG MEROKOK');
  });

  it('pesan galat per field, bukan satu baris global', () => {
    const errors = validateRequired(EMPTY_SIK, SIK_REQUIRED_FIELDS, SIK_ERRORS);
    expect(errors.nomorSurat).toBe('Nomor surat wajib diisi');
    expect(errors.nomorHp).toBe('No. Hp penanggung jawab wajib diisi');
    expect(errors.tanggalSelesai).toBeUndefined();
    expect(errors.catatan).toBeUndefined();
  });

  it('field terisi tidak menghasilkan galat', () => {
    const filled = { ...EMPTY_SIK, ...Object.fromEntries(SIK_REQUIRED_FIELDS.map((f) => [f, 'isi'])) };
    expect(validateRequired(filled, SIK_REQUIRED_FIELDS, SIK_ERRORS)).toEqual({});
  });
});
