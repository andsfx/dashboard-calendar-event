import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { EventItem } from '../../types';
import { EventsLandingPage } from '../EventsLandingPage';

// Jalur ekspor PDF di halaman publik: tombol membuka pemilih bagian, lalu
// generate memakai bagian yang dipilih. Rest API-nya di-mock (halaman ini
// membaca lewat props, jadi tidak perlu server).
const resultMock = vi.hoisted(() => vi.fn(async () => ({
  blob: new Blob(['%PDF-1.4']),
  fileName: 'jadwal-event-metmal-2026-09-30.pdf',
})));
vi.mock('../../utils/eventsSchedulePdf', () => ({
  renderEventsSchedulePdfResult: resultMock,
}));

function ev(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'status' | 'acara'>): EventItem {
  return {
    rowIndex: 0, tanggal: '5 September 2026', dateStr: '2026-09-05', day: 'Sabtu',
    jam: '10:00 - 21:00', lokasi: 'Atrium', eo: 'EO', pic: '', phone: '', keterangan: '',
    month: 'September', category: 'Umum', categories: ['Umum'], priority: 'medium',
    eventModel: '', eventNominal: '', eventModelNotes: '', ...partial,
  };
}

const EVENTS = [
  ev({ id: 'e1', status: 'upcoming', acara: 'Pameran Foto Kota' }),
  ev({ id: 'e2', status: 'ongoing', acara: 'Grand Sale Metropolitan' }),
  // Bulan lain — harus tersaring keluar saat preset "Bulan" dipilih.
  ev({ id: 'e3', status: 'upcoming', acara: 'Bazar Ramadan', dateStr: '2026-03-12', month: 'Maret' }),
  // Multi-hari: mulai akhir Agustus, masih berjalan sampai 2 September.
  ev({
    id: 'e4', status: 'upcoming', acara: 'Festival Kemerdekaan',
    dateStr: '2026-08-31', dateEnd: '2026-09-02', month: 'Agustus', isMultiDay: true,
  }),
];

function renderPage() {
  render(
    <MemoryRouter>
      <EventsLandingPage isDark={false} onToggleDark={() => {}} events={EVENTS} holidays={[]} onDetail={() => {}} />
    </MemoryRouter>,
  );
}

/** Membuka pemilih ekspor lalu mengembalikan isi dialognya.
 *  Kueri harus di-scope ke dialog: nama event juga tampil di badan halaman,
 *  jadi pencarian global akan cocok dengan daftar event, bukan pemilihnya. */
async function openExportDialog() {
  fireEvent.click(screen.getByRole('button', { name: /Unduh jadwal event sebagai PDF/i }));
  const dialog = await screen.findByRole('dialog');
  return within(dialog);
}

beforeEach(() => {
  resultMock.mockClear();
});

describe('EventsLandingPage — ekspor PDF', () => {
  it('membuka pemilih bagian, bukan langsung mengunduh', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Unduh jadwal event sebagai PDF/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Tabel Jadwal')).toBeInTheDocument();
    expect(screen.getByText('Agenda per Area')).toBeInTheDocument();
    expect(screen.getByText('Kontak Penyelenggara')).toBeInTheDocument();
    expect(resultMock).not.toHaveBeenCalled();
  });

  it('mengirim bagian yang dipilih ke generator', async () => {
    renderPage();
    const dialog = await openExportDialog();

    fireEvent.click(dialog.getByRole('checkbox', { name: /Kontak Penyelenggara/ }));
    fireEvent.click(dialog.getByRole('button', { name: /Preview PDF/ }));

    await waitFor(() => expect(resultMock).toHaveBeenCalledTimes(1));
    const [sentEvents, options] = resultMock.mock.calls[0] as unknown as [EventItem[], { sections: string[] }];
    // Tanpa filter periode, seluruh event ikut.
    expect(sentEvents).toHaveLength(4);
    expect(options).toEqual({ sections: ['summary', 'table', 'contacts'] });
  });

  it('menahan dokumen di pratinjau sebelum diunduh', async () => {
    renderPage();
    const dialog = await openExportDialog();

    fireEvent.click(dialog.getByRole('button', { name: /Preview PDF/ }));

    expect(await screen.findByTitle('Pratinjau PDF')).toBeInTheDocument();
    expect(screen.getByText(/Cek dulu hasilnya/)).toBeInTheDocument();
    // Kembali ke pemilihan, bukan menutup dialog.
    fireEvent.click(screen.getByRole('button', { name: /Kembali/ }));
    expect(screen.getByText('Tabel Jadwal')).toBeInTheDocument();
  });

  it('tidak bisa mematikan bagian tabel jadwal', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Unduh jadwal event sebagai PDF/i }));
    await screen.findByRole('dialog');
    expect(screen.getByRole('checkbox', { name: /Tabel Jadwal/ })).toBeDisabled();
  });
});

