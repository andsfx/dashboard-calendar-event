import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } })),
    },
  },
}));

// Mock supabaseApi
vi.mock('../../utils/supabaseApi', () => ({
  fetchTenantSurveys: vi.fn(),
  fetchTenantSurveyById: vi.fn(),
  createTenantSurvey: vi.fn(),
  updateTenantSurvey: vi.fn(),
  submitTenantSurvey: vi.fn(),
  reviewTenantSurvey: vi.fn(),
  fetchTenantSurveyAnalytics: vi.fn(),
  fetchTenantSurveyEventSummary: vi.fn(),
  checkTenantSurveyDuplicate: vi.fn(),
}));

import { useTenantSurveys, useTenantSurveyAnalytics, useTenantSurveyDuplicate } from '../useTenantSurveys';
import {
  fetchTenantSurveys,
  createTenantSurvey,
  submitTenantSurvey,
  fetchTenantSurveyAnalytics,
  checkTenantSurveyDuplicate,
} from '../../utils/supabaseApi';

const mockSurvey = {
  id: 'survey-1',
  event_id: 'evt-1',
  tenant_user_id: 'user-1',
  tenant_name: 'Test EO',
  tenant_organization: 'Test Org',
  tenant_email: 'test@example.com',
  tenant_phone: '081234567890',
  venue_rating: 4,
  management_rating: 4,
  event_organization_rating: 4,
  booth_facility_rating: 4,
  overall_rating: 4,
  feedback_comment: 'Good event',
  improvement_suggestion: 'More parking',
  status: 'submitted' as const,
  submitted_at: '2026-01-01T00:00:00Z',
  reviewed_by: null,
  reviewed_at: null,
  review_notes: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('useTenantSurveys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch surveys on mount', async () => {
    vi.mocked(fetchTenantSurveys).mockResolvedValueOnce([mockSurvey]);

    const { result } = renderHook(() => useTenantSurveys());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.surveys).toHaveLength(1);
    expect(result.current.surveys[0].id).toBe('survey-1');
    expect(result.current.error).toBeNull();
  });

  it('should set error when fetch fails', async () => {
    vi.mocked(fetchTenantSurveys).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTenantSurveys());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.surveys).toHaveLength(0);
  });

  it('should create a new survey', async () => {
    vi.mocked(fetchTenantSurveys).mockResolvedValueOnce([]);
    vi.mocked(createTenantSurvey).mockResolvedValueOnce(mockSurvey);

    const { result } = renderHook(() => useTenantSurveys());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.createSurvey({
      event_id: 'evt-1',
      tenant_name: 'Test EO',
      venue_rating: 4,
      management_rating: 4,
      event_organization_rating: 4,
      booth_facility_rating: 4,
    });

    await waitFor(() => {
      expect(result.current.surveys).toHaveLength(1);
    });
    expect(createTenantSurvey).toHaveBeenCalled();
  });

  it('should submit a draft survey', async () => {
    const draft = { ...mockSurvey, status: 'draft' as const };
    const submitted = { ...mockSurvey, status: 'submitted' as const };

    vi.mocked(fetchTenantSurveys).mockResolvedValueOnce([draft]);
    vi.mocked(submitTenantSurvey).mockResolvedValueOnce(submitted);

    const { result } = renderHook(() => useTenantSurveys());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.submit('survey-1');

    await waitFor(() => {
      expect(result.current.surveys[0].status).toBe('submitted');
    });
    expect(submitTenantSurvey).toHaveBeenCalledWith('survey-1');
  });

  it('should refresh surveys', async () => {
    vi.mocked(fetchTenantSurveys).mockResolvedValueOnce([mockSurvey]);

    const { result } = renderHook(() => useTenantSurveys());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    vi.mocked(fetchTenantSurveys).mockResolvedValueOnce([mockSurvey, { ...mockSurvey, id: 'survey-2' }]);

    await result.current.refreshSurveys();

    await waitFor(() => {
      expect(result.current.surveys).toHaveLength(2);
    });
  });
});

describe('useTenantSurveyAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch analytics on mount', async () => {
    const mockAnalytics = [
      {
        tenant_user_id: 'user-1',
        tenant_organization: 'Test Org',
        total_surveys: 5,
        submitted_surveys: 5,
        avg_venue_rating: 4.2,
        avg_management_rating: 4.0,
        avg_event_organization_rating: 4.4,
        avg_booth_facility_rating: 3.8,
        avg_overall_rating: 4.1,
        last_survey_at: '2026-01-01T00:00:00Z',
      },
    ];
    vi.mocked(fetchTenantSurveyAnalytics).mockResolvedValueOnce(mockAnalytics as never);

    const { result } = renderHook(() => useTenantSurveyAnalytics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.analytics).toHaveLength(1);
    expect(result.current.analytics[0].avg_overall_rating).toBe(4.1);
  });
});

describe('useTenantSurveyDuplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return not-submitted when no eventId', async () => {
    const { result } = renderHook(() => useTenantSurveyDuplicate(null, 'user-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.duplicate.alreadySubmitted).toBe(false);
  });

  it('should return not-submitted when no tenantUserId', async () => {
    const { result } = renderHook(() => useTenantSurveyDuplicate('evt-1', null));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.duplicate.alreadySubmitted).toBe(false);
  });

  it('should detect duplicate submission', async () => {
    vi.mocked(checkTenantSurveyDuplicate).mockResolvedValueOnce({
      alreadySubmitted: true,
      existingSurveyId: 'survey-1',
    });

    const { result } = renderHook(() => useTenantSurveyDuplicate('evt-1', 'user-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.duplicate.alreadySubmitted).toBe(true);
    expect(result.current.duplicate.existingSurveyId).toBe('survey-1');
  });

  it('should detect no duplicate', async () => {
    vi.mocked(checkTenantSurveyDuplicate).mockResolvedValueOnce({
      alreadySubmitted: false,
    });

    const { result } = renderHook(() => useTenantSurveyDuplicate('evt-1', 'user-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.duplicate.alreadySubmitted).toBe(false);
    expect(result.current.duplicate.existingSurveyId).toBeUndefined();
  });
});
