import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LetterWorkspace } from '../LetterWorkspace';
import type { EventItem } from '../../../types';
import { EMPTY_SKE, EMPTY_SIK } from '../letterDocuments';
import { loadPairs, savePairs, loadDraft, saveDraft } from '../../../lib/letterStudio/persistence';
import type { LetterPair } from '../../../lib/letterStudio/schema';
import { exportBackup, importBackup } from '../../../lib/letterStudio/backup';

const listLetters = vi.fn();
const createLetter = vi.fn();
const updateLetter = vi.fn();
const deleteLetter = vi.fn();

vi.mock('../../../utils/domainApi', () => ({
  fetchGeneratedLetters: (...args: unknown[]) => listLetters(...args),
  createGeneratedLetter: (...args: unknown[]) => createLetter(...args),
  updateGeneratedLetter: (...args: unknown[]) => updateLetter(...args),
  deleteGeneratedLetter: (...args: unknown[]) => deleteLetter(...args),
}));

vi.mock('../../../utils/letterPdfExport', () => ({
  renderLetterPdfBase64: vi.fn().mockResolvedValue('c2tl'),
  downloadLetterPdf: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../utils/sikPdfExport', () => ({
  renderSikPdfBase64: vi.fn().mockResolvedValue('c2lr'),
  downloadSikPdf: vi.fn().mockResolvedValue(undefined),
}));

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 'evt_1', sheetRow: 1, rowIndex: 0,
    dateStr: '2026-05-09', day: 'Sabtu  ', jam: '10.00 - 19.00',
    acara: 'Lomba Sanggar Tari Kreasi', lokasi: 'Panggung Funworld Lt. 3',
    eo: 'PT Kreasi Panggung Nusantara', pic: 'Rani Kusumawardhani',
    phone: '0812-3456-7890', keterangan: '', month: 'Mei',
    category: 'Hiburan', categories: ['Hiburan'], priority: 'medium',
    eventModel: 'free', eventNominal: '', eventModelNotes: '',
    tanggal: '9 Mei 2026', status: 'upcoming',
    ...overrides,
  };
}

function pair(overrides: Partial<LetterPair> = {}): LetterPair {
  return {
    id: 'pair_1',
    eventId: 'evt_1',
    title: 'Lomba Sanggar Tari Kreasi',
    ske: { ...EMPTY_SKE, nomorSurat: 'SKE-pair_1', namaEvent: 'Event A' },
    sik: { ...EMPTY_SIK, nomorSurat: 'SIK-pair_1', namaEvent: 'Event A' },
    status: 'draft',
    createdAt: '2026-11-08T00:00:00Z',
    updatedAt: '2026-11-08T00:00:00Z',
    ...overrides,
  };
}