describe('EventsLandingPage — cakupan event', () => {
  it('menawarkan preset periode dan menyaring per bulan', async () => {
    renderPage();
    const dialog = await openExportDialog();

    // Default: semua event terpilih.
    expect(dialog.getByText('4 event pada periode ini')).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('button', { name: 'Bulan' }));
    fireEvent.change(dialog.getByRole('combobox', { name: 'Bulan' }), { target: { value: '2026-09' } });

    // Bazar Ramadan (Maret) keluar; Festival Kemerdekaan tetap ikut karena
    // rentangnya (31 Agu – 2 Sep) beririsan dengan September.
    expect(dialog.getByText('3 event pada periode ini')).toBeInTheDocument();
    expect(dialog.queryByText('Bazar Ramadan')).not.toBeInTheDocument();
    expect(dialog.getByText('Festival Kemerdekaan')).toBeInTheDocument();
  });

  it('hanya mengirim event yang dicentang', async () => {
    renderPage();
    const dialog = await openExportDialog();

    fireEvent.click(dialog.getByRole('checkbox', { name: /Grand Sale Metropolitan/ }));
    fireEvent.click(dialog.getByRole('button', { name: /Preview PDF/ }));

    await waitFor(() => expect(resultMock).toHaveBeenCalledTimes(1));
    const [sentEvents] = resultMock.mock.calls[0] as unknown as [EventItem[], unknown];
    expect(sentEvents.map((event) => event.id).sort()).toEqual(['e1', 'e3', 'e4']);
  });

  it('mematikan tombol pratinjau saat tidak ada event terpilih', async () => {
    renderPage();
    const dialog = await openExportDialog();

    fireEvent.click(dialog.getByRole('button', { name: 'Kosongkan pilihan event' }));

    expect(dialog.getByText(/Pilih minimal satu event/)).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: /Preview PDF/ })).toBeDisabled();
    expect(resultMock).not.toHaveBeenCalled();
  });

  it('menerapkan rentang khusus yang diisi pengguna', async () => {
    renderPage();
    const dialog = await openExportDialog();

    fireEvent.click(dialog.getByRole('button', { name: 'Rentang khusus' }));
    fireEvent.change(dialog.getByLabelText('Dari tanggal'), { target: { value: '2026-03-01' } });
    fireEvent.change(dialog.getByLabelText('Sampai tanggal'), { target: { value: '2026-03-31' } });

    expect(dialog.getByText('1 event pada periode ini')).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('button', { name: /Preview PDF/ }));
    await waitFor(() => expect(resultMock).toHaveBeenCalledTimes(1));
    const [sentEvents] = resultMock.mock.calls[0] as unknown as [EventItem[], unknown];
    expect(sentEvents.map((event) => event.id)).toEqual(['e3']);
  });

  it('mencari event berdasarkan nama', async () => {
    renderPage();
    const dialog = await openExportDialog();

    fireEvent.change(dialog.getByRole('searchbox'), { target: { value: 'grand' } });
    expect(dialog.getByText('Grand Sale Metropolitan')).toBeInTheDocument();
    expect(dialog.queryByText('Pameran Foto Kota')).not.toBeInTheDocument();
  });
});

