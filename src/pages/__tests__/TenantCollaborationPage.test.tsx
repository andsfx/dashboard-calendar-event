import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { TenantCollaborationPage } from '../TenantCollaborationPage';

function mockFetchRoutes(routes: Record<string, { status?: number; body: unknown }>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    const route = routes[url];
    if (!route) {
      return {
        ok: false, status: 404,
        json: async () => ({ success: false, error: `No mock for ${url}` }),
        text: async () => `No mock for ${url}`,
      };
    }
    const status = route.status ?? 200;
    return {
      ok: status >= 200 && status < 300, status,
      json: async () => route.body,
      text: async () => JSON.stringify(route.body),
    };
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Satu tenant master MID seperti bentuk asli `GET /tenant/tenants`. */
const MID_TENANT = {
  id: '1801021146', name: 'Kopi Kenangan', floor: 'LT2', lot: '16 II',
  category: 'FOOD & BEVERAGE', pic: '', picTelp: '', logo: '', status: 'active', participantEvoucher: '',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/kolaborasi-tenant']}>
      <Routes>
        <Route path="/kolaborasi-tenant" element={<TenantCollaborationPage isDark={false} onToggleDark={() => undefined} />} />
      </Routes>
    </MemoryRouter>,
  );
}

const areasRoute = { '/api/v1/areas': { body: { success: true, data: { areas: [], photos: [] } } } };

/**
 * `TenantSearchSelect` men-debounce 250 ms sebelum fetch + render opsi, sementara
 * default `findBy*`/`waitFor` hanya 1 000 ms. Di CI (143 berkas jsdom paralel)
 * jendela itu kalah sehingga suite merah padahal bersih di lokal. Batas tunggu
 * dinaikkan per penantian — asersi (role + name) tidak diubah.
 */
const ASYNC_TIMEOUT = 4_000;

/** Combobox "Nama tenant" — halaman juga punya <select> jenis kegiatan. */
const geraiPicker = () => screen.getByRole('combobox', { name: /Nama tenant/ });

describe('TenantCollaborationPage — pemilihan tenant', () => {
  it('form interaktif berada di luar subtree animasi reveal', async () => {
    const user = userEvent.setup();
    mockFetchRoutes({
      ...areasRoute,
      '/api/v1/tenant/tenants?q=kopi': { body: { success: true, data: [MID_TENANT] } },
    });
    renderPage();

    // Regresi CI: `RevealSection` memindahkan subtree-nya saat tween GSAP mulai
    // (remove + insert node). Pemindahan itu mencabut fokus input yang sedang
    // diketik tanpa memicu `blur`, jadi sisa ketikan hilang dan opsi tenant
    // tidak pernah dimuat — 4 detik timeout pun tidak menolong. Form interaktif
    // karena itu harus di luar `.reveal-stage`; hanya judul yang dianimasikan.
    const picker = geraiPicker();
    expect(picker.closest('.reveal-stage')).toBeNull();
    expect(document.querySelector('form')?.closest('.reveal-stage')).toBeNull();

    // Perilaku normal tetap: ketik → opsi tenant muncul.
    await user.type(picker, 'kopi');
    expect(
      await screen.findByRole('option', { name: /Kopi Kenangan/ }, { timeout: ASYNC_TIMEOUT }),
    ).toBeInTheDocument();
  });

  it('mengisi nama, unit, dan kategori dari master MID saat tenant dipilih', async () => {
    const user = userEvent.setup();
    mockFetchRoutes({
      ...areasRoute,
      '/api/v1/tenant/tenants?q=kopi': { body: { success: true, data: [MID_TENANT] } },
    });
    renderPage();

    await user.type(geraiPicker(), 'kopi');

    const option = await screen.findByRole('option', { name: /Kopi Kenangan/ }, { timeout: ASYNC_TIMEOUT });
    await user.click(option);

    await waitFor(() => expect(geraiPicker()).toHaveValue('Kopi Kenangan'), { timeout: ASYNC_TIMEOUT });
    expect(screen.getByLabelText(/Nomor unit atau lot/)).toHaveValue('16 II');
    expect(screen.getByLabelText(/Kategori tenant/)).toHaveValue('FOOD & BEVERAGE');
    expect(screen.getByText(/FOOD & BEVERAGE · LT2 · Lot 16 II/)).toBeInTheDocument();
  });

  it('menolak submit sebelum tenant dipilih, dengan pesan yang bisa ditindaklanjuti', async () => {
    const user = userEvent.setup();
    mockFetchRoutes(areasRoute);
    renderPage();

    await user.click(screen.getByRole('button', { name: /Kirim Pengajuan/ }));

    expect(await screen.findByText('Pilih tenant dari daftar, atau isi manual.', undefined, { timeout: ASYNC_TIMEOUT })).toBeInTheDocument();
  });

  it('tidak meninggalkan unit/kategori tenant sebelumnya saat beralih ke isi manual', async () => {
    const user = userEvent.setup();
    mockFetchRoutes({
      ...areasRoute,
      '/api/v1/tenant/tenants?q=kopi': { body: { success: true, data: [MID_TENANT] } },
    });
    renderPage();

    await user.type(geraiPicker(), 'kopi');
    await user.click(await screen.findByRole('option', { name: /Kopi Kenangan/ }, { timeout: ASYNC_TIMEOUT }));
    await waitFor(() => expect(screen.getByLabelText(/Nomor unit atau lot/)).toHaveValue('16 II'), { timeout: ASYNC_TIMEOUT });

    await user.click(screen.getByRole('button', { name: 'Tenant saya belum ada di daftar' }));

    expect(screen.getByLabelText(/Nama tenant/)).toHaveValue('');
    expect(screen.getByLabelText(/Nomor unit atau lot/)).toHaveValue('');
    expect(screen.getByLabelText(/Kategori tenant/)).toHaveValue('');
  });

  it('mempertahankan unit yang sudah disunting user saat pilihan tenant dilepas', async () => {
    const user = userEvent.setup();
    mockFetchRoutes({
      ...areasRoute,
      '/api/v1/tenant/tenants?q=kopi': { body: { success: true, data: [MID_TENANT] } },
    });
    renderPage();

    await user.type(geraiPicker(), 'kopi');
    await user.click(await screen.findByRole('option', { name: /Kopi Kenangan/ }, { timeout: ASYNC_TIMEOUT }));

    const unit = screen.getByLabelText(/Nomor unit atau lot/);
    await user.clear(unit);
    await user.type(unit, 'GF-01');

    await user.click(screen.getByRole('button', { name: 'Tenant saya belum ada di daftar' }));

    expect(screen.getByLabelText(/Nomor unit atau lot/)).toHaveValue('GF-01');
  });
});

