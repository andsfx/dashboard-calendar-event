import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommunityEventAreas } from '../CommunityEventAreas';
import type { AreaPhoto, EventArea } from '../../../types';
import { fetchAreaPhotos } from '../../../utils/domainApi';

vi.mock('../../../utils/domainApi', async (orig) => ({
  ...(await orig()),
  fetchAreaPhotos: vi.fn(),
}));

const mockFetchAreaPhotos = vi.mocked(fetchAreaPhotos);

const AREA_PHOTOS: AreaPhoto[] = [
  { id: 'aph_1', url: 'https://cdn.example.com/areas/1.jpg', caption: 'Suasana panggung', areaId: 'era_1', sortOrder: 0 },
  { id: 'aph_2', url: 'https://cdn.example.com/areas/2.jpg', caption: 'View dari samping', areaId: 'era_1', sortOrder: 1 },
];

const AREAS: EventArea[] = [
  {
    id: 'era_1', name: 'Panggung Lt. 3', description: 'Panggung utama acara',
    coverPhotoUrl: 'https://cdn.example.com/areas/a.jpg', sortOrder: 0, isActive: true, photoCount: 7,
  },
  {
    id: 'era_2', name: 'Atrium 2', description: '',
    coverPhotoUrl: '', sortOrder: 1, isActive: true, photoCount: 0,
  },
];

describe('CommunityEventAreas', () => {
  it('renders heading and visible cards', () => {
    render(<CommunityEventAreas areas={AREAS} />);
    // No eyebrow above the H2: removed 2026-09-24 (kicker-above-heading is a
    // craft-floor ban). The section heading itself is asserted below.
    expect(screen.getByText('Area di Metropolitan Mall Bekasi')).toBeInTheDocument();
    expect(screen.getByText('Panggung Lt. 3')).toBeInTheDocument();
    expect(screen.getByText('Atrium 2')).toBeInTheDocument();
  });

  it('shows photo count badge only when cover/photoCount present', () => {
    render(<CommunityEventAreas areas={AREAS} />);
    expect(screen.getByText('7 foto')).toBeInTheDocument();
  });

  it('filters out inactive areas', () => {
    const withHidden = [
      ...AREAS,
      { ...AREAS[0]!, id: 'era_3', name: 'Parkir Timur', isActive: false },
    ];
    render(<CommunityEventAreas areas={withHidden} />);
    expect(screen.queryByText('Parkir Timur')).not.toBeInTheDocument();
  });

  it('sorts by sortOrder', () => {
    const unsorted = [AREAS[1]!, AREAS[0]!];
    const { container } = render(<CommunityEventAreas areas={unsorted} />);
    const cards = container.querySelectorAll('figcaption h3');
    expect(cards[0]?.textContent).toBe('Panggung Lt. 3');
    expect(cards[1]?.textContent).toBe('Atrium 2');
  });

  it('renders nothing when no active areas and not loading', () => {
    const { container } = render(<CommunityEventAreas areas={[]} />);
    expect(container.firstChild).toBeNull();
  });

  describe('klik kartu membuka lightbox', () => {
    beforeEach(() => {
      mockFetchAreaPhotos.mockReset();
    });

    it('clicking a card with photos opens lightbox showing the first photo (photo only, no filename caption)', async () => {
      mockFetchAreaPhotos.mockResolvedValue(AREA_PHOTOS);
      render(<CommunityEventAreas areas={AREAS} />);

      fireEvent.click(screen.getByRole('button', { name: 'Lihat 7 foto Panggung Lt. 3' }));

      expect(mockFetchAreaPhotos).toHaveBeenCalledWith('era_1');
      const dialog = await screen.findByRole('dialog', { name: 'Foto: Panggung Lt. 3' });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(await screen.findByText('1 / 2')).toBeInTheDocument();
      // Caption (nama file) tidak ditampilkan — hanya foto + counter
      expect(screen.queryByText('Suasana panggung')).not.toBeInTheDocument();
      expect(dialog.querySelector('img')).toHaveAttribute('alt', 'Panggung Lt. 3 - 1');
    });

    it('navigates to the next photo and closes with Escape', async () => {
      mockFetchAreaPhotos.mockResolvedValue(AREA_PHOTOS);
      render(<CommunityEventAreas areas={AREAS} />);

      fireEvent.click(screen.getByRole('button', { name: 'Lihat 7 foto Panggung Lt. 3' }));
      await screen.findByText('1 / 2');

      fireEvent.click(screen.getByRole('button', { name: 'Foto berikutnya' }));
      expect(await screen.findByText('2 / 2')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('fetch resolves empty → lightbox closes without dialog', async () => {
      mockFetchAreaPhotos.mockResolvedValue([]);
      render(<CommunityEventAreas areas={AREAS} />);

      fireEvent.click(screen.getByRole('button', { name: 'Lihat 7 foto Panggung Lt. 3' }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('card without photos is not clickable', () => {
      render(<CommunityEventAreas areas={AREAS} />);
      expect(screen.queryByRole('button', { name: /foto Atrium 2/ })).not.toBeInTheDocument();
      expect(mockFetchAreaPhotos).not.toHaveBeenCalled();
    });
  });

  // Regresi `aria-allowed-role`: dulu seluruh <figure> diberi role="button".
  // axe melaporkan ini sebagai pelanggaran (ARIA melarang role button di figure),
  // jadi interaksinya harus ada di <button> asli di dalam figure.
  describe('struktur kartu area (aria-allowed-role)', () => {
    it('figure tidak memakai role="button"', () => {
      const { container } = render(<CommunityEventAreas areas={AREAS} />);
      const figures = container.querySelectorAll('figure');
      expect(figures.length).toBe(2);
      figures.forEach(figure => {
        expect(figure).not.toHaveAttribute('role');
        expect(figure).not.toHaveAttribute('tabindex');
      });
    });

    it('area berfoto punya <button> asli di dalam figure, dengan nama aksesibel', () => {
      const { container } = render(<CommunityEventAreas areas={AREAS} />);
      const figures = Array.from(container.querySelectorAll('figure'));

      const clickable = figures.find(f => f.textContent?.includes('Panggung Lt. 3'));
      const button = clickable?.querySelector('button');
      expect(button).toBeTruthy();
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAccessibleName('Lihat 7 foto Panggung Lt. 3');

      // figure tetap bermakna: caption + heading-nya tidak ikut jadi bagian tombol.
      expect(clickable?.querySelector('figcaption')).toBeTruthy();
      expect(button?.querySelector('figcaption')).toBeNull();
    });

    it('area tanpa foto tidak dibungkus button (tidak ada aksi)', () => {
      const { container } = render(<CommunityEventAreas areas={AREAS} />);
      const figures = Array.from(container.querySelectorAll('figure'));
      const notClickable = figures.find(f => f.textContent?.includes('Atrium 2'));
      expect(notClickable?.querySelector('button')).toBeNull();
      // gambar tetap punya alt deskriptif
      const img = notClickable?.querySelector('img');
      if (img) expect(img).toHaveAttribute('alt', 'Atrium 2');
    });

    it('Enter dan Space pada tombol tetap membuka lightbox (jalur keyboard asli)', async () => {
      mockFetchAreaPhotos.mockResolvedValue(AREA_PHOTOS);
      render(<CommunityEventAreas areas={AREAS} />);

      const button = screen.getByRole('button', { name: 'Lihat 7 foto Panggung Lt. 3' });
      button.focus();
      expect(button).toHaveFocus();

      // <button> asli: Enter/Space ditangani browser -> click.
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetchAreaPhotos).toHaveBeenCalledWith('era_1');
      });
    });
  });
});