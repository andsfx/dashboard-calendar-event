import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import axe from 'axe-core';
import type { EventItem } from '../../../types';
import { AnalyticsDashboard } from '../AnalyticsDashboard';

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 'ev-1',
    title: 'Event A',
    organizer: 'Org',
    dateStr: '2026-05-10',
    status: 'upcoming',
    category: 'Pameran',
    categories: ['Pameran'],
    location: 'Atrium',
    lokasi: 'Atrium',
    jam: '10:00',
    eventModel: 'free',
    ...overrides,
  } as EventItem;
}

async function runAxe(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      // jsdom doesn't compute layout/colors reliably for some rules; keep meaningful ones
      'color-contrast': { enabled: false },
    },
  });
  return results.violations;
}

describe('AnalyticsDashboard', () => {
  it('menampilkan empty state saat periode tidak punya event dan lolos axe', async () => {
    const { container } = render(<AnalyticsDashboard events={[]} />);

    expect(screen.getByText('Belum ada data')).toBeInTheDocument();
    expect(screen.getByText('Tidak ada event pada periode ini.')).toBeInTheDocument();
    expect(screen.queryByText('Tren event per bulan')).not.toBeInTheDocument();
    expect(screen.queryByText('Penggunaan lokasi')).not.toBeInTheDocument();

    const violations = await runAxe(container);
    expect(violations).toEqual([]);
  });

  it('menampilkan chart saat periode punya event', () => {
    const thisYear = new Date().getFullYear();
    render(<AnalyticsDashboard events={[makeEvent({ dateStr: `${thisYear}-05-10` })]} />);

    expect(screen.queryByText('Belum ada data')).not.toBeInTheDocument();
    expect(screen.getByText('Tren event per bulan')).toBeInTheDocument();
  });

  it('punya satu h2 sebelum h3 pertama saat periode punya event (heading-order)', () => {
    const thisYear = new Date().getFullYear();
    const { container } = render(
      <AnalyticsDashboard events={[makeEvent({ dateStr: `${thisYear}-05-10` })]} />,
    );

    const h2 = container.querySelectorAll('h2');
    expect(h2).toHaveLength(1);
    expect(h2[0]).toHaveTextContent('Ringkasan analitik');

    const headings = Array.from(container.querySelectorAll('h1, h2, h3'));
    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0]?.tagName).toBe('H2');
    expect(headings.filter(h => h.tagName === 'H3').length).toBeGreaterThan(0);
  });
});