describe('TenantCollaborationPage — lampiran proposal', () => {
  const REJECTION = 'Lampiran harus PDF, Word (DOC/DOCX), PNG, atau JPEG.';

  /**
   * `fireEvent.change` dipakai, bukan `userEvent.upload`: userEvent menyaring berkas
   * lewat atribut `accept` lebih dulu, sehingga berkas yang justru ingin kita tolak
   * tidak pernah sampai ke handler dan tesnya menguji hal yang salah.
   */
  function pickAttachment(file: File) {
    const input = screen.getByLabelText(/Lampiran proposal/) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
  }

  it('menerima lampiran PNG', () => {
    mockFetchRoutes(areasRoute);
    renderPage();

    pickAttachment(new File(['x'], 'materi.png', { type: 'image/png' }));

    expect(screen.getByText('materi.png')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('menerima lampiran JPEG dengan ekstensi .jpg maupun .jpeg', () => {
    mockFetchRoutes(areasRoute);
    renderPage();

    pickAttachment(new File(['x'], 'foto.jpg', { type: 'image/jpeg' }));
    expect(screen.getByText('foto.jpg')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    pickAttachment(new File(['x'], 'foto-poster.jpeg', { type: 'image/jpeg' }));
    expect(screen.getByText('foto-poster.jpeg')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('menolak tipe di luar daftar dengan pesan yang menyebut format yang diterima', () => {
    mockFetchRoutes(areasRoute);
    renderPage();

    pickAttachment(new File(['x'], 'animasi.gif', { type: 'image/gif' }));

    expect(screen.getByRole('alert')).toHaveTextContent(REJECTION);
    expect(screen.queryByText('animasi.gif')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pilih berkas proposal/ })).toBeInTheDocument();
  });

  it('menolak berkas yang tipe dan ekstensinya tidak sepadan', () => {
    mockFetchRoutes(areasRoute);
    renderPage();

    // Dua-duanya ada di allowlist, tapi tidak sepasang. Kasus inilah yang lolos di
    // logika lama: `application/pdf` diterima sebagai mime DAN `doc` diterima sebagai
    // ekstensi, padahal keduanya menunjuk tipe berbeda.
    pickAttachment(new File(['x'], 'proposal.doc', { type: 'application/pdf' }));

    expect(screen.getByRole('alert')).toHaveTextContent(REJECTION);
    expect(screen.queryByText('proposal.doc')).not.toBeInTheDocument();
  });

  it('menolak ekstensi yang tidak sepasang walau tipenya bukan dokumen', () => {
    mockFetchRoutes(areasRoute);
    renderPage();

    // Tipe gambar dengan ekstensi dokumen: juga harus ditolak, bukan hanya arah sebaliknya.
    pickAttachment(new File(['x'], 'materi.png', { type: 'image/jpeg' }));

    expect(screen.getByRole('alert')).toHaveTextContent(REJECTION);
    expect(screen.queryByText('materi.png')).not.toBeInTheDocument();
  });
});