describe('LetterWorkspace — opens directly', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    listLetters.mockResolvedValue([]);
    createLetter.mockImplementation(async (args: { letterData: { docType: string; nomorSurat: string } }) => ({
      id: `srv-${args.letterData.docType}`, letterData: args.letterData,
      createdAt: '2026-11-08T00:00:00Z', status: 'active', docType: args.letterData.docType,
    }));
    updateLetter.mockImplementation(async (id: string, patch: Record<string, unknown>) => ({ id, ...patch }));
  });

  it('tidak menampilkan modal pilih event; dua tab hadir + status Draft lokal', () => {
    render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    expect(screen.queryByText('Pilih event untuk membuat surat.')).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByText('Draft lokal')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Surat Konfirmasi Event/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('nomor otomatis terisi dan tetap bisa ditimpa pengguna', () => {
    render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    const nomor = screen.getAllByDisplayValue(/\/\d{4}$/).find((el) => (el as HTMLInputElement).value.includes('/MMB/'));
    expect(nomor).toBeTruthy();
    fireEvent.change(nomor!, { target: { value: '999/MMB/XII/2026' } });
    expect(screen.getByDisplayValue('999/MMB/XII/2026')).toBeInTheDocument();
  });

  it('Isi dari event memuat modal dan mengisi field', async () => {
    render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Isi dari event' }));
    await screen.findByText('Pilih event untuk membuat surat.');
    fireEvent.click(screen.getByRole('button', { name: /Lomba Sanggar Tari Kreasi/ }));
    await waitFor(() => {
      expect(screen.getByLabelText('Nama Event Organizer')).toHaveValue('PT Kreasi Panggung Nusantara');
    });
  });

  it('Isi dari event dengan isian yang sudah diketik: dialog muncul, batal mempertahankan isian, lanjut memuat event', async () => {
    render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    // Ketik isian NYATA (bukan nomor/tanggal hasil auto-suggest) → butuh konfirmasi.
    const eoInput = document.getElementById('letter-nama-eo') as HTMLInputElement;
    fireEvent.change(eoInput, { target: { value: 'EO Sudah Diketik' } });
    fireEvent.click(screen.getByRole('button', { name: 'Isi dari event' }));
    await screen.findByText('Pilih event untuk membuat surat.');
    fireEvent.click(screen.getByRole('button', { name: /Lomba Sanggar Tari Kreasi/ }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Isi dari event akan menimpa isian yang sudah diketik.');
    // Batal → isian pengguna dipertahankan, picker tetap terbuka.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Batal' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByDisplayValue('EO Sudah Diketik')).toBeInTheDocument();
    // Event belum dimuat: mirror menyetujuiOrg (= namaEO event) masih kosong.
    expect(screen.getByLabelText('Nama organisasi EO')).toHaveValue('');
    // Lanjutkan → event dimuat (menimpa isian).
    fireEvent.click(screen.getByRole('button', { name: /Lomba Sanggar Tari Kreasi/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Lanjutkan' }));
    await waitFor(() => expect(screen.getByLabelText('Nama Event Organizer')).toHaveValue('PT Kreasi Panggung Nusantara'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByText('Pilih event untuk membuat surat.')).toBeNull();
  });

  it('Terbitkan menulis dua baris, menyimpan dua id, status jadi Terbit', async () => {
    const complete = pair({
      ske: {
        ...EMPTY_SKE, tanggalSurat: '2026-11-08', nomorSurat: '041/MMB/VII/2026',
        namaEO: 'PT Kreasi', penanggungJawab: 'Rani', alamatEO: 'Bekasi',
        namaEvent: 'Lomba', lokasi: 'Panggung', hariTanggalPelaksanaan: 'Sabtu, 9 Mei 2026',
        menyetujuiNama: 'Rani',
      },
      sik: {
        ...EMPTY_SIK, tanggalSurat: '2026-11-08', nomorSurat: '041A/MMB/MKT.SIKI/VII/2026',
        namaEO: 'PT Kreasi', penanggungJawab: 'Rani', nomorHp: '0812',
        jenisKegiatan: 'Loading', tanggalMulai: '9 Mei 2026', waktu: '10.00', lokasi: 'Panggung',
      },
    });
    saveDraft(complete);
    render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Terbitkan surat' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Terbitkan surat' }));
    await waitFor(() => expect(createLetter).toHaveBeenCalledTimes(2));
    expect(createLetter).toHaveBeenCalledWith(expect.objectContaining({
      letterData: expect.objectContaining({ docType: 'ske' }), pdfBase64: expect.any(String),
    }));
    expect(createLetter).toHaveBeenCalledWith(expect.objectContaining({
      letterData: expect.objectContaining({ docType: 'sik' }), pdfBase64: expect.any(String),
    }));
    await waitFor(() => expect(screen.getByText('Terbit')).toBeInTheDocument());
    const stored = loadPairs();
    expect(stored).toHaveLength(1);
    expect(stored[0].publishedIds).toEqual({ ske: 'srv-ske', sik: 'srv-sik' });
  });

  it('Bagikan nonaktif sebelum terbit dan aktif sesudahnya', async () => {
    const first = render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    expect(screen.getByRole('button', { name: 'Bagikan surat' })).toBeDisabled();
    first.unmount();
    const published = pair({ status: 'published', publishedIds: { ske: 'srv-ske', sik: 'srv-sik' } });
    savePairs([published]);
    saveDraft(published);
    render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bagikan surat' })).toBeEnabled());
  });
});

describe('LetterWorkspace — autosave & riwayat lokal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    listLetters.mockResolvedValue([]);
  });

  it('autosave 300ms memulihkan ketikan setelah remount', async () => {
    const view = render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    const nomor = screen.getAllByDisplayValue(/\/\d{4}$/).find((el) => (el as HTMLInputElement).value.includes('/MMB/'))!;
    fireEvent.change(nomor, { target: { value: '777/MMB/VII/2026' } });
    await waitFor(() => expect(loadDraft()?.ske.nomorSurat).toBe('777/MMB/VII/2026'), { timeout: 1500 });
    view.unmount();
    render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    expect(screen.getByDisplayValue('777/MMB/VII/2026')).toBeInTheDocument();
  });

  it('membuka satu sisi pasangan menghidrasi KEDUA sisi pasangan yang sama', async () => {
    const a = pair({ id: 'pair_a', title: 'Event A', ske: { ...EMPTY_SKE, nomorSurat: 'SKE-a' }, sik: { ...EMPTY_SIK, nomorSurat: 'SIK-a' } });
    const b = pair({ id: 'pair_b', title: 'Event B', ske: { ...EMPTY_SKE, nomorSurat: 'SKE-b' }, sik: { ...EMPTY_SIK, nomorSurat: 'SIK-b' } });
    savePairs([a, b]);
    render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Buka riwayat surat' }));
    const bRow = screen.getByText('Event B').closest('li')!;
    fireEvent.click(within(bRow).getByRole('button', { name: 'Buka surat' }));
    await waitFor(() => expect(screen.getByDisplayValue('SKE-b')).toBeInTheDocument());
    expect(screen.queryByDisplayValue('SKE-a')).toBeNull();
    // Radix Tabs mengaktifkan trigger pada mousedown (perilaku pointer nyata),
    // bukan pada event `click` sintetis tanpa pointerdown.
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Surat Izin Kerja/ }), { button: 0 });
    expect(screen.getByDisplayValue('SIK-b')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('SIK-a')).toBeNull();
  });

  it('publish tidak menimpa baris event lain: savedRef di-reset saat pindah pasangan', async () => {
    const a = pair({ id: 'pair_a', title: 'Event A', status: 'published', publishedIds: { ske: 'srv-a-ske', sik: 'srv-a-sik' } });
    const b = pair({
      id: 'pair_b', title: 'Event B',
      ske: {
        ...EMPTY_SKE, nomorSurat: 'SKE-b', tanggalSurat: '2026-11-08', namaEO: 'EO B',
        penanggungJawab: 'PIC B', alamatEO: 'Bekasi', namaEvent: 'Event B', lokasi: 'Lobi',
        hariTanggalPelaksanaan: 'Minggu, 10 Mei 2026', menyetujuiNama: 'PIC B',
      },
      sik: {
        ...EMPTY_SIK, nomorSurat: 'SIK-b', tanggalSurat: '2026-11-08', namaEO: 'EO B',
        penanggungJawab: 'PIC B', nomorHp: '0813', jenisKegiatan: 'Loading B',
        tanggalMulai: '10 Mei 2026', waktu: '09.00', lokasi: 'Lobi',
      },
    });
    savePairs([a, b]);
    render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Buka riwayat surat' }));
    const bRow = screen.getByText('Event B').closest('li')!;
    fireEvent.click(within(bRow).getByRole('button', { name: 'Buka surat' }));
    await waitFor(() => expect(screen.getByDisplayValue('SKE-b')).toBeInTheDocument());
    // Pair B belum terbit → Terbitkan harus CREATE dua baris baru…
    await waitFor(() => expect(screen.getByRole('button', { name: 'Terbitkan surat' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Terbitkan surat' }));
    await waitFor(() => expect(createLetter).toHaveBeenCalledTimes(2));
    // …bukan UPDATE id milik pasangan A (regresi: savedRef warisan event lain).
    expect(updateLetter).not.toHaveBeenCalledWith('srv-a-ske', expect.anything());
    expect(updateLetter).not.toHaveBeenCalledWith('srv-a-sik', expect.anything());
    expect(loadPairs().find((p) => p.id === 'pair_b')?.publishedIds).toEqual({ ske: 'srv-ske', sik: 'srv-sik' });
  });

  it('duplikat menghasilkan id baru dan nomor baru', async () => {
    const base = pair({ id: 'pair_a', title: 'Event A', ske: { ...EMPTY_SKE, nomorSurat: '041/MMB/VII/2026' }, sik: { ...EMPTY_SIK, nomorSurat: '041A/MMB/MKT.SIKI/VII/2026' } });
    savePairs([base]);
    render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Buka riwayat surat' }));
    const row = screen.getByText('Event A').closest('li')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Duplikat' }));
    await waitFor(() => expect(loadPairs()).toHaveLength(2));
    const dup = loadPairs().find((p) => p.id !== 'pair_a')!;
    expect(dup.id).not.toBe('pair_a');
    expect((dup.ske as { nomorSurat: string }).nomorSurat).toBe('042/MMB/MKT.MC/XI/2026');
    expect((dup.sik as { nomorSurat: string }).nomorSurat).toBe('042A/MMB/MKT.SIKI/XI/2026');
  });

  it('backup JSON round-trip lewat exportBackup/importBackup', () => {
    const exported = exportBackup([pair()]);
    const json = JSON.stringify(exported);
    const result = importBackup(json, []);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.merged[0].id).toBe('pair_1');
  });
});

describe('LetterWorkspace — hapus pasangan dengan konfirmasi', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    listLetters.mockResolvedValue([]);
  });

  it('hapus pasangan menampilkan dialog konfirmasi; konfirmasi menghapus dari riwayat lokal', async () => {
    savePairs([pair({ id: 'pair_1', title: 'Event A' })]);
    render(<LetterWorkspace events={[makeEvent()]} readOnly={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Buka riwayat surat' }));
    const row = screen.getByText('Event A').closest('li')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Hapus' }));
    // Dialog konfirmasi muncul (bukan window.confirm).
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Hapus dokumen lokal ini?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hapus' }));
    await waitFor(() => expect(loadPairs()).toHaveLength(0));
    expect(screen.queryByText('Event A')).toBeNull();
  });
});
