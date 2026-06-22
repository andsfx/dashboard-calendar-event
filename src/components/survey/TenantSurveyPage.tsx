import { useState, useCallback, useEffect } from 'react';
import { ClipboardCheck, BarChart3, List, ChevronLeft } from 'lucide-react';
import type {
  EventItem,
  TenantEventSurvey,
  TenantSurveyFormData,
} from '../../types';
import {
  useTenantSurveys,
  useTenantSurveyAnalytics,
  useTenantSurveyDuplicate,
} from '../../hooks/useTenantSurveys';
import { supabase } from '../../lib/supabase';
import TenantSurveyForm, {
  TenantSurveySuccess,
  TenantSurveyDuplicate,
  TenantSurveyError,
  TenantSurveyLoading,
} from './TenantSurveyForm';
import TenantSurveyList from './TenantSurveyList';
import TenantSurveyAnalyticsPanel from './TenantSurveyAnalytics';

type TabKey = 'list' | 'analytics';
type ViewMode = 'list' | 'form' | 'detail';
type FormStatus = 'idle' | 'submitting' | 'success' | 'error' | 'duplicate';

interface TenantSurveyPageProps {
  events: Array<Pick<EventItem, 'id' | 'acara' | 'tanggal' | 'dateStr' | 'lokasi' | 'eo' | 'status'>>;
}

