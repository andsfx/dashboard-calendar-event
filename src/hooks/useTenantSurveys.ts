import { useState, useEffect, useCallback } from 'react';
import {
  TenantEventSurvey,
  TenantSurveyFormData,
  TenantSurveyAnalytics,
  TenantSurveyMonthlyTrend,
  TenantSurveyEventSummary,
  DuplicateCheckResult,
} from '../types';
import {
  fetchTenantSurveys,
  fetchTenantSurveyById,
  createTenantSurvey,
  updateTenantSurvey,
  submitTenantSurvey,
  reviewTenantSurvey,
  deleteTenantSurvey,
  fetchTenantSurveyAnalytics,
  fetchTenantSurveyMonthlyTrend,
  fetchTenantSurveyEventSummary,
  checkTenantSurveyDuplicate,
  fetchPublicTenantSurveyResults,
  fetchPublicTenantSurveyMonthlyTrend,
} from '../utils/supabaseApi';
import { supabase } from '../lib/supabase';

/**
 * useTenantSurveys — manages tenant (EO) self-assessment surveys.
 *
 * Provides CRUD, submit, review, analytics, and realtime sync.
 * Follows the same pattern as useEvents for consistency.
 *
 * @param eventId optional event filter
 * @param opts.publicMode use rate-limited public results API (no login, no realtime)
 */
export function useTenantSurveys(
  eventId?: string,
  opts?: { publicMode?: boolean },
) {
  const publicMode = !!opts?.publicMode;
  const [surveys, setSurveys] = useState<TenantEventSurvey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch surveys ─────────────────────────────────────────────
  const refreshSurveys = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = publicMode
        ? await fetchPublicTenantSurveyResults(eventId)
        : await fetchTenantSurveys(eventId);
      setSurveys(data);
    } catch (err) {
      console.error('Fetch tenant surveys error:', err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Gagal memuat survey tenant.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [eventId, publicMode]);

  useEffect(() => {
    refreshSurveys();
  }, [refreshSurveys]);

  // ─── Realtime subscription (auth only) ─────────────────────────
  useEffect(() => {
    if (publicMode) return;
    const channel = supabase
      .channel('tenant-surveys-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenant_event_surveys' },
        () => { refreshSurveys(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshSurveys, publicMode]);

  // ─── CRUD operations ──────────────────────────────────────────
  const createSurvey = useCallback(async (formData: TenantSurveyFormData): Promise<TenantEventSurvey> => {
    const survey = await createTenantSurvey(formData);
    setSurveys(prev => [survey, ...prev]);
    return survey;
  }, []);

  const editSurvey = useCallback(async (
    id: string,
    updates: Partial<TenantSurveyFormData> & { status?: TenantEventSurvey['status'] },
  ): Promise<TenantEventSurvey> => {
    const updated = await updateTenantSurvey(id, updates);
    setSurveys(prev => prev.map(s => s.id === id ? updated : s));
    return updated;
  }, []);

  const submit = useCallback(async (id: string): Promise<TenantEventSurvey> => {
    const submitted = await submitTenantSurvey(id);
    setSurveys(prev => prev.map(s => s.id === id ? submitted : s));
    return submitted;
  }, []);

  const review = useCallback(async (id: string, reviewNotes = ''): Promise<TenantEventSurvey> => {
    const reviewed = await reviewTenantSurvey(id, reviewNotes);
    setSurveys(prev => prev.map(s => s.id === id ? reviewed : s));
    return reviewed;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteTenantSurvey(id);
    setSurveys(prev => prev.filter(s => s.id !== id));
  }, []);

  const getSurveyById = useCallback(async (id: string): Promise<TenantEventSurvey> => {
    return fetchTenantSurveyById(id);
  }, []);

  return {
    surveys,
    isLoading,
    error,
    refreshSurveys,
    createSurvey,
    editSurvey,
    submit,
    review,
    remove,
    getSurveyById,
  };
}

/**
 * useTenantSurveyAnalytics — fetches aggregated tenant survey analytics
 * with realtime auto-refresh on data changes.
 */
export function useTenantSurveyAnalytics(eventId?: string | null) {
  const [analytics, setAnalytics] = useState<TenantSurveyAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTenantSurveyAnalytics(
        eventId ? { eventId } : {},
      );
      setAnalytics(data as TenantSurveyAnalytics[]);
    } catch (err) {
      console.error('Fetch tenant analytics error:', err);
      setError('Gagal memuat analytics tenant.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  useEffect(() => {
    const channel = supabase
      .channel('tenant-survey-analytics-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenant_event_surveys' },
        () => { refreshAnalytics(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAnalytics]);

  return { analytics, isLoading, error, refreshAnalytics };
}

/**
 * useTenantSurveyEventSummary — fetches combined visitor + tenant summary for one event.
 */
export function useTenantSurveyEventSummary(eventId: string | null) {
  const [summary, setSummary] = useState<TenantSurveyEventSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSummary = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTenantSurveyEventSummary(eventId);
      setSummary(data);
    } catch (err) {
      console.error('Fetch event summary error:', err);
      setError('Gagal memuat ringkasan event.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  return { summary, isLoading, error, refreshSummary };
}

/**
 * useTenantSurveyMonthlyTrend — fetches monthly aggregated trend data
 * for the last 12 months. Used for the trend chart in analytics tab.
 */
export function useTenantSurveyMonthlyTrend(
  eventId?: string | null,
  opts?: { publicMode?: boolean },
) {
  const publicMode = !!opts?.publicMode;
  const [trend, setTrend] = useState<TenantSurveyMonthlyTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTrend = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = publicMode
        ? await fetchPublicTenantSurveyMonthlyTrend(eventId ?? undefined)
        : await fetchTenantSurveyMonthlyTrend(eventId ?? undefined);
      setTrend(data);
    } catch (err) {
      console.error('Fetch monthly trend error:', err);
      setError('Gagal memuat trend bulanan.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, publicMode]);

  useEffect(() => {
    refreshTrend();
  }, [refreshTrend]);

  return { trend, isLoading, error, refreshTrend };
}

/**
 * useTenantSurveyDuplicate — checks if a tenant has already submitted
 * a survey for a specific event. Used by the form to show a
 * duplicate-submission state before allowing a new submission.
 */
export function useTenantSurveyDuplicate(eventId: string | null, tenantUserId: string | null) {
  const [duplicate, setDuplicate] = useState<DuplicateCheckResult>({ alreadySubmitted: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDuplicate = useCallback(async () => {
    if (!eventId || !tenantUserId) {
      setDuplicate({ alreadySubmitted: false });
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await checkTenantSurveyDuplicate(eventId, tenantUserId);
      setDuplicate(result);
    } catch (err) {
      console.error('Duplicate check error:', err);
      setError('Gagal memeriksa status survey.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, tenantUserId]);

  useEffect(() => {
    checkDuplicate();
  }, [checkDuplicate]);

  return { duplicate, isLoading, error, recheckDuplicate: checkDuplicate };
}
