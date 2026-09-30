import { describe, expect, it, vi, afterEach } from 'vitest';
import { downloadBlob, safeFileName } from '../../lib/download';

describe('safeFileName', () => {
  it('membuang karakter yang tidak aman untuk nama berkas', () => {
    expect(safeFileName('dokumentasi event 2026')).toBe('dokumentasi-event-2026');
    expect(safeFileName('001/MMB/IX/2026')).toBe('001-MMB-IX-2026');
    expect(safeFileName('a'.repeat(200)).length).toBe(80);
  });

  it('memakai fallback saat hasilnya kosong', () => {
    expect(safeFileName('///', 'album-export')).toBe('album-export');
    expect(safeFileName('', 'dokumen')).toBe('dokumen');
  });
});

describe('downloadBlob', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('melepas object URL setelah unduhan dimulai, bukan seketika', () => {
    // Regresi: melepas object URL sinkron tepat setelah click() bisa
    // membatalkan unduhan yang belum sempat dimulai (Safari/Firefox).
    vi.useFakeTimers();
    const revoke = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: revoke });

    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    downloadBlob(new Blob(['x']), 'berkas.pdf');

    expect(click).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe('berkas.pdf');
    // Belum dilepas saat click — masih menunggu tick berikutnya.
    expect(revoke).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(revoke).toHaveBeenCalledWith('blob:mock');
  });
});
