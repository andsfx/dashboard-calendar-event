import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchInsightNarrative } from '../insightsApi';
import type { EventInsight } from '../../../types';

/** Pasang mock fetch global dan kembalikan mock-nya agar `calls` bisa diperiksa. */
function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const insight: EventInsight = {
  id: 'antrian',
  severity: 'peringatan',
  title: 'Antrian menunggu tindakan',
  body: '2 draft menunggu dipublikasikan.',
  metric: '2',
  actions: [{ label: 'Antrian Draft', path: '/drafts' }],
  crossModule: true,
};

describe('fetchInsightNarrative', () => {
  it('mengirim hanya fakta (tanpa actions/crossModule) ke aksi admin', async () => {
    const fetchMock = mockFetch({ success: true, enabled: true, summary: 'Ringkas.' });

    const result = await fetchInsightNarrative([insight]);
    expect(result).toEqual({ enabled: true, summary: 'Ringkas.' });

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const sent = JSON.parse(String(call?.[1]?.body));
    expect(sent.action).toBe('getInsightNarrative');
    expect(sent.insights[0]).toEqual({
      severity: 'peringatan',
      title: 'Antrian menunggu tindakan',
      body: '2 draft menunggu dipublikasikan.',
      metric: '2',
    });
    expect(sent.insights[0]).not.toHaveProperty('actions');
    expect(sent.insights[0]).not.toHaveProperty('crossModule');
  });

  it('melaporkan enabled:false saat server belum dikonfigurasi', async () => {
    mockFetch({ success: true, enabled: false, summary: null });
    const result = await fetchInsightNarrative([insight]);
    expect(result).toEqual({ enabled: false, summary: null });
  });

  it('memperlakukan summary kosong sebagai null', async () => {
    mockFetch({ success: true, enabled: true });
    const result = await fetchInsightNarrative([insight]);
    expect(result.summary).toBeNull();
  });
});