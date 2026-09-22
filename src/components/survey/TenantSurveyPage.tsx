import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { ClipboardCheck, BarChart3, List, ChevronLeft, ChevronDown, ChevronUp, Store, MapPin, Tag, TrendingUp, DollarSign, Download, Link2, Check, ToggleLeft, ToggleRight, Loader2, QrCode, User, Phone, Calendar, Search, Edit, Send, Trash2, Eye, AlertTriangle } from 'lucide-react';
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
import { apiGet, apiPost, apiUrl } from '../../lib/rest';
import { isV3Survey } from '../../utils/surveyUtils';
import TenantSurveyForm, {
  TenantSurveySuccess,
  TenantSurveyDuplicate,
  TenantSurveyError,
  TenantSurveyLoading,
} from './TenantSurveyForm';
import TenantSurveyList from './TenantSurveyList';
import TenantSurveyAnalyticsPanel from './TenantSurveyAnalytics';

const SurveyQRCode = lazy(() => import('./SurveyQRCode'));

type TabKey = 'list' | 'analytics';
type ViewMode = 'list' | 'form' | 'detail';
type FormStatus = 'idle' | 'submitting' | 'success' | 'error' | 'duplicate';

interface TenantSurveyPageProps {
  events: Array<Pick<EventItem, 'id' | 'acara' | 'tanggal' | 'dateStr' | 'lokasi' | 'eo' | 'status'>>;
  isAdmin?: boolean;
}

