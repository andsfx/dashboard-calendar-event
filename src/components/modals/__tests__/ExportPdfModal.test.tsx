import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AnnualTheme, PhotoAlbum } from '../../../types';
import { ExportPdfModal } from '../ExportPdfModal';

// Jalur ekspor album: dulu hanya dua input tanggal mentah; kini pemilih
// periode + centang per album. `generateAlbumPdf` di-stub supaya tes tidak
// menyentuh jsPDF/fetch gambar, sementara penyaringan album tetap nyata.
const generateMock = vi.hoisted(() => vi.fn(async () => new Blob(['pdf'])));
vi.mock('../../../utils/pdfExport', () => ({
  generateAlbumPdf: generateMock,
  ALBUM_PDF_SECTIONS: ['cover', 'header', 'photos', 'captions'],
}));

const apiGetMock = vi.hoisted(() => vi.fn(async () => ({ albums: [], photos: [] })));
vi.mock('../../../lib/rest', () => ({ apiGet: apiGetMock }));

function album(partial: Partial<PhotoAlbum> & Pick<PhotoAlbum, 'id' | 'name' | 'eventDate'>): PhotoAlbum {
  return {
    slug: partial.id, description: '', coverPhotoUrl: '', sortOrder: 0, ...partial,
  };
}

const ALBUMS = [
  album({ id: 'a1', name: 'Pameran Foto Kota', eventDate: '2026-09-05' }),
  album({ id: 'a2', name: 'Grand Sale Metropolitan', eventDate: '2026-09-12' }),
  album({ id: 'a3', name: 'Bazar Ramadan', eventDate: '2026-03-12' }),
];

const THEMES: AnnualTheme[] = [];

function renderModal() {
  render(
    <ExportPdfModal isOpen onClose={() => {}} albums={ALBUMS} themes={THEMES} />,
  );
}

/** Buka pemilih bagian lalu kembalikan isi dialognya.
 *  Ada dua dialog bersarang (modal album + pemilih bagian), jadi dialog
 *  diambil lewat namanya, dan kueri di-scope ke dalamnya karena nama album
 *  juga tampil di modal utama. */
async function openSectionPicker() {
  fireEvent.click(screen.getByRole('button', { name: /Preview PDF/i }));
  const dialog = await screen.findByRole('dialog', { name: 'Preview Album Foto' });
  return within(dialog);
}

beforeEach(() => {
  generateMock.mockClear();
  apiGetMock.mockClear();
});

describe('ExportPdfModal — cakupan album', () => {
  it('menawarkan semua album pada rentang default', () => {
    renderModal();
    expect(screen.getByText('3 album pada periode ini')).toBeInTheDocument();
    expect(screen.getByText('3 album siap diexport')).toBeInTheDocument();
  });

  it('menyaring album saat preset Bulan dipilih', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Bulan' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Bulan' }), { target: { value: '2026-09' } });

    expect(screen.getByText('2 album pada periode ini')).toBeInTheDocument();
    expect(screen.getByText('2 album siap diexport')).toBeInTheDocument();
  });

  it('menerapkan rentang khusus', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Rentang khusus' }));
    fireEvent.change(screen.getByLabelText('Dari tanggal'), { target: { value: '2026-03-01' } });
    fireEvent.change(screen.getByLabelText('Sampai tanggal'), { target: { value: '2026-03-31' } });

    expect(screen.getByText('1 album pada periode ini')).toBeInTheDocument();
    expect(screen.getByText('1 album siap diexport')).toBeInTheDocument();
  });

  it('mengirim hanya album yang dicentang ke generator', async () => {
    renderModal();

    // Matikan satu album sebelum masuk ke pemilih bagian.
    fireEvent.click(screen.getByRole('checkbox', { name: /Grand Sale Metropolitan/ }));
    expect(screen.getByText('2 album siap diexport')).toBeInTheDocument();

    const dialog = await openSectionPicker();
    fireEvent.click(dialog.getByRole('button', { name: /Preview PDF/ }));

    await waitFor(() => expect(generateMock).toHaveBeenCalledTimes(1));
    const [payload] = generateMock.mock.calls[0] as unknown as [Array<{ album: PhotoAlbum }>];
    expect(payload.map((entry) => entry.album.id)).toEqual(['a1', 'a3']);
  });

  it('tidak bisa membuka pemilih bagian saat tidak ada album terpilih', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Kosongkan pilihan album' }));

    expect(screen.getByText(/Pilih minimal satu album/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preview PDF/i })).toBeDisabled();
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('menyaring mode tema ke album milik tema itu', () => {
    render(
      <ExportPdfModal
        isOpen
        onClose={() => {}}
        albums={[
          album({ id: 'a1', name: 'Album Tema', eventDate: '2026-09-05', themeId: 't1' }),
          album({ id: 'a2', name: 'Album Lain', eventDate: '2026-09-12', themeId: 't2' }),
        ]}
        themes={[{ id: 't1', name: 'Tema Merdeka', dateStart: '2026-08-01', dateEnd: '2026-08-31', color: '#000' }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Berdasarkan Tema/ }));
    expect(screen.getByText('Pilih tema dulu untuk melihat album yang tersedia.')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: /Tema event/ }), { target: { value: 't1' } });

    expect(screen.getByText('1 album pada periode ini')).toBeInTheDocument();
    expect(screen.getByText('Album Tema')).toBeInTheDocument();
    expect(screen.queryByText('Album Lain')).not.toBeInTheDocument();
  });
});
