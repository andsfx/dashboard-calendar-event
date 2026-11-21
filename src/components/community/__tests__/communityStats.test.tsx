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
    expect(COMMUNITY_STAT_LABELS.completed).toMatch(/terlaksana/);
  });

  it('hero memakai label `completed`, bukan label `total`', () => {
    render(
      <MemoryRouter>
        <CommunityHero stats={{ completed: 232 }} />
      </MemoryRouter>,
    );
    // Scoped by the angka itu sendiri: kelas `.community-hero-in` dipakai pada
    // lima simpul hero (badge, h1, paragraf, CTA, kartu), dan setelah revisi
    // copy paragraf ikut memuat kata "Event" — query /Event/ dengan selector
    // kelas itu jadi ambigu. Kontrak yang diuji tetap sama: angka di badge
    // memakai label `completed`, bukan `total`.
    const amount = screen.getByText(/232\+/);
    const badge = amount.closest('.community-hero-in');
    expect(badge).toBeTruthy();
    expect(badge).toHaveTextContent(COMMUNITY_STAT_LABELS.completed);
    expect(badge).not.toHaveTextContent(COMMUNITY_STAT_LABELS.total);
  });

  it('SocialProof menampilkan dua metrik kumulatif tanpa label `total`', () => {
    render(
      <MemoryRouter>
        <CommunitySocialProof totalCompleted={232} totalOrganizers={40} />
      </MemoryRouter>,
    );
    expect(screen.getByText(COMMUNITY_STAT_LABELS.completed)).toBeInTheDocument();
    expect(screen.getByText(COMMUNITY_STAT_LABELS.organizers)).toBeInTheDocument();
    // "Total event" sengaja hanya milik /events: di band kepercayaan angkanya
    // bertabrakan dengan "Event terlaksana" tanpa pembeda.
    expect(screen.queryByText(COMMUNITY_STAT_LABELS.total)).not.toBeInTheDocument();
    expect(screen.getByText('232+').nextElementSibling).toHaveTextContent(COMMUNITY_STAT_LABELS.completed);
    expect(screen.getByText('40+').nextElementSibling).toHaveTextContent(COMMUNITY_STAT_LABELS.organizers);
  });
});
