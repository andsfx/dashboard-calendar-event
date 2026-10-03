import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { EventInsight } from '../../../types';
import { InsightAiSummary } from '../InsightAiSummary';

const insight: EventInsight = {
  id: 'antrian',
  severity: 'peringatan',
  title: 'Antrian menunggu tindakan',
  body: '2 draft menunggu.',
  metric: '2',
};

/** Mock modul API — blok ini soal penyajian, bukan transport. */
const fetchInsightNarrative = vi.hoisted(() => vi.fn());
vi.mock('../../../utils/api/insightsApi', () => ({ fetchInsightNarrative }));

const TIMEOUT = { timeout: 4000 };

beforeEach(() => {
  fetchInsightNarrative.mockReset();
});

describe('InsightAiSummary', () => {
  it('menampilkan ringkasan setelah server membalas', async () => {
    fetchInsightNarrative.mockResolvedValue({ enabled: true, summary: 'Prioritaskan bentrok area.' });

    render(<InsightAiSummary insights={[insight]} />);

    expect(await screen.findByText('Ringkasan AI', {}, TIMEOUT)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Prioritaskan bentrok area.')).toBeInTheDocument(), TIMEOUT);
  });

  it('menghilang tanpa jejak saat fitur belum dikonfigurasi', async () => {
    fetchInsightNarrative.mockResolvedValue({ enabled: false, summary: null });

    render(<InsightAiSummary insights={[insight]} />);

    await waitFor(() => expect(fetchInsightNarrative).toHaveBeenCalled(), TIMEOUT);
    await waitFor(() => expect(screen.queryByText('Ringkasan AI')).not.toBeInTheDocument(), TIMEOUT);
  });

  it('tidak memanggil narasi saat tidak ada insight', async () => {
    render(<InsightAiSummary insights={[]} />);
    const settle = Promise.withResolvers<void>();
    setTimeout(settle.resolve, 900);
    await settle.promise;
    expect(fetchInsightNarrative).not.toHaveBeenCalled();
    expect(screen.queryByText('Ringkasan AI')).not.toBeInTheDocument();
  });

  it('diam saja saat panggilan gagal (tidak menampilkan error)', async () => {
    fetchInsightNarrative.mockRejectedValue(new Error('jaringan mati'));

    render(<InsightAiSummary insights={[insight]} />);

    await waitFor(() => expect(fetchInsightNarrative).toHaveBeenCalled(), TIMEOUT);
    await waitFor(() => expect(screen.queryByText('Ringkasan AI')).not.toBeInTheDocument(), TIMEOUT);
  });
});