export default function TenantSurveyPage({ events }: TenantSurveyPageProps) {
  // ─── View State ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('list');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingSurvey, setEditingSurvey] = useState<TenantEventSurvey | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // ─── Form State ────────────────────────────────────────────────
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ─── Hooks ─────────────────────────────────────────────────────
  const { surveys, isLoading, error, refreshSurveys, createSurvey, editSurvey, submit } = useTenantSurveys();
  const { analytics, isLoading: analyticsLoading } = useTenantSurveyAnalytics();
  const {
    duplicate,
    isLoading: duplicateLoading,
    recheckDuplicate,
  } = useTenantSurveyDuplicate(
    viewMode === 'form' && !editingSurvey ? selectedEventId : null,
    currentUserId,
  );

  // ─── Fetch current user ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setCurrentUserId(data.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleNewSurvey = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
    setEditingSurvey(null);
    setFormStatus('idle');
    setFormError(null);
    setDuplicateError(null);
    setViewMode('form');
  }, []);

  const handleEditDraft = useCallback((survey: TenantEventSurvey) => {
    setEditingSurvey(survey);
    setSelectedEventId(survey.event_id);
    setFormStatus('idle');
    setFormError(null);
    setViewMode('form');
  }, []);

  const handleViewDetail = useCallback((survey: TenantEventSurvey) => {
    setEditingSurvey(survey);
    setSelectedEventId(survey.event_id);
    setViewMode('detail');
  }, []);

  const handleCancelForm = useCallback(() => {
    setViewMode('list');
    setEditingSurvey(null);
    setSelectedEventId(null);
    setFormStatus('idle');
    setFormError(null);
    setDuplicateError(null);
  }, []);

  const handleFormSubmit = useCallback(async (data: TenantSurveyFormData, isDraft: boolean) => {
    setFormStatus('submitting');
    setFormError(null);
    setDuplicateError(null);

    try {
      if (editingSurvey) {
        // Update existing survey
        await editSurvey(editingSurvey.id, {
          ...data,
          status: isDraft ? 'draft' : 'submitted',
        });
      } else {
        // Create new + submit if needed
        const created = await createSurvey(data);
        if (!isDraft) {
          await submit(created.id);
        }
      }

      setFormStatus('success');
      await refreshSurveys();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan survey';

      // Detect duplicate via Supabase unique-constraint error message
      if (/sudah pernah|already|duplicate|23505/i.test(msg)) {
        setFormStatus('duplicate');
        setDuplicateError(msg);
        recheckDuplicate();
      } else {
        setFormStatus('error');
        setFormError(msg);
      }
    }
  }, [editingSurvey, createSurvey, editSurvey, submit, refreshSurveys, recheckDuplicate]);

  const handleSubmitDraft = useCallback(async (id: string) => {
    try {
      await submit(id);
      await refreshSurveys();
    } catch (err) {
      console.error('Submit draft failed:', err);
    }
  }, [submit, refreshSurveys]);

  const handleStartNewAfterSuccess = useCallback(() => {
    setFormStatus('idle');
    setFormError(null);
    setDuplicateError(null);
    setViewMode('list');
    setEditingSurvey(null);
    setSelectedEventId(null);
  }, []);

  // ─── Derived ───────────────────────────────────────────────────
  const selectedEvent = events.find(e => e.id === selectedEventId) ?? null;

  // ─── Render ────────────────────────────────────────────────────

  // LIST VIEW + LIST TAB
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'list'
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            <List className="h-4 w-4" />
            Self-Assessment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'analytics'
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </button>
        </div>

        {activeTab === 'list' && (
          <TenantSurveyList
            surveys={surveys}
            events={events}
            isLoading={isLoading}
            error={error}
            onNewSurvey={handleNewSurvey}
            onEditDraft={handleEditDraft}
            onSubmitDraft={handleSubmitDraft}
            onViewDetail={handleViewDetail}
            onRefresh={refreshSurveys}
          />
        )}

        {activeTab === 'analytics' && (
          <TenantSurveyAnalyticsPanel
            analytics={analytics}
            surveys={surveys}
            isLoading={analyticsLoading}
          />
        )}
      </div>
    );
  }

  // DETAIL VIEW
  if (viewMode === 'detail' && editingSurvey && selectedEvent) {
    return (
      <div>
        <button
          type="button"
          onClick={handleCancelForm}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 transition hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke daftar
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-1 text-lg font-bold text-slate-800 dark:text-slate-200">
            {selectedEvent.acara}
          </h2>
          <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">
            {selectedEvent.tanggal} &bull; {selectedEvent.lokasi}
          </p>

          {/* Ratings grid */}
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ['venue_rating', 'Venue'],
              ['management_rating', 'Manajemen'],
              ['event_organization_rating', 'Organisasi'],
              ['booth_facility_rating', 'Fasilitas Booth'],
            ] as const).map(([key, label]) => {
              const val = editingSurvey[key];
              return (
                <div
                  key={key}
                  className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                  <span className={`mt-1 text-xl font-bold ${
                    val != null && val >= 4 ? 'text-emerald-500'
                    : val != null && val >= 3 ? 'text-yellow-500'
                    : 'text-red-500'
                  }`}>
                    {val ?? '-'}/5
                  </span>
                </div>
              );
            })}
          </div>

          {/* Comments */}
          {(editingSurvey.feedback_comment || editingSurvey.improvement_suggestion) && (
            <div className="space-y-3">
              {editingSurvey.feedback_comment && (
                <div>
                  <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Feedback</h4>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">
                    {editingSurvey.feedback_comment}
                  </p>
                </div>
              )}
              {editingSurvey.improvement_suggestion && (
                <div>
                  <h4 className="text-xs font-semibold text-violet-600 dark:text-violet-400">Saran Perbaikan</h4>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">
                    {editingSurvey.improvement_suggestion}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Review notes */}
          {editingSurvey.status === 'reviewed' && editingSurvey.review_notes && (
            <div className="mt-4 rounded-xl bg-violet-50 p-4 dark:bg-violet-950/30">
              <h4 className="text-xs font-semibold text-violet-700 dark:text-violet-300">Review Admin</h4>
              <p className="mt-1 text-sm text-violet-600 dark:text-violet-400">
                {editingSurvey.review_notes}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // FORM VIEW — show states in priority order

  // LOADING (initial event fetch or duplicate check)
  if (formStatus === 'submitting' && !editingSurvey && !selectedEvent) {
    return <TenantSurveyLoading message="Menyimpan survey..." />;
  }

  if (duplicateLoading && !editingSurvey && viewMode === 'form') {
    return <TenantSurveyLoading message="Memeriksa status pengajuan..." />;
  }

  if (!selectedEvent) {
    return (
      <TenantSurveyError
        message="Event tidak ditemukan. Silakan kembali ke daftar event."
        onBack={handleCancelForm}
      />
    );
  }

  // DUPLICATE state — for new survey, server says one already exists
  if (formStatus === 'duplicate' && !editingSurvey) {
    return (
      <div>
        <button
          type="button"
          onClick={handleStartNewAfterSuccess}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 transition hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke daftar
        </button>
        <TenantSurveyDuplicate
          eventName={selectedEvent.acara}
          onBack={handleStartNewAfterSuccess}
          onViewExisting={duplicate.existingSurveyId ? undefined : undefined}
        />
        {duplicateError && (
          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            {duplicateError}
          </p>
        )}
      </div>
    );
  }

  // Pre-check duplicate (before showing form)
  if (
    !editingSurvey &&
    duplicate.alreadySubmitted &&
    duplicate.existingSurveyId &&
    viewMode === 'form'
  ) {
    return (
      <div>
        <button
          type="button"
          onClick={handleStartNewAfterSuccess}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 transition hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke daftar
        </button>
        <TenantSurveyDuplicate
          eventName={selectedEvent.acara}
          onBack={handleStartNewAfterSuccess}
          onViewExisting={() => {
            // Reload existing survey for viewing
            handleStartNewAfterSuccess();
            const existing = surveys.find(s => s.id === duplicate.existingSurveyId);
            if (existing) handleViewDetail(existing);
          }}
        />
      </div>
    );
  }

  // ERROR state
  if (formStatus === 'error' && formError) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setFormStatus('idle')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 transition hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Coba lagi
        </button>
        <TenantSurveyError
          message={formError}
          onRetry={() => setFormStatus('idle')}
          onBack={handleStartNewAfterSuccess}
        />
      </div>
    );
  }

  // SUCCESS state — only after fresh submission, not edit-draft
  if (formStatus === 'success' && !editingSurvey) {
    return (
      <TenantSurveySuccess
        eventName={selectedEvent.acara}
        onBack={handleStartNewAfterSuccess}
      />
    );
  }

  // DEFAULT — show the form (with disabled state if duplicate detected)
  return (
    <div>
      <button
        type="button"
        onClick={handleCancelForm}
        disabled={formStatus === 'submitting'}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 transition hover:text-violet-700 disabled:opacity-50 dark:text-violet-400 dark:hover:text-violet-300"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke daftar
      </button>

      <TenantSurveyForm
        event={selectedEvent}
        initialData={editingSurvey ? {
          event_id: editingSurvey.event_id,
          tenant_name: editingSurvey.tenant_name,
          tenant_organization: editingSurvey.tenant_organization,
          tenant_email: editingSurvey.tenant_email,
          tenant_phone: editingSurvey.tenant_phone,
          venue_rating: editingSurvey.venue_rating,
          management_rating: editingSurvey.management_rating,
          event_organization_rating: editingSurvey.event_organization_rating,
          booth_facility_rating: editingSurvey.booth_facility_rating,
          overall_rating: editingSurvey.overall_rating,
          feedback_comment: editingSurvey.feedback_comment,
          improvement_suggestion: editingSurvey.improvement_suggestion,
        } : undefined}
        onSubmit={handleFormSubmit}
        onCancel={handleCancelForm}
        isSubmitting={formStatus === 'submitting'}
      />
    </div>
  );
}