describe('EventsLandingPage — preset Tema', () => {
  const THEME = {
    id: 't1', name: 'Tema Ramadan', dateStart: '2026-03-01', dateEnd: '2026-03-31', color: '#000',
  };

  function renderWithThemes() {
    render(
      <MemoryRouter>
        <EventsLandingPage
          isDark={false}
          onToggleDark={() => {}}
          events={EVENTS}
          holidays={[]}
          themes={[THEME]}
          onDetail={() => {}}
        />
      </MemoryRouter>,
    );
  }

  it('menyaring event menurut rentang tanggal tema', async () => {
    renderWithThemes();
    const dialog = await openExportDialog();

    fireEvent.click(dialog.getByRole('button', { name: 'Tema' }));

    // Event tidak punya kolom tema di database; yang dipakai adalah rentang
    // tanggal tema — sama seperti cara /gallery memasangkan album ke tema.
    expect(dialog.getByText('1 event pada periode ini')).toBeInTheDocument();
    expect(dialog.getByText('Bazar Ramadan')).toBeInTheDocument();
    expect(dialog.queryByText('Pameran Foto Kota')).not.toBeInTheDocument();
    // Keterangan periode jujur menyebut sumbernya (teks satu baris bersama
    // rentangnya, jadi dicocokkan sebagai regex).
    expect(dialog.getByText(/Rentang tema/)).toBeInTheDocument();
    expect(dialog.getByText('1 – 31 Maret 2026')).toBeInTheDocument();
  });

  it('menyembunyikan preset Tema saat tidak ada tema', async () => {
    renderPage();
    const dialog = await openExportDialog();
    expect(dialog.queryByRole('button', { name: 'Tema' })).not.toBeInTheDocument();
  });

  it('mengirim hanya event dalam rentang tema', async () => {
    renderWithThemes();
    const dialog = await openExportDialog();

    fireEvent.click(dialog.getByRole('button', { name: 'Tema' }));
    fireEvent.click(dialog.getByRole('button', { name: /Preview PDF/ }));

    await waitFor(() => expect(resultMock).toHaveBeenCalledTimes(1));
    const [sentEvents] = resultMock.mock.calls[0] as unknown as [EventItem[], unknown];
    expect(sentEvents.map((event) => event.id)).toEqual(['e3']);
  });
});

describe('EventsLandingPage — filter halaman ikut menyaring ekspor', () => {
  // Kategori berbeda supaya filter URL punya efek yang bisa diamati.
  const FILTERED = [
    ev({ id: 'f1', status: 'upcoming', acara: 'Konser Anak', categories: ['Anak'] }),
    ev({ id: 'f2', status: 'upcoming', acara: 'Pameran Seni', categories: ['Seni'] }),
  ];

  function renderWith(entry: string) {
    render(
      <MemoryRouter initialEntries={[entry]}>
        <EventsLandingPage
          isDark={false}
          onToggleDark={() => {}}
          events={FILTERED}
          holidays={[]}
          onDetail={() => {}}
        />
      </MemoryRouter>,
    );
  }

  it('hanya menawarkan event yang lolos filter halaman', async () => {
    renderWith('/events?kategori=Anak');
    const dialog = await openExportDialog();

    expect(dialog.getByText('1 event pada periode ini')).toBeInTheDocument();
    expect(dialog.getByText('Konser Anak')).toBeInTheDocument();
    expect(dialog.queryByText('Pameran Seni')).not.toBeInTheDocument();
  });

  it('mengirim hanya event yang lolos filter halaman', async () => {
    renderWith('/events?kategori=Seni');
    const dialog = await openExportDialog();

    fireEvent.click(dialog.getByRole('button', { name: /Preview PDF/ }));

    await waitFor(() => expect(resultMock).toHaveBeenCalledTimes(1));
    const [sentEvents] = resultMock.mock.calls[0] as unknown as [EventItem[], unknown];
    expect(sentEvents.map((event) => event.id)).toEqual(['f2']);
  });

  it('menjelaskan bahwa filter halaman sedang aktif', async () => {
    renderWith('/events?kategori=Anak');
    const dialog = await openExportDialog();

    expect(dialog.getByText(/Filter halaman aktif/)).toBeInTheDocument();
  });
});

