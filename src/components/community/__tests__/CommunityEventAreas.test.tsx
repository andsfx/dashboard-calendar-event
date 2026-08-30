import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommunityEventAreas } from '../CommunityEventAreas';
import type { EventArea } from '../../../types';

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
    expect(screen.getByText('Foto Area Event')).toBeInTheDocument();
    expect(screen.getByText('Arena di Metropolitan Mall.')).toBeInTheDocument();
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
});