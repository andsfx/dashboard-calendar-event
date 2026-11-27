import { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { downloadBlob } from '../../lib/download';
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
import { Button } from '../shadcn/button';
import { Input } from '../shadcn/input';
import { Label } from '../shadcn/label';
import { NativeSelect } from '../shadcn/native-select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../shadcn/tabs';
import { Textarea } from '../shadcn/textarea';

const SurveyQRCode = lazy(() => import('./SurveyQRCode'));

type TabKey = 'list' | 'analytics';
type ViewMode = 'list' | 'form' | 'detail';
type FormStatus = 'idle' | 'submitting' | 'success' | 'error' | 'duplicate';

interface TenantSurveyPageProps {
  events: Array<Pick<EventItem, 'id' | 'acara' | 'tanggal' | 'dateStr' | 'lokasi' | 'eo' | 'status'>>;
  isAdmin?: boolean;
  /** Boleh unduh CSV (`/tenant/export`): admin saja. Demo/eo/TR disembunyikan. */
  canExportCsv?: boolean;
  /**
   * Boleh membuka tab Analitik (`GET /tenant/analytics`): staff/TR/demo.
   * eo_tenant selalu 403 di server — tab disembunyikan agar tidak menawarkan
   * permukaan yang pasti gagal (dan polling-nya tidak mengulang 403).
   */
  canViewAnalytics?: boolean;
  /** Boleh membuka halaman hasil evaluasi tenant (`/tenant-survey-results`). */
  canViewResults?: boolean;
}

export default function TenantSurveyPage({ events, isAdmin = false, canExportCsv = false, canViewAnalytics = true, canViewResults = false }: TenantSurveyPageProps) {
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
  /**
   * Salinan `configLoading` yang bisa dibaca di dalam efek hidrasi tanpa
   * menambahnya ke daftar dependensi (menambahkannya akan mengulang seluruh
   * GET config setiap kali satu toggle mulai/selesai).
   */
  const configLoadingRef = useRef<string | null>(null);
  const [copiedId, setCopiedId] = useState('');
  const [analyticsEventFilter, setAnalyticsEventFilter] = useState<string>('all');
  /**
   * Akses analitik hilang (EO) — kunci tab ke list; trigger-nya memang tidak
   * dirender, tapi state lama tidak boleh menampilkan panel yatim.
   */
  const effectiveTab: TabKey = canViewAnalytics ? activeTab : 'list';

  /** Event yang bisa disurvei: ongoing dulu, lalu past, urut nama. */
  const surveyableEvents = useMemo(
    () =>
      events
        .filter((event) => event.status === 'past' || event.status === 'ongoing')
        .sort((a, b) => {
          if (a.status === b.status) return a.acara.localeCompare(b.acara, 'id');
          return a.status === 'ongoing' ? -1 : 1;
        }),
    [events],
  );

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
  const { analytics, isLoading: analyticsLoading, error: analyticsError, refreshAnalytics } = useTenantSurveyAnalytics(
    analyticsEventFilter !== 'all' ? analyticsEventFilter : null,
    { enabled: canViewAnalytics },
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
  //
  // Kunci efek memakai DAFTAR ID yang stabil, bukan identitas array `events`:
  // useEvents melakukan polling 30s yang mengganti referensi array walau isinya
  // sama, dan efek yang bergantung pada `events` akan mengulang seluruh GET
  // config tiap 30s. Nilai hasil hidrasi juga DIGABUNG (bukan menimpa), supaya
  // toggle optimistis yang sedang berjalan tidak berbalik ke nilai lama.
  const surveyableIdsKey = useMemo(
    () =>
      events
        .filter((e) => e.status === 'past' || e.status === 'ongoing')
        .map((e) => e.id)
        .join(','),
    [events],
  );

  useEffect(() => {
    if (!surveyableIdsKey) return;
    const ids = surveyableIdsKey.split(',');

    let cancelled = false;
    (async () => {
      // GET /api/v1/tenant/config — cookie auth via apiGet (credentials include).
      const entries = await Promise.all(
        ids.map(async (id) => {
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
      setActiveConfigs(prev => {
        const next = { ...prev };
        for (const [id, isActive] of entries) {
          // Jangan menimpa event yang sedang di-toggle (POST belum tentu commit).
          if (configLoadingRef.current === id) continue;
          next[id] = isActive;
        }
        return next;
      });
    })();

    return () => { cancelled = true; };
  }, [surveyableIdsKey]);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleNewSurvey = useCallback((eventId: string) => {
    setActiveTab('list');
    setSelectedEventId(eventId);
    setEditingSurvey(null);
    setFormStatus('idle');
    setFormError(null);
    setDuplicateError(null);
    setViewMode('form');
  }, []);

  const handleEditDraft = useCallback((survey: TenantEventSurvey) => {
    setActiveTab('list');
    setEditingSurvey(survey);
    setSelectedEventId(survey.event_id);
    setFormStatus('idle');
    setFormError(null);
    setViewMode('form');
  }, []);

  const handleViewDetail = useCallback((survey: TenantEventSurvey) => {
    setActiveTab('list');
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
      setActionError(err instanceof Error ? err.message : 'Gagal meninjau survei');
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
      setActionError(err instanceof Error ? err.message : 'Gagal menghapus survei');
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
          try {
            await submit(created.id);
          } catch (submitErr) {
            // Server /create selalu menyisipkan draft lebih dulu; bila submit
            // gagal (mis. duplikat), draft itu akan tertinggal sebagai orphan
            // dan pengguna yang mengulang akan membuat draft ganda. Bersihkan
            // best-effort, lalu teruskan error aslinya ke pemanggil.
            try {
              await remove(created.id);
            } catch { /* pembersihan best-effort — jangan tutupi error utama */ }
            throw submitErr;
          }
        }
      }

      setFormStatus('success');
      await refreshSurveys();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan survei';

      // Duplikat (unique constraint) → pesan Indonesia baku, bukan mentah server.
      if (/sudah pernah|already|duplicate|23505/i.test(msg)) {
        setFormStatus('duplicate');
        setDuplicateError('Survei untuk event ini sudah pernah dikirim.');
        recheckDuplicate();
      } else {
        setFormStatus('error');
        setFormError(msg);
      }
    }
  }, [editingSurvey, createSurvey, editSurvey, submit, remove, refreshSurveys, recheckDuplicate]);

  const handleSubmitDraft = useCallback(async (id: string) => {
    try {
      await submit(id);
      await refreshSurveys();
    } catch (err) {
      // Rethrow supaya TenantSurveyList bisa menampilkan alasannya. Sebelumnya
      // error ditelan di sini, jadi tombol "Kirim" pada baris draft tampak
      // diam saja saat server menolak.
      console.error('Submit draft failed:', err);
      throw err;
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
    configLoadingRef.current = eventId;
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
        setActionError(json.error || 'Gagal mengubah status survei.');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal mengubah status survei.');
    }
    finally { setConfigLoading(null); configLoadingRef.current = null; }
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
    if (!canExportCsv) return;
    setActionError(null);
    try {
      // GET /api/v1/tenant/export — CSV blob; cookie via credentials include.
      const res = await fetch(apiUrl(`/tenant/export?event_id=${encodeURIComponent(eventId)}`), {
        credentials: 'include',
      });
      if (!res.ok) {
        setActionError('Gagal mengunduh CSV. Coba lagi, atau periksa koneksi internet.');
        return;
      }
      const blob = await res.blob();
      downloadBlob(blob, `tenant-survey-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      setActionError('Gagal mengunduh CSV. Coba lagi, atau periksa koneksi internet.');
    }
  }, [canExportCsv]);

  // ─── Derived ───────────────────────────────────────────────────
  const selectedEvent = events.find(e => e.id === selectedEventId) ?? null;

  // ─── Render ────────────────────────────────────────────────────

  // LIST VIEW + LIST TAB
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {/*
         * Error aksi (toggle survey, salin tautan, export CSV) muncul di sini.
         * Sebelumnya `actionError` hanya dirender di tampilan detail, padahal
         * tiga aksi itu dijalankan dari tampilan daftar — kegagalannya jadi
         * senyap: tombol terlihat "tidak bereaksi" tanpa penjelasan.
         */}
        {actionError && (
          <div
            role="alert"
            className="rounded-[var(--wf-radius-board)] border border-red-200 bg-red-600/10 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:text-red-300"
          >
            {actionError}
          </div>
        )}

        {canViewResults && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-3 py-2 text-xs text-[var(--wf-ink-muted)]">
            <span>Ringkasan hasil, checklist tenant, dan ekspor PDF ada di halaman hasil evaluasi.</span>
            {/* Tautan ini berdiri sendiri (bukan di tengah kalimat), jadi wajib
                target ≥44 px di mobile; desktop tetap sebaris ringkas. */}
            <Link to="/tenant-survey-results" className="inline-flex min-h-11 items-center font-semibold text-[var(--wf-action)] underline-offset-2 hover:underline sm:min-h-0">
              Buka hasil evaluasi tenant
            </Link>
          </div>
        )}

        {/* Tabs — primitif Tabs menyediakan roving tabindex + navigasi panah (APG) */}
        <Tabs
          value={effectiveTab}
          onValueChange={(key) => setActiveTab(key as TabKey)}
        >
          {/* Trigger tab 21 px di mobile (di bawah 44 px). Tinggi minimum hanya
              di <sm; mulai sm kembali ke `h-[calc(100%-1px)]` bawaan primitif
              supaya strip tab desktop tetap setinggi sebelumnya. */}
          <TabsList aria-label="Tenant self-assessment" className="ui-dashboard-surface h-auto p-1 sm:h-8">
            <TabsTrigger value="list" className="min-h-11 sm:min-h-0">
              <List className="size-4 shrink-0" />
              Penilaian mandiri
            </TabsTrigger>
            {canViewAnalytics && (
              <TabsTrigger value="analytics" className="min-h-11 sm:min-h-0">
                <BarChart3 className="size-4 shrink-0" />
                Analitik
              </TabsTrigger>
            )}
          </TabsList>

          {/* `TabsContent` wajib ada di dalam `Tabs`: Radix menulis
              `aria-controls` pada tiap trigger menuju panel ini, dan tanpa
              panel axe melaporkan `aria-valid-attr-value` (id tidak ada). */}
          {effectiveTab === 'list' && (
            <TabsContent value="list" className="mt-4 flex-none">
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
            </TabsContent>
          )}

        {effectiveTab === 'analytics' && (
          <TabsContent value="analytics" className="mt-4 flex-none">
          <div className="space-y-3">
            <div className="ui-dashboard-surface flex flex-wrap items-center gap-2 px-3 py-2.5">
              <Calendar className="size-3.5 text-[var(--wf-ink-muted)]" />
              <span className="text-xs font-medium text-[var(--wf-ink-muted)]">Event</span>
              <NativeSelect
                value={analyticsEventFilter}
                onChange={(e) => setAnalyticsEventFilter(e.target.value)}
                aria-label="Filter event"
                className="[&>select]:min-h-11 sm:[&>select]:min-h-0"
              >
                <option value="all">Semua event</option>
                {surveyableEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.acara}</option>)}
              </NativeSelect>
            </div>

            <TenantSurveyAnalyticsPanel
              analytics={analytics}
              surveys={
                analyticsEventFilter === 'all'
                  ? surveys
                  : surveys.filter(s => s.event_id === analyticsEventFilter)
              }
              isLoading={analyticsLoading}
              error={analyticsError}
              onRetry={() => { void refreshAnalytics(); }}
              eventFilter={analyticsEventFilter !== 'all' ? analyticsEventFilter : null}
            />
          </div>
          </TabsContent>
        )}
        </Tabs>

        <TenantSurveyManagementSection
          events={events}
          copiedId={copiedId}
          onCopyLink={handleCopyLink}
          onExport={handleExport}
          onToggleConfig={handleToggleConfig}
          configLoading={configLoading}
          activeConfigs={activeConfigs}
          readOnly={!isAdmin}
          canExportCsv={canExportCsv}
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
        <Button variant="ghost" onClick={handleCancelForm} className="min-h-11 sm:min-h-0">
          <ChevronLeft className="size-4" />
          Kembali ke daftar
        </Button>

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
                <Button
                  variant="outline"
                  onClick={() => handleEditSurvey(editingSurvey)}
                  className="min-h-11 sm:min-h-0"
                >
                  <Edit className="size-3.5" />
                  Ubah
                </Button>
              )}
              {canSubmitDraft && (
                <Button
                  disabled={actionLoading === 'submit'}
                  className="min-h-11 sm:min-h-0"
                  onClick={async () => {
                    setActionLoading('submit');
                    setActionError(null);
                    try {
                      const updated = await submit(editingSurvey.id);
                      setEditingSurvey(updated);
                    } catch (err) {
                      setActionError(err instanceof Error ? err.message : 'Gagal mengirim draf');
                    } finally {
                      setActionLoading(null);
                    }
                  }}
                >
                  {actionLoading === 'submit' ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Kirim
                </Button>
              )}
              {canReview && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setReviewOpen((v) => !v);
                    setConfirmDelete(false);
                  }}
                  className="min-h-11 sm:min-h-0"
                >
                  <Eye className="size-3.5" />
                  {editingSurvey.status === 'reviewed' ? 'Perbarui tinjauan' : 'Tinjauan'}
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmDelete(true);
                    setReviewOpen(false);
                  }}
                  className="min-h-11 text-[var(--wf-danger)] hover:bg-[var(--wf-danger)]/10 hover:text-[var(--wf-danger)] sm:min-h-0"
                >
                  <Trash2 className="size-3.5" />
                  Hapus
                </Button>
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
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-700 dark:text-red-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">Hapus respons ini?</p>
                  <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">
                    Permanen. Tidak bisa dibatalkan.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="destructive"
                      disabled={actionLoading === 'delete'}
                      onClick={handleDelete}
                      className="min-h-11 sm:min-h-0"
                    >
                      {actionLoading === 'delete' ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      Ya, hapus
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actionLoading === 'delete'}
                      onClick={() => setConfirmDelete(false)}
                      className="min-h-11 sm:min-h-0"
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reviewOpen && canReview && (
            <div className="mb-4 rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] p-4">
              <div className="w-full">
                <Label htmlFor="review-notes" className="mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]">Catatan tinjauan</Label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Opsional. Ringkas temuan admin…"
                  className="w-full"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  disabled={actionLoading === 'review'}
                  onClick={handleReview}
                  className="min-h-11 sm:min-h-0"
                >
                  {actionLoading === 'review' ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Simpan tinjauan
                </Button>
                <Button
                  variant="outline"
                  disabled={actionLoading === 'review'}
                  onClick={() => setReviewOpen(false)}
                  className="min-h-11 sm:min-h-0"
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          {/* Ratings grid (v2) / Info grid (v3) */}
          {isV3Survey(editingSurvey) ? (
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-7">
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <Store className="mb-1 size-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">Tenant</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.nama_gerai || '-'}</span>
              </div>
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <MapPin className="mb-1 size-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">Lokasi</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.lokasi_zona || '-'}</span>
              </div>
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <Tag className="mb-1 size-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">Kategori</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.kategori || '-'}</span>
              </div>
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <TrendingUp className="mb-1 size-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">Kunjungan</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.kenaikan_traffic || '-'}</span>
              </div>
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <DollarSign className="mb-1 size-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">Penjualan</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.kenaikan_sales || '-'}</span>
              </div>
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <User className="mb-1 size-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">PIC</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.pic_name || '-'}</span>
              </div>
              <div className="ui-dashboard-muted flex flex-col items-center rounded-[var(--wf-radius-board)] border border-[var(--wf-rule)] px-3 py-3">
                <Phone className="mb-1 size-4 text-[var(--wf-ink-muted)]" />
                <span className="text-xs text-[var(--wf-ink-muted)]">Telepon PIC</span>
                <span className="mt-1 text-sm font-bold text-[var(--wf-ink)]">{editingSurvey.pic_phone || '-'}</span>
              </div>
            </div>
          ) : (
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                ['venue_rating', 'Tempat'],
                ['management_rating', 'Manajemen'],
                ['event_organization_rating', 'Organisasi'],
                ['booth_facility_rating', 'Fasilitas booth'],
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
                <h4 className="text-xs font-semibold text-[var(--wf-live)]">Umpan balik</h4>
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
                    <h4 className="text-xs font-semibold text-[var(--wf-live)]">Umpan balik</h4>
                    <p className="mt-1 whitespace-pre-line text-sm text-[var(--wf-ink)]">
                      {editingSurvey.feedback_comment}
                    </p>
                  </div>
                )}
                {editingSurvey.improvement_suggestion && (
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--wf-accent)]">Saran perbaikan</h4>
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
              <h4 className="text-xs font-semibold text-[var(--wf-accent)]">Tinjauan admin</h4>
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
    return <TenantSurveyLoading message="Menyimpan survei…" />;
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
        <Button variant="ghost" className="mb-4 min-h-11 sm:min-h-0" onClick={handleStartNewAfterSuccess}>
          <ChevronLeft className="size-4" />
          Kembali ke daftar
        </Button>
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
        <Button variant="ghost" className="mb-4 min-h-11 sm:min-h-0" onClick={handleStartNewAfterSuccess}>
          <ChevronLeft className="size-4" />
          Kembali ke daftar
        </Button>
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
        <Button variant="ghost" className="mb-4 min-h-11 sm:min-h-0" onClick={() => setFormStatus('idle')}>
          <ChevronLeft className="size-4" />
          Coba lagi
        </Button>
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
      <Button variant="ghost"
        className="mb-4 min-h-11 sm:min-h-0"
        disabled={formStatus === 'submitting'}
        onClick={handleCancelForm}
      >
        <ChevronLeft className="size-4" />
        Kembali ke daftar
      </Button>

      <TenantSurveyForm
        event={selectedEvent}
        initialData={editingSurvey ? {
          event_id: editingSurvey.event_id,
          tenant_id: editingSurvey.tenant_id ?? '',
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
  canExportCsv = false,
}: {
  event: Pick<EventItem, 'id' | 'acara' | 'status'>;
  copiedId: string;
  onCopyLink: (id: string) => void;
  onExport: (id: string) => void;
  onToggleConfig: (id: string, active: boolean) => void;
  configLoading: string | null;
  activeConfigs: Record<string, boolean>;
  readOnly?: boolean;
  canExportCsv?: boolean;
}) {
  const [showQR, setShowQR] = useState(false);
  const isActive = activeConfigs[event.id] === true;
  const isCopied = copiedId === event.id;
  const isToggling = configLoading === event.id;

  return (
    <div className="px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* Di <sm tombol aksi (44 px) tidak muat sebaris dengan judul: judul
            mengambil satu baris penuh, tombol membungkus ke baris berikutnya.
            Mulai sm kembali seperti semula (judul + tombol sebaris). */}
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <p className="truncate text-xs font-medium text-[var(--wf-ink)]">{event.acara}</p>
          <p className="text-[10px] text-[var(--wf-ink-muted)]">
            {event.status === 'ongoing' ? 'Berlangsung' : 'Selesai'}
            {isActive ? ' · Survei aktif' : ' · Survei nonaktif'}
          </p>
        </div>

        {!readOnly && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={isActive ? 'Survei aktif - klik untuk nonaktifkan' : 'Survei nonaktif - klik untuk aktifkan'}
            title={isActive ? 'Survei aktif - klik untuk nonaktifkan' : 'Survei nonaktif - klik untuk aktifkan'}
            disabled={isToggling}
            onClick={() => onToggleConfig(event.id, isActive)}
            className={isActive
              ? 'min-h-11 min-w-11 shrink-0 text-[var(--wf-live)] hover:text-[var(--wf-live)] active:translate-y-0 sm:min-h-0 sm:min-w-0'
              : 'min-h-11 min-w-11 shrink-0 text-[var(--wf-ink-muted)] hover:text-[var(--wf-ink-muted)] active:translate-y-0 sm:min-h-0 sm:min-w-0'}
          >
            {isToggling ? (
              <Loader2 className="size-5 animate-spin" />
            ) : isActive ? (
              <ToggleRight className="size-5" />
            ) : (
              <ToggleLeft className="size-5" />
            )}
          </Button>
        )}

        <Button
          variant="ghost"
          className={isCopied
            ? 'min-h-11 shrink-0 text-[var(--wf-live)] hover:text-[var(--wf-live)] sm:min-h-0'
            : 'min-h-11 shrink-0 sm:min-h-0'}
          title="Salin tautan survei"
          onClick={() => onCopyLink(event.id)}
        >
          {isCopied ? <Check className="size-3" /> : <Link2 className="size-3" />}
          {isCopied ? 'Tersalin!' : 'Tautan'}
        </Button>

        {canExportCsv && (
          <Button variant="ghost"
            className="min-h-11 shrink-0 sm:min-h-0"
            title="Ekspor CSV"
            onClick={() => onExport(event.id)}
          >
            <Download className="size-3" />
            CSV
          </Button>
        )}

        <Button
          variant="ghost"
          className="min-h-11 shrink-0 sm:min-h-0"
          title="Kode QR"
          onClick={() => setShowQR(!showQR)}
        >
          <QrCode className="size-3" />
          QR
        </Button>
      </div>

      {showQR && (
        <div className="mt-3">
          <Suspense fallback={<div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--wf-rule)] border-t-[var(--wf-accent)]" /></div>}>
            <SurveyQRCode
              eventId={event.id}
              eventName={event.acara}
              basePath="/tenant-survey"
              label="Penilaian mandiri tenant"
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
  canExportCsv = false,
}: {
  events: Array<Pick<EventItem, 'id' | 'acara' | 'status'>>;
  copiedId: string;
  onCopyLink: (id: string) => void;
  onExport: (id: string) => void;
  onToggleConfig: (id: string, active: boolean) => void;
  configLoading: string | null;
  activeConfigs: Record<string, boolean>;
  readOnly?: boolean;
  canExportCsv?: boolean;
}) {
  const [query, setQuery] = useState('');
  // Terbuka default: kelola toggle/link/QR adalah aksi utama admin di halaman ini.
  const [open, setOpen] = useState(true);

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
        {/* `<h2>`, sama dengan cabang non-empty di bawah: dulu `<h3>` sehingga
            urutan heading melompat h1 → h3 persis saat daftar event kosong. */}
        <h2 className="text-sm font-semibold text-[var(--wf-ink)]">Kelola penilaian mandiri per event</h2>
        <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">
          Belum ada event berstatus ongoing/past. Event draft/upcoming tidak bisa dibuka untuk survei tenant.
        </p>
      </div>
    );
  }

  return (
    <div className="ui-dashboard-surface">
      {/*
       * Click-target baris penuh yang membungkus heading + subteks (layout
       * disclosure header) — shadcn `Button` ghost dengan chrome primitif
       * dinetralkan: `h-auto!`/`border-0!`/`rounded-none` + padding asli, jadi
       * tinggi baris dan latar tetap sama seperti sebelumnya. `aria-expanded`
       * menandai state buka/tutup karena panel ini bisa dibuka-tutup.
       */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex! h-auto! w-full! items-center justify-start! gap-3 whitespace-normal! rounded-none border-0! px-4 py-3 text-left! font-normal! transition-colors hover:bg-[var(--wf-board-2)]! active:translate-y-0!"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--wf-ink)]">
            Kelola penilaian mandiri per event
          </h2>
          <p className="text-[10px] text-[var(--wf-ink-muted)]">
            {activeCount} aktif · {surveyableEvents.length} event (ongoing + past) · toggle, link, QR{canExportCsv ? ', export' : ''}
          </p>
        </div>
        {open
          ? <ChevronUp className="size-4 shrink-0 text-[var(--wf-ink-muted)]" />
          : <ChevronDown className="size-4 shrink-0 text-[var(--wf-ink-muted)]" />}
      </Button>

      {open && (
        <>
          <div className="border-t border-[var(--wf-rule)] px-4 py-3">
            <p className="mb-2 text-[10px] text-[var(--wf-ink-muted)]">
              Cari event, aktifkan toggle, copy link/QR. Default nonaktif. Nyalakan dulu agar form public buka.
            </p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-[var(--wf-ink-muted)]" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Cari event"
                placeholder="Cari event (contoh: Bekasi Criterium)…"
                className="w-full pl-9 min-h-11 sm:min-h-0"
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
                  canExportCsv={canExportCsv}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