describe('EventsLandingPage — abaikan filter halaman', () => {
  // Dua kategori, masing-masing punya acara di bulan berbeda. Dipakai untuk
  // membuktikan bahwa tema yang rentangnya jatuh di luar filter halaman tetap
  // bisa diekspor utuh — inilah yang sebelumnya mustahil karena filter
  // halaman dan periode ekspor bertumpuk sebagai irisan.
  const MIXED = [
    ev({ id: 'm1', status: 'upcoming', acara: 'Konser Anak', categories: ['Anak'], dateStr: '2026-09-05' }),
    ev({ id: 'm2', status: 'upcoming', acara: 'Bazar Ramadan', categories: ['Seni'], dateStr: '2026-03-12', month: 'Maret' }),
    ev({ id: 'm3', status: 'upcoming', acara: 'Pameran Seni', categories: ['Seni'], dateStr: '2026-03-20', month: 'Maret' }),
  ];
  const THEME = {
    id: 't1', name: 'Tema Ramadan', dateStart: '2026-03-01', dateEnd: '2026-03-31', color: '#000',
  };

  function renderWith(entry: string) {
    render(
      <MemoryRouter initialEntries={[entry]}>
        <EventsLandingPage
          isDark={false}
          onToggleDark={() => {}}
          events={MIXED}
          holidays={[]}
          themes={[THEME]}
          onDetail={() => {}}
        />
      </MemoryRouter>,
    );
  }

  it('menawarkan sakelar hanya saat halaman memang punya filter', async () => {
    renderWith('/events');
    const dialog = await openExportDialog();

    expect(dialog.queryByRole('checkbox', { name: /Abaikan filter halaman/ })).not.toBeInTheDocument();
  });

  it('default menghormati filter halaman', async () => {
    renderWith('/events?kategori=Anak');
    const dialog = await openExportDialog();

    expect(dialog.getByRole('checkbox', { name: /Abaikan filter halaman/ })).not.toBeChecked();
    expect(dialog.getByText('1 event pada periode ini')).toBeInTheDocument();
  });

  it('melepas filter halaman sehingga tema diekspor utuh', async () => {
    renderWith('/events?kategori=Anak');
    const dialog = await openExportDialog();

    // Tanpa sakelar: tema Ramadan tidak menghasilkan apa pun karena kedua
    // acaranya berkategori "Seni", sedangkan halaman difilter "Anak".
    fireEvent.click(dialog.getByRole('button', { name: 'Tema' }));
    expect(dialog.getByText('0 event pada periode ini')).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('checkbox', { name: /Abaikan filter halaman/ }));
    expect(dialog.getByText('2 event pada periode ini')).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('button', { name: /Preview PDF/ }));
    await waitFor(() => expect(resultMock).toHaveBeenCalledTimes(1));
    const [sentEvents] = resultMock.mock.calls[0] as unknown as [EventItem[], unknown];
    expect(sentEvents.map((event) => event.id).sort()).toEqual(['m2', 'm3']);
  });

  it('mengembalikan event yang tersembunyi ke pilihan saat sakelar dibalik', async () => {
    renderWith('/events?kategori=Anak');
    const dialog = await openExportDialog();

    expect(dialog.getByText('1 event pada periode ini')).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('checkbox', { name: /Abaikan filter halaman/ }));
    expect(dialog.getByText('3 event pada periode ini')).toBeInTheDocument();
    expect(dialog.getByText('Bazar Ramadan')).toBeInTheDocument();

    // Dibalik lagi: kembali menghormati filter halaman.
    fireEvent.click(dialog.getByRole('checkbox', { name: /Abaikan filter halaman/ }));
    expect(dialog.getByText('1 event pada periode ini')).toBeInTheDocument();
    expect(dialog.queryByText('Bazar Ramadan')).not.toBeInTheDocument();
  });

  it('memperbarui deskripsi dialog saat filter halaman diabaikan', async () => {
    renderWith('/events?kategori=Anak');
    const dialog = await openExportDialog();

    expect(dialog.getByText(/Filter halaman aktif/)).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('checkbox', { name: /Abaikan filter halaman/ }));
    expect(dialog.getByText(/Filter halaman diabaikan/)).toBeInTheDocument();
  });
});