export default function TenantSurveyPage({ events, isAdmin = false }: TenantSurveyPageProps) {
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

  // ─── Event Management State ─────────────────────────────────────
  // Default false until config-get hydrates (no row = inactive)
  const [activeConfigs, setActiveConfigs] = useState<Record<string, boolean>>({});
  const [configLoading, setConfigLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState('');
  const [analyticsEventFilter, setAnalyticsEventFilter] = useState<string>('all');

  // ─── Detail CRUD state ─────────────────────────────────────────
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<'review' | 'delete' | 'submit' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ─── Hooks ─────────────────────────────────────────────────────
  const {
    surveys,
    isLoading,
    error,
    refreshSurveys,
    createSurvey,
    editSurvey,
    submit,
    review,
    remove,
  } = useTenantSurveys();
  const { analytics, isLoading: analyticsLoading } = useTenantSurveyAnalytics(
    analyticsEventFilter !== 'all' ? analyticsEventFilter : null,
  );
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
    apiGet<{ success: boolean; user: { id: string } | null }>('/auth/me')
      .then((data) => {
        if (!cancelled) setCurrentUserId(data.user?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setCurrentUserId(null);
      });
    return () => { cancelled = true; };
  }, []);

  // ─── Hydrate is_active per event (config-get) ──────────────────
  // past + ongoing: survey self-assessment biasanya pasca/saat event selesai
  useEffect(() => {
    const surveyableIds = events
      .filter((e) => e.status === 'past' || e.status === 'ongoing')
      .map((e) => e.id);
    if (surveyableIds.length === 0) return;

    let cancelled = false;
    (async () => {
      // GET /api/v1/tenant/config — cookie auth via apiGet (credentials include).
      const entries = await Promise.all(
        surveyableIds.map(async (id) => {
          try {
            const cfg = await apiGet<{ is_active?: boolean }>(
              `/tenant/config?event_id=${encodeURIComponent(id)}`,
            );
            return [id, cfg?.is_active === true] as const;
          } catch {
            return [id, false] as const;
          }
        }),
      );
      if (cancelled) return;
      setActiveConfigs(Object.fromEntries(entries));
    })();

    return () => { cancelled = true; };
  }, [events]);

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
    setReviewNotes(survey.review_notes || '');
    setReviewOpen(false);
    setConfirmDelete(false);
    setActionError(null);
    setViewMode('detail');
  }, []);

  const handleEditSurvey = useCallback((survey: TenantEventSurvey) => {
    // Draft: anyone; submitted/reviewed: admin only
    if (survey.status !== 'draft' && !isAdmin) return;
    setEditingSurvey(survey);
    setSelectedEventId(survey.event_id);
    setFormStatus('idle');
    setFormError(null);
    setDuplicateError(null);
    setViewMode('form');
  }, [isAdmin]);

  const handleCancelForm = useCallback(() => {
    setViewMode('list');
    setEditingSurvey(null);
    setSelectedEventId(null);
    setFormStatus('idle');
    setFormError(null);
    setDuplicateError(null);
    setReviewOpen(false);
    setConfirmDelete(false);
    setActionError(null);
  }, []);

  const handleReview = useCallback(async () => {
    if (!editingSurvey || !isAdmin) return;
    setActionLoading('review');
    setActionError(null);
    try {
      const updated = await review(editingSurvey.id, reviewNotes.trim());
      setEditingSurvey(updated);
      setReviewOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal me-review survey');
    } finally {
      setActionLoading(null);
    }
  }, [editingSurvey, isAdmin, review, reviewNotes]);

  const handleDelete = useCallback(async () => {
    if (!editingSurvey || !isAdmin) return;
    setActionLoading('delete');
    setActionError(null);
    try {
      await remove(editingSurvey.id);
      handleCancelForm();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal menghapus survey');
      setConfirmDelete(false);
    } finally {
      setActionLoading(null);
    }
  }, [editingSurvey, isAdmin, remove, handleCancelForm]);

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

      // Duplikat (unique constraint) → pesan Indonesia baku, bukan mentah server.
      if (/sudah pernah|already|duplicate|23505/i.test(msg)) {
        setFormStatus('duplicate');
        setDuplicateError('Anda sudah pernah mengirimkan survey untuk event ini.');
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

  // ─── Event Management Handlers ──────────────────────────────────
  const handleToggleConfig = useCallback(async (eventId: string, currentActive: boolean) => {
    setConfigLoading(eventId);
    setActionError(null);
    try {
      // POST /api/v1/tenant/config-set — cookie auth via apiPost.
      const json = await apiPost<{ success: boolean; error?: string }>('/tenant/config-set', {
        event_id: eventId,
        is_active: !currentActive,
      });
      if (json.success) {
        setActiveConfigs(prev => ({ ...prev, [eventId]: !currentActive }));
      } else {
        setActionError(json.error || 'Gagal mengubah status survey.');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal mengubah status survey.');
    }
    finally { setConfigLoading(null); }
  }, []);

  const handleCopyLink = useCallback(async (eventId: string) => {
    const url = `${window.location.origin}/tenant-survey/${eventId}`;
    setActionError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(eventId);
      setTimeout(() => setCopiedId(''), 2000);
    } catch {
      setActionError('Gagal menyalin tautan. Salin manual dari address bar.');
    }
  }, []);

  const handleExport = useCallback(async (eventId: string) => {
    setActionError(null);
    try {
      // GET /api/v1/tenant/export — CSV blob; cookie via credentials include.
      const res = await fetch(apiUrl(`/tenant/export?event_id=${encodeURIComponent(eventId)}`), {
        credentials: 'include',
      });
      if (!res.ok) {
        setActionError('Gagal mengunduh CSV. Coba lagi atau periksa koneksi Anda.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenant-survey-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionError('Gagal mengunduh CSV. Coba lagi atau periksa koneksi Anda.');
    }
  }, []);

  // ─── Derived ───────────────────────────────────────────────────
  const selectedEvent = events.find(e => e.id === selectedEventId) ?? null;

  // ─── Render ────────────────────────────────────────────────────

  // LIST VIEW + LIST TAB
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Tenant self-assessment"
          className="ui-dashboard-surface flex gap-1 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'list'}
            onClick={() => setActiveTab('list')}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
              activeTab === 'list'
                ? 'bg-[var(--wf-accent)] text-[var(--wf-accent-ink)]'
                : 'text-[var(--wf-ink-muted)] hover:text-[var(--wf-ink)]'
            }`}
          >
              <List className="h-4 w-4" />
              Self-Assessment
            </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
              activeTab === 'analytics'
                ? 'bg-[var(--wf-accent)] text-[var(--wf-accent-ink)]'
                : 'text-[var(--wf-ink-muted)] hover:text-[var(--wf-ink)]'
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
            isAdmin={isAdmin}
            onNewSurvey={handleNewSurvey}
            onEditDraft={handleEditDraft}
            onEditSurvey={handleEditSurvey}
            onSubmitDraft={handleSubmitDraft}
            onViewDetail={handleViewDetail}
            onRefresh={refreshSurveys}
          />
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-3">
            <div className="ui-dashboard-surface flex flex-wrap items-center gap-2 px-3 py-2.5">
              <Calendar className="h-3.5 w-3.5 text-[var(--wf-ink-muted)]" />
              <span className="text-xs font-medium text-[var(--wf-ink-muted)]">Event</span>
              <select
                value={analyticsEventFilter}
                onChange={(e) => setAnalyticsEventFilter(e.target.value)}
                className="ui-dashboard-control cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--wf-ink)] outline-none transition-colors focus:ring-2 focus:ring-[var(--wf-accent)]"
              >
                <option value="all">Semua Event</option>
                {events
                  .filter(ev => ev.status === 'past' || ev.status === 'ongoing')
                  .map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.acara}</option>
                  ))}
              </select>
            </div>

            <TenantSurveyAnalyticsPanel
              analytics={analytics}
              surveys={
                analyticsEventFilter === 'all'
                  ? surveys
                  : surveys.filter(s => s.event_id === analyticsEventFilter)
              }
              isLoading={analyticsLoading}
              eventFilter={analyticsEventFilter !== 'all' ? analyticsEventFilter : null}
            />
          </div>
        )}

        <TenantSurveyManagementSection
          events={events}
          copiedId={copiedId}
          onCopyLink={handleCopyLink}
          onExport={handleExport}
          onToggleConfig={handleToggleConfig}
          configLoading={configLoading}
          activeConfigs={activeConfigs}
          readOnly={!isAdmin}
        />
      </div>
    );
  }

  // DETAIL VIEW
  if (viewMode === 'detail' && editingSurvey && selectedEvent) {
    const canEdit = editingSurvey.status === 'draft' || isAdmin;
    const canReview = isAdmin && (editingSurvey.status === 'submitted' || editingSurvey.status === 'reviewed');
    const canDelete = isAdmin;
    const canSubmitDraft = editingSurvey.status === 'draft';

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleCancelForm}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-[var(--wf-accent)] transition-colors hover:text-[var(--wf-accent-hover)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke daftar
        </button>

        <div className="ui-dashboard-surface p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[var(--wf-ink)]">
                {selectedEvent.acara}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)]">
                {selectedEvent.tanggal} &bull; {selectedEvent.lokasi}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-[var(--wf-ink-muted)]">
                Status: <span className="font-semibold text-[var(--wf-ink)]">{editingSurvey.status}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleEditSurvey(editingSurvey)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--wf-rule)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-ink)] transition-colors hover:bg-[var(--wf-board-2)]"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Ubah
                </button>
              )}
              {canSubmitDraft && (
                <button
                  type="button"
                  disabled={actionLoading === 'submit'}
                  onClick={async () => {
                    setActionLoading('submit');
                    setActionError(null);
                    try {
                      const updated = await submit(editingSurvey.id);
                      setEditingSurvey(updated);
                    } catch (err) {
                      setActionError(err instanceof Error ? err.message : 'Gagal mengirim draft');
                    } finally {
                      setActionLoading(null);
                    }
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--wf-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-accent-ink)] transition-colors hover:bg-[var(--wf-accent-hover)] disabled:opacity-50"
                >
                  {actionLoading === 'submit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Kirim
                </button>
              )}
              {canReview && (
                <button
                  type="button"
                  onClick={() => {
                    setReviewOpen((v) => !v);
                    setConfirmDelete(false);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-accent)] transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {editingSurvey.status === 'reviewed' ? 'Update review' : 'Review'}
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(true);
                    setReviewOpen(false);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-600/10 dark:border-red-800 dark:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </button>
              )}
            </div>
          </div>

          {actionError && (
            <div className="mb-4 rounded-[var(--wf-radius-board)] border border-red-200 bg-red-600/10 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:text-red-300">
              {actionError}
            </div>
          )}

          {confirmDelete && (
            <div className="mb-4 rounded-[var(--wf-radius-board)] border border-red-200 bg-red-600/10 p-4 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">Hapus response ini?</p>
                  <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">
                    Permanen. Tidak bisa dibatalkan.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={actionLoading === 'delete'}
                      onClick={handleDelete}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading === 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Ya, hapus
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === 'delete'}
                      onClick={() => setConfirmDelete(false)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--wf-rule)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-ink)]"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reviewOpen && canReview && (
            <div className="mb-4 rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] p-4">
              <label htmlFor="review-notes" className="text-xs font-semibold text-[var(--wf-accent)]">
                Catatan review
              </label>
              <textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Opsional. Ringkas temuan admin…"
                className="mt-1.5 w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)] focus:border-[var(--wf-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--wf-accent)]"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actionLoading === 'review'}
                  onClick={handleReview}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--wf-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-accent-ink)] transition-colors hover:bg-[var(--wf-accent-hover)] disabled:opacity-50"
                >
                  {actionLoading === 'review' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Simpan review
                </button>
                <button
                  type="button"
                  disabled={actionLoading === 'review'}
                  onClick={() => setReviewOpen(false)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--wf-rule)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-ink)]"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Ratings grid (v2) / Info grid (v3) */}
          {isV3Survey(editingSurvey) ? (
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-7">
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <Store className="mb-1 h-4 w-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">Gerai</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.nama_gerai || '-'}</span>
              </div>
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <MapPin className="mb-1 h-4 w-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">Lokasi</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.lokasi_zona || '-'}</span>
              </div>
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <Tag className="mb-1 h-4 w-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">Kategori</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.kategori || '-'}</span>
              </div>
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <TrendingUp className="mb-1 h-4 w-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">Traffic</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.kenaikan_traffic || '-'}</span>
              </div>
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <DollarSign className="mb-1 h-4 w-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">Sales</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.kenaikan_sales || '-'}</span>
              </div>
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <User className="mb-1 h-4 w-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">PIC</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.pic_name || '-'}</span>
              </div>
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <Phone className="mb-1 h-4 w-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">Telepon PIC</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.pic_phone || '-'}</span>
              </div>
            </div>
          ) : (
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
                    className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3"
                  >
                    <span className="text-xs text-[var(--wf-ink-muted)]">{label}</span>
                    <span className={`mt-1 text-xl font-bold ${
                      val != null && val >= 4 ? 'text-[var(--wf-live)]'
                      : val != null && val >= 3 ? 'text-[var(--wf-action)]'
                      : 'text-red-700 dark:text-red-300'
                    }`}>
                      {val ?? '-'}/5
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comments (v2) / Feedback (v3) */}
          {isV3Survey(editingSurvey) ? (
            editingSurvey.feedback_teks && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--wf-live)]">Feedback</h4>
                <p className="mt-1 whitespace-pre-line text-sm text-[var(--wf-ink)]">
                  {editingSurvey.feedback_teks}
                </p>
              </div>
            )
          ) : (
            (editingSurvey.feedback_comment || editingSurvey.improvement_suggestion) && (
              <div className="space-y-3">
                {editingSurvey.feedback_comment && (
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--wf-live)]">Feedback</h4>
                    <p className="mt-1 whitespace-pre-line text-sm text-[var(--wf-ink)]">
                      {editingSurvey.feedback_comment}
                    </p>
                  </div>
                )}
                {editingSurvey.improvement_suggestion && (
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--wf-accent)]">Saran Perbaikan</h4>
                    <p className="mt-1 whitespace-pre-line text-sm text-[var(--wf-ink)]">
                      {editingSurvey.improvement_suggestion}
                    </p>
                  </div>
                )}
              </div>
            )
          )}

          {/* Review notes */}
          {editingSurvey.status === 'reviewed' && editingSurvey.review_notes && !reviewOpen && (
            <div className="mt-4 rounded-[var(--wf-radius-board)] bg-[var(--wf-accent-soft)] p-4">
              <h4 className="text-xs font-semibold text-[var(--wf-accent)]">Review Admin</h4>
              <p className="mt-1 text-sm text-[var(--wf-ink)]">
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
    return <TenantSurveyLoading message="Menyimpan survey…" />;
  }

  if (duplicateLoading && !editingSurvey && viewMode === 'form') {
    return <TenantSurveyLoading message="Memeriksa status pengajuan…" />;
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
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--wf-accent)] transition-colors hover:text-[var(--wf-accent-hover)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke daftar
        </button>
        <TenantSurveyDuplicate
          eventName={selectedEvent.acara}
          onBack={handleStartNewAfterSuccess}
          onViewExisting={duplicate.existingSurveyId ? () => {
            handleStartNewAfterSuccess();
            const existing = surveys.find(s => s.id === duplicate.existingSurveyId);
            if (existing) handleViewDetail(existing);
          } : undefined}
        />
        {duplicateError && (
          <p className="mt-3 text-center text-xs text-[var(--wf-ink-muted)]">
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
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--wf-accent)] transition-colors hover:text-[var(--wf-accent-hover)]"
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
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--wf-accent)] transition-colors hover:text-[var(--wf-accent-hover)]"
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
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--wf-accent)] transition-colors hover:text-[var(--wf-accent-hover)] disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke daftar
      </button>

      <TenantSurveyForm
        event={selectedEvent}
        initialData={editingSurvey ? {
          event_id: editingSurvey.event_id,
          nama_gerai: editingSurvey.nama_gerai,
          lokasi_zona: editingSurvey.lokasi_zona,
          kategori: editingSurvey.kategori,
          kenaikan_traffic: editingSurvey.kenaikan_traffic,
          kenaikan_sales: editingSurvey.kenaikan_sales,
          feedback_teks: editingSurvey.feedback_teks,
          pic_name: editingSurvey.pic_name,
          pic_phone: editingSurvey.pic_phone,
        } : undefined}
        onSubmit={handleFormSubmit}
        onCancel={handleCancelForm}
        isSubmitting={formStatus === 'submitting'}
      />
    </div>
  );
}


function TenantSurveyEventRow({
  event,
  copiedId,
  onCopyLink,
  onExport,
  onToggleConfig,
  configLoading,
  activeConfigs,
  readOnly = false,
}: {
  event: Pick<EventItem, 'id' | 'acara' | 'status'>;
  copiedId: string;
  onCopyLink: (id: string) => void;
  onExport: (id: string) => void;
  onToggleConfig: (id: string, active: boolean) => void;
  configLoading: string | null;
  activeConfigs: Record<string, boolean>;
  readOnly?: boolean;
}) {
  const [showQR, setShowQR] = useState(false);
  const isActive = activeConfigs[event.id] === true;
  const isCopied = copiedId === event.id;
  const isToggling = configLoading === event.id;

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[var(--wf-ink)]">{event.acara}</p>
          <p className="text-[10px] text-[var(--wf-ink-muted)]">
            {event.status === 'ongoing' ? 'Berlangsung' : 'Selesai'}
            {isActive ? ' · Survey aktif' : ' · Survey mati'}
          </p>
        </div>

        {!readOnly && <button
          onClick={() => onToggleConfig(event.id, isActive)}
          disabled={isToggling}
          className={`shrink-0 transition-colors ${isActive ? 'text-[var(--wf-live)]' : 'text-[var(--wf-ink-muted)]'}`}
          title={isActive ? 'Survey aktif - klik untuk nonaktifkan' : 'Survey nonaktif - klik untuk aktifkan'}
        >
          {isToggling ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isActive ? (
            <ToggleRight className="h-5 w-5" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
        </button>}

        <button
          onClick={() => onCopyLink(event.id)}
className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)]"
          title="Copy survey link"
        >
          {isCopied ? <Check className="h-3 w-3 text-[var(--wf-live)]" /> : <Link2 className="h-3 w-3" />}
          {isCopied ? 'Tersalin!' : 'Link'}
        </button>

        <button
          onClick={() => onExport(event.id)}
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--wf-accent)] hover:bg-[var(--wf-board-2)]"
          title="Export CSV"
        >
          <Download className="h-3 w-3" />
          CSV
        </button>

        <button
          onClick={() => setShowQR(!showQR)}
className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)]"
          title="QR Code"
        >
          <QrCode className="h-3 w-3" />
          QR
        </button>
      </div>

      {showQR && (
        <div className="mt-3">
          <Suspense fallback={<div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--wf-rule)] border-t-[var(--wf-accent)]" /></div>}>
            <SurveyQRCode
              eventId={event.id}
              eventName={event.acara}
              basePath="/tenant-survey"
              label="Self-Assessment Tenant"
              showTypeTabs={false}
              compact
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}


function TenantSurveyManagementSection({
  events,
  copiedId,
  onCopyLink,
  onExport,
  onToggleConfig,
  configLoading,
  activeConfigs,
  readOnly = false,
}: {
  events: Array<Pick<EventItem, 'id' | 'acara' | 'status'>>;
  copiedId: string;
  onCopyLink: (id: string) => void;
  onExport: (id: string) => void;
  onToggleConfig: (id: string, active: boolean) => void;
  configLoading: string | null;
  activeConfigs: Record<string, boolean>;
  readOnly?: boolean;
}) {
  const [query, setQuery] = useState('');
  // Collapsed by default so list tab stays primary focus
  const [open, setOpen] = useState(false);

  // past + ongoing (bukan cuma past, tanpa hard-limit 30)
  const surveyableEvents = useMemo(() => {
    const base = events.filter((e) => e.status === 'past' || e.status === 'ongoing');
    // ongoing dulu, lalu past — biar event baru gampang ketemu
    return [...base].sort((a, b) => {
      if (a.status === b.status) return a.acara.localeCompare(b.acara, 'id');
      return a.status === 'ongoing' ? -1 : 1;
    });
  }, [events]);

  const activeCount = useMemo(
    () => surveyableEvents.filter((e) => activeConfigs[e.id] === true).length,
    [surveyableEvents, activeConfigs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surveyableEvents;
    return surveyableEvents.filter((e) => e.acara.toLowerCase().includes(q));
  }, [surveyableEvents, query]);

  if (surveyableEvents.length === 0) {
    return (
      <div className="ui-dashboard-surface p-4">
        <h3 className="text-sm font-semibold text-[var(--wf-ink)]">Kelola Self-Assessment per Event</h3>
        <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">
          Belum ada event berstatus ongoing/past. Event draft/upcoming tidak bisa dibuka untuk survey tenant.
        </p>
      </div>
    );
  }

  return (
    <div className="ui-dashboard-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--wf-board-2)]"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--wf-ink)]">
            Kelola Self-Assessment per Event
          </h3>
          <p className="text-[10px] text-[var(--wf-ink-muted)]">
            {activeCount} aktif · {surveyableEvents.length} event (ongoing + past) · toggle, link, QR, export
          </p>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 shrink-0 text-[var(--wf-ink-muted)]" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-[var(--wf-ink-muted)]" />}
      </button>

      {open && (
        <>
          <div className="border-t border-[var(--wf-rule)] px-4 py-3">
            <p className="mb-2 text-[10px] text-[var(--wf-ink-muted)]">
              Cari event, aktifkan toggle, copy link/QR. Default nonaktif. Nyalakan dulu agar form public buka.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--wf-ink-muted)]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari event (contoh: Bekasi Criterium)…"
                className="ui-dashboard-control w-full rounded-xl py-2 pl-9 pr-3 text-xs text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)] focus:border-[var(--wf-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--wf-accent)]"
              />
            </div>
            <p className="mt-1.5 text-[10px] text-[var(--wf-ink-muted)]">
              {filtered.length} dari {surveyableEvents.length} event
            </p>
          </div>
          <div className="max-h-96 divide-y divide-[var(--wf-rule)] overflow-y-auto border-t border-[var(--wf-rule)]">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[var(--wf-ink-muted)]">
                Tidak ada event cocok &quot;{query}&quot;. Cek ejaan atau status event (harus ongoing/past).
              </p>
            ) : (
              filtered.map((ev) => (
                <TenantSurveyEventRow
                  key={ev.id}
                  event={ev}
                  copiedId={copiedId}
                  onCopyLink={onCopyLink}
                  onExport={onExport}
                  onToggleConfig={onToggleConfig}
                  configLoading={configLoading}
                  activeConfigs={activeConfigs}
                  readOnly={readOnly}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
