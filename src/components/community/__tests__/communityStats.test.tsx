import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import type { EventItem } from '../../../types';
import { deriveCommunityStats, COMMUNITY_STAT_LABELS } from '../communityStats';
import { CommunityHero } from '../CommunityHero';
import { CommunitySocialProof } from '../CommunitySocialProof';

/**
 * C2 — hero dan /events pernah menampilkan dua angka yang tampak bertentangan
 * ("232+ Event Sudah Terlaksana" vs "TOTAL 251") karena labelnya tidak
 * membedakan metrik. Keduanya angka nyata: `completed` = status `past`,
 * `total` = semua event publik. Yang diperbaiki adalah LABEL, bukan angkanya.
 *
 * Test ini mengunci invarian itu:
 *  1. `completed` dan `total` memang metrik berbeda (bukan duplikat).
 *  2. Keduanya punya label berbeda yang tidak bisa dibaca sebagai satu metrik.
 *  3. Hero memakai label `completed`, /events memakai label `total`.
 */

function event(id: string, status: EventItem['status'], eo = 'EO', pic = ''): EventItem {
  return {
    id,
    rowIndex: 1,
    tanggal: '2026-09-19',
    dateStr: '2026-09-19',
    day: 'Sabtu',
    jam: '10:00 - 12:00',
    acara: `Acara ${id}`,
    lokasi: 'Lantai 3',
    eo,
    pic,
    phone: '0800',
    keterangan: '',
    month: 'September 2026',
    category: 'Musik',
    categories: ['Musik'],
    priority: 'medium',
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
    status,
  };
}

describe('deriveCommunityStats (C2)', () => {
  it('memisahkan "terlaksana" (past) dari "total" (semua status)', () => {
    const stats = deriveCommunityStats([
      event('a', 'past'),
      event('b', 'past'),
      event('c', 'ongoing'),
      event('d', 'upcoming'),
      event('e', 'upcoming'),
    ]);
    expect(stats.completed).toBe(2);
    expect(stats.total).toBe(5);
    // Invarian inti: dua angka ini TIDAK boleh sama-sama menyebut satu metrik.
    expect(stats.completed).not.toBe(stats.total);
  });

  it('menghitung penyelenggara unik dari `eo` dan mengabaikan yang kosong', () => {
    const stats = deriveCommunityStats([
      event('a', 'past', 'Sanggar Tari Andini'),
      event('b', 'past', 'Sanggar Tari Andini'),
      event('c', 'past', '   '),
      event('d', 'past', 'Kencono Wungu'),
    ]);
    expect(stats.organizers).toBe(2);
  });

  it('menghitung `eo` walau `pic` kosong — bentuk data produksi', () => {
    // Regresi: produksi mengirim `pic: null` untuk SEMUA event. Saat angka ini
    // dihitung dari `pic`, band kepercayaan menampilkan "- Penyelenggara" —
    // satu-satunya angka kosong, tepat di label yang paling menjual.
    const stats = deriveCommunityStats([
      event('a', 'past', 'Sanggar Tari Andini', ''),
      event('b', 'past', 'Kencono Wungu', ''),
    ]);
    expect(stats.organizers).toBe(2);
  });

  it('jatuh ke `pic` bila `eo` kosong', () => {
    const stats = deriveCommunityStats([event('a', 'past', '', 'Rina Kusuma')]);
    expect(stats.organizers).toBe(1);
  });

  it('mengembalikan nol untuk daftar kosong', () => {
    expect(deriveCommunityStats([])).toEqual({ completed: 0, total: 0, organizers: 0 });
  });
});

describe('label statistik komunitas (C2)', () => {
  it('label `completed` dan `total` berbeda dan spesifik', () => {
    expect(COMMUNITY_STAT_LABELS.completed).not.toBe(COMMUNITY_STAT_LABELS.total);
    // "Total" telanjang adalah label yang dulu bikin dua angka terbaca sebagai satu metrik.
    expect(COMMUNITY_STAT_LABELS.total).not.toBe('Total');
    expect(COMMUNITY_STAT_LABELS.total).toMatch(/Total/);
    expect(COMMUNITY_STAT_LABELS.completed).toMatch(/Terlaksana/);
  });

  it('hero memakai label `completed`, bukan label `total`', () => {
    render(<CommunityHero stats={{ completed: 232 }} />);
    // Scoped to the live badge: the hero also renders a "Daftar Event" CTA, which
    // matches a bare /Event/ query and made it ambiguous. Selector only — the
    // three assertions below (232+, `completed` label, not `total`) are unchanged.
    const badge = screen.getByText(/Event/, { selector: '[aria-live="polite"]' });
    expect(badge).toHaveTextContent('232+');
    expect(badge).toHaveTextContent(COMMUNITY_STAT_LABELS.completed);
    expect(badge).not.toHaveTextContent(COMMUNITY_STAT_LABELS.total);
  });

  it('SocialProof menampilkan ketiga label yang sama dengan hero + /events', () => {
    render(
      <MemoryRouter>
        <CommunitySocialProof totalEvents={251} totalCompleted={232} totalOrganizers={40} />
      </MemoryRouter>,
    );
    expect(screen.getByText(COMMUNITY_STAT_LABELS.completed)).toBeInTheDocument();
    expect(screen.getByText(COMMUNITY_STAT_LABELS.total)).toBeInTheDocument();
    expect(screen.getByText(COMMUNITY_STAT_LABELS.organizers)).toBeInTheDocument();
    // Angka total (251) berdampingan dengan label "Total Event", bukan "Event Terlaksana".
    expect(screen.getByText('251+').nextElementSibling).toHaveTextContent(COMMUNITY_STAT_LABELS.total);
    expect(screen.getByText('232+').nextElementSibling).toHaveTextContent(COMMUNITY_STAT_LABELS.completed);
  });
});
