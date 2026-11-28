import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInsightContext } from '../useInsightContext';

/** Jeda mikro untuk assertion "belum terpanggil" — bukan menunggu jangka panjang. */
const flush = () => Promise.resolve().then(() => {}).then(() => {});

vi.mock('../../utils/api/surveysApi', () => ({
  fetchTenantSurveys: vi.fn(),
}));
vi.mock('../../utils/api/exhibitionsApi', () => ({
  fetchExhibitionLeads: vi.fn(),
}));
vi.mock('../../utils/api/tenantEventProposalsApi', () => ({
  fetchTenantEventProposals: vi.fn(),
}));
vi.mock('../../utils/api/tenantParticipationsApi', () => ({
  fetchTenantParticipations: vi.fn(),
}));
import {
  fetchTenantSurveys,
} from '../../utils/api/surveysApi';
import { fetchExhibitionLeads } from '../../utils/api/exhibitionsApi';
import { fetchTenantEventProposals } from '../../utils/api/tenantEventProposalsApi';
import { fetchTenantParticipations } from '../../utils/api/tenantParticipationsApi';

const mocked = {
  fetchTenantSurveys: vi.mocked(fetchTenantSurveys),
  fetchExhibitionLeads: vi.mocked(fetchExhibitionLeads),
  fetchTenantEventProposals: vi.mocked(fetchTenantEventProposals),
  fetchTenantParticipations: vi.mocked(fetchTenantParticipations),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.fetchTenantSurveys.mockResolvedValue([]);
  mocked.fetchExhibitionLeads.mockResolvedValue([]);
  mocked.fetchTenantEventProposals.mockResolvedValue([]);
  mocked.fetchTenantParticipations.mockResolvedValue([]);
});

describe('useInsightContext — gate prefetch (regresi 429 prefetch global)', () => {
  it('enabled=false: tidak mem-fetch apa pun meski izin true', async () => {
    const { result } = renderHook(() =>
      useInsightContext({
        surveys: true,
        exhibitionLeads: true,
        tenantProposals: true,
        tenantParticipations: true,
        enabled: false,
      }),
    );
    await flush();
    await flush();
    expect(mocked.fetchTenantSurveys).not.toHaveBeenCalled();
    expect(mocked.fetchExhibitionLeads).not.toHaveBeenCalled();
    expect(mocked.fetchTenantEventProposals).not.toHaveBeenCalled();
    expect(mocked.fetchTenantParticipations).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('enabled=true: memuat semua sumber yang diizinkan', async () => {
    const { result } = renderHook(() =>
      useInsightContext({
        surveys: true,
        exhibitionLeads: true,
        tenantProposals: true,
        tenantParticipations: true,
        enabled: true,
      }),
    );
    await waitFor(() => expect(result.current.surveys).toEqual([]));
    expect(mocked.fetchTenantSurveys).toHaveBeenCalledTimes(1);
    expect(mocked.fetchExhibitionLeads).toHaveBeenCalledTimes(1);
    expect(mocked.fetchTenantEventProposals).toHaveBeenCalledTimes(1);
    expect(mocked.fetchTenantParticipations).toHaveBeenCalledTimes(1);
  });

  it('enabled berubah false→true: mem-fetch tepat sekali saat panel dibuka', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useInsightContext({ surveys: true, enabled }),
      { initialProps: { enabled: false } },
    );
    await flush();
    await flush();
    expect(mocked.fetchTenantSurveys).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await waitFor(() => expect(mocked.fetchTenantSurveys).toHaveBeenCalledTimes(1));
  });

  it('enabled berubah true→false→true: tidak me-fetch ulang saat tertutup', async () => {
    const { rerender } = renderHook(
      ({ enabled }) => useInsightContext({ surveys: true, enabled }),
      { initialProps: { enabled: true } },
    );
    await waitFor(() => expect(mocked.fetchTenantSurveys).toHaveBeenCalledTimes(1));
    rerender({ enabled: false });
    await flush();
    await flush();
    expect(mocked.fetchTenantSurveys).toHaveBeenCalledTimes(1);
    rerender({ enabled: true });
    await flush();
    await flush();
    expect(mocked.fetchTenantSurveys).toHaveBeenCalledTimes(2);
  });
});
