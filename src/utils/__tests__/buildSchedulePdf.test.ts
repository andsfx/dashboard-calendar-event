import { describe, expect, it } from 'vitest';
import type { EventItem } from '../../types';
import { buildSchedulePdf } from '../../components/pdf/buildSchedulePdf';
import { renderEventsSchedulePdfBlob } from '../eventsSchedulePdf';
import { extractPdfStrings } from '../../test/pdfText';

function ev(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'status' | 'acara'>): EventItem {
  return {
    rowIndex: 0,
    tanggal: '1 Januari 2026',
    dateStr: '2026-01-01',
    day: 'Kamis',
    jam: '10:00 - 12:00',
    lokasi: 'Atrium',
    eo: 'EO',
    pic: '',
    phone: '',
    keterangan: '',
    month: 'Januari',
    category: 'Umum',
    categories: ['Umum'],
    priority: 'medium',
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
    ...partial,
  };
}

const FIXTURE = [
  ev({ id: '1', status: 'ongoing', acara: 'Grand Sale' }),
  ev({ id: '2', status: 'upcoming', acara: 'Komunitas Mingguan', eo: '' }),
  ev({ id: '3', status: 'past', acara: 'Live Music', lokasi: 'Rooftop' }),
];

describe('buildSchedulePdf', () => {
  it('menghasilkan PDF valid dengan header %PDF', async () => {
    const blob = await renderEventsSchedulePdfBlob(FIXTURE);
    expect(blob.size).toBeGreaterThan(1024);
    expect(await blob.slice(0, 4).text()).toBe('%PDF');
  });

  it('memetakan seluruh event ke tabel jadwal', () => {
    const doc = buildSchedulePdf({ events: FIXTURE, generatedAt: '3 September 2026', sections: ['table'] });
    const text = extractPdfStrings(doc);
    for (const item of FIXTURE) {
      expect(text).toContain(item.acara);
    }
  });

  it('kosong → pesan kosong, tanpa tabel', async () => {
    const doc = buildSchedulePdf({ events: [], generatedAt: 'x' });
    expect(await doc.output('blob').slice(0, 4).text()).toBe('%PDF');
    expect(extractPdfStrings(doc)).toContain('Belum ada event untuk diekspor');
  });

  it('hanya menggambar bagian yang dipilih', () => {
    const tableOnly = extractPdfStrings(
      buildSchedulePdf({ events: FIXTURE, generatedAt: 'x', sections: ['table'] }),
    );
    expect(tableOnly).toContain('Tabel Jadwal');
    expect(tableOnly).not.toContain('Agenda per Area');
    expect(tableOnly).not.toContain('Kontak Penyelenggara');
    expect(tableOnly).not.toContain('TOTAL EVENT');

    const summaryOnly = extractPdfStrings(
      buildSchedulePdf({ events: FIXTURE, generatedAt: 'x', sections: ['summary'] }),
    );
    expect(summaryOnly).toContain('TOTAL EVENT');
    expect(summaryOnly).not.toContain('Tabel Jadwal');
  });

  it('membungkus nama acara panjang di dalam kolomnya', () => {
    // Regresi: dulu `willDrawCell` menggambar manual tanpa wrap sehingga
    // teks 278 pt menembus kolom 157 pt (terukur 35 kata melintasi batas).
    const doc = buildSchedulePdf({
      events: [ev({
        id: '1',
        status: 'upcoming',
        acara: 'Bazar UMKM Ramadan dengan Nama Sangat Panjang Sekali Sampai Over',
        eo: 'Yayasan Peduli Kreatif Bekasi Raya',
      })],
      generatedAt: 'x',
      sections: ['table'],
    });
    const text = extractPdfStrings(doc);
    // Nama dibungkus menjadi beberapa baris: potongan akhirnya ikut tercetak
    // sebagai baris terpisah, bukan hilang di luar kolom.
    expect(text).toContain('Bazar UMKM Ramadan dengan Nama');
    expect(text).toContain('Sangat Panjang Sekali Sampai Over');
    expect(text).toContain('Yayasan Peduli Kreatif Bekasi Raya');
  });

  it('lembar kontak menyembunyikan kolom PIC/telepon bila datanya kosong', () => {
    // Ekspor dari halaman publik: API sudah menghapus PII pic/phone.
    const doc = buildSchedulePdf({ events: FIXTURE, generatedAt: 'x', sections: ['contacts'] });
    const text = extractPdfStrings(doc);
    expect(text).toContain('Penyelenggara');
    expect(text).not.toContain('PIC');
    expect(text).not.toContain('Telepon');
  });

  it('lembar kontak menampilkan PIC/telepon bila tersedia', () => {
    const doc = buildSchedulePdf({
      events: [ev({ id: '1', status: 'upcoming', acara: 'A', pic: 'Andi', phone: '0811' })],
      generatedAt: 'x',
      sections: ['contacts'],
    });
    const text = extractPdfStrings(doc);
    expect(text).toContain('PIC');
    expect(text).toContain('Telepon');
    expect(text).toContain('Andi');
  });
});
