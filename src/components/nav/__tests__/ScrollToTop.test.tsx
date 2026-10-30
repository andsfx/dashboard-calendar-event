import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ScrollToTop } from '../ScrollToTop';

/** Penanda sinkron bahwa lokasi baru sudah ter-commit, tanpa bergantung pada mock scroll. */
function SearchProbe() {
  const { search } = useLocation();
  return <p data-testid="search">{search}</p>;
}

function TestRoutes() {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div>
            <button type="button" onClick={() => navigate('/events')}>Ke jadwal</button>
            <button type="button" onClick={() => navigate('/events#kalender')}>Ke kalender</button>
            <button type="button" onClick={() => navigate('/news#lazy-target')}>Ke berita</button>
          </div>
        }
      />
      <Route
        path="/events"
        element={
          <div>
            <h1>Jadwal Event</h1>
            <SearchProbe />
            <button type="button" onClick={() => navigate('/news')}>Ke berita</button>
            <button
              type="button"
              onClick={() => navigate('/events?kategori=musik', { replace: true })}
            >
              Filter musik
            </button>
            <button type="button" onClick={() => navigate('/events#kalender')}>
              Anchor kalender
            </button>
            <button type="button" onClick={() => navigate('/gallery')}>Ke galeri</button>
            <section id="kalender" tabIndex={-1}>Kalender</section>
            <section id="calendar" tabIndex={-1}>Kalender (deep link)</section>
          </div>
        }
      />
      <Route
        path="/news"
        element={
          <div>
            <h1>Berita</h1>
            <button type="button" onClick={() => navigate(-1)}>Kembali</button>
          </div>
        }
      />
      <Route
        path="/gallery"
        element={
          <div>
            <h1>Galeri</h1>
          </div>
        }
      />
    </Routes>
  );
}

function renderApp(initialEntries: string[], initialIndex = 0) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <ScrollToTop />
      <TestRoutes />
    </MemoryRouter>,
  );
}

const originalScrollIntoView = Element.prototype.scrollIntoView;
let scrollIntoViewMock: Mock<() => void>;

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  scrollIntoViewMock = vi.fn<() => void>();
  Element.prototype.scrollIntoView = scrollIntoViewMock;
});

afterEach(() => {
  vi.restoreAllMocks();
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

describe('ScrollToTop', () => {
  it('mengembalikan scroll ke atas saat rute berubah', async () => {
    const user = userEvent.setup();
    renderApp(['/']);

    await user.click(screen.getByRole('button', { name: 'Ke jadwal' }));

    expect(await screen.findByRole('heading', { name: 'Jadwal Event' })).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  it('tidak menyentuh scroll pada navigasi POP (back/forward)', async () => {
    const user = userEvent.setup();
    renderApp(['/events', '/news'], 1);

    expect(screen.getByRole('heading', { name: 'Berita' })).toBeInTheDocument();
    expect(window.scrollTo).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Kembali' }));

    expect(await screen.findByRole('heading', { name: 'Jadwal Event' })).toBeInTheDocument();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('memfokuskan target hash dan menggulir ke elemennya', async () => {
    const user = userEvent.setup();
    renderApp(['/']);

    await user.click(screen.getByRole('button', { name: 'Ke kalender' }));

    await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalled());
    expect(document.getElementById('kalender')).toHaveFocus();
  });

  it('tidak menyentuh scroll saat POP kembali ke entri riwayat lama ber-hash', async () => {
    const user = userEvent.setup();
    renderApp(['/events#calendar', '/news'], 1);

    expect(screen.getByRole('heading', { name: 'Berita' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Kembali' }));

    expect(await screen.findByRole('heading', { name: 'Jadwal Event' })).toBeInTheDocument();
    // Fokus diberikan sinkron di dalam effect saat bug hadir, jadi ini sinyal pasti.
    // Mock `scrollIntoView` di prototype bisa tersentuh rAF milik tes lain.
    expect(document.getElementById('calendar')).not.toHaveFocus();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('tidak memproses ulang hash saat POP kembali ke entri awal setelah pengguna pindah', async () => {
    const user = userEvent.setup();
    renderApp(['/events#calendar']);

    await user.click(await screen.findByRole('button', { name: 'Ke berita' }));
    expect(await screen.findByRole('heading', { name: 'Berita' })).toBeInTheDocument();
    // PUSH ke /news memang me-reset scroll; yang diuji adalah POP sesudahnya.
    vi.mocked(window.scrollTo).mockClear();

    await user.click(screen.getByRole('button', { name: 'Kembali' }));

    expect(await screen.findByRole('heading', { name: 'Jadwal Event' })).toBeInTheDocument();
    expect(document.getElementById('calendar')).not.toHaveFocus();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('memproses hash pada direct entry (initial load bertipe POP)', async () => {
    renderApp(['/events#calendar']);

    expect(await screen.findByRole('heading', { name: 'Jadwal Event' })).toBeInTheDocument();
    await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalled());
    expect(document.getElementById('calendar')).toHaveFocus();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('menunggu target hash yang baru ter-mount setelah rute tampil', async () => {
    const user = userEvent.setup();
    renderApp(['/']);

    await user.click(screen.getByRole('button', { name: 'Ke berita' }));
    expect(await screen.findByRole('heading', { name: 'Berita' })).toBeInTheDocument();
    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    const lateTarget = document.createElement('div');
    lateTarget.id = 'lazy-target';
    lateTarget.tabIndex = -1;
    document.body.appendChild(lateTarget);

    try {
      await waitFor(() => expect(lateTarget).toHaveFocus());
      expect(scrollIntoViewMock).toHaveBeenCalled();
    } finally {
      lateTarget.remove();
    }
  });

  it('tidak mereset scroll saat hanya search param filter yang berubah', async () => {
    const user = userEvent.setup();
    renderApp(['/events']);

    expect(await screen.findByRole('heading', { name: 'Jadwal Event' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Filter musik' }));

    await waitFor(() =>
      expect(screen.getByTestId('search')).toHaveTextContent('?kategori=musik'),
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('tetap mereset scroll saat pathname berganti setelah filter', async () => {
    const user = userEvent.setup();
    renderApp(['/events']);

    await user.click(await screen.findByRole('button', { name: 'Filter musik' }));
    await waitFor(() =>
      expect(screen.getByTestId('search')).toHaveTextContent('?kategori=musik'),
    );
    vi.mocked(window.scrollTo).mockClear();

    await user.click(screen.getByRole('button', { name: 'Ke galeri' }));

    expect(await screen.findByRole('heading', { name: 'Galeri' })).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  it('menggulir ke target saat hash berubah tanpa ganti pathname', async () => {
    const user = userEvent.setup();
    renderApp(['/events']);

    expect(await screen.findByRole('heading', { name: 'Jadwal Event' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Anchor kalender' }));

    await waitFor(() => expect(document.getElementById('kalender')).toHaveFocus());
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('tetap mereset scroll saat PUSH ke pathname yang pernah POP sebelumnya', async () => {
    const user = userEvent.setup();
    renderApp(['/events', '/news'], 1);

    await user.click(screen.getByRole('button', { name: 'Kembali' }));
    expect(await screen.findByRole('heading', { name: 'Jadwal Event' })).toBeInTheDocument();
    expect(window.scrollTo).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Ke berita' }));

    expect(await screen.findByRole('heading', { name: 'Berita' })).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });
});
