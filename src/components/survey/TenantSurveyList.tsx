import { useState, useCallback } from 'react';
import {
  ClipboardCheck, Clock, CheckCircle, Eye, Edit, Send,
  ChevronDown, ChevronUp, AlertCircle, Star,
  Store, MapPin, Tag, TrendingUp, DollarSign, User, Phone,
} from 'lucide-react';
import type { TenantEventSurvey, EventItem } from '../../types';
import { isV3Survey } from '../../utils/surveyUtils';

interface TenantSurveyListProps {
  surveys: TenantEventSurvey[];
  events: Array<Pick<EventItem, 'id' | 'acara' | 'dateStr' | 'status'>>;
  isLoading: boolean;
  error: string | null;
  onNewSurvey: (eventId: string) => void;
  onEditDraft: (survey: TenantEventSurvey) => void;
  onSubmitDraft: (id: string) => Promise<void>;
  onViewDetail: (survey: TenantEventSurvey) => void;
  onRefresh: () => void;
}

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  submitted: {
    label: 'Terkirim',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  reviewed: {
    label: 'Direview',
    icon: <Eye className="h-3.5 w-3.5" />,
    color: 'bg-brand-primary-100 text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300',
  },
} as const;

function ratingColor(n: number | null | undefined): string {
  if (n == null) return 'text-slate-400';
  if (n >= 4) return 'text-emerald-500';
  if (n >= 3) return 'text-yellow-500';
  return 'text-red-500';
}

export default function TenantSurveyList({
  surveys,
  events,
  isLoading,
  error,
  onNewSurvey,
  onEditDraft,
  onSubmitDraft,
  onViewDetail,
  onRefresh,
}: TenantSurveyListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const eventMap = new Map(events.map(e => [e.id, e]));

  const handleSubmitDraft = useCallback(async (id: string) => {
    setSubmittingId(id);
    setDraftError(null);
    try {
      await onSubmitDraft(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim draft';
      setDraftError(msg);
    } finally {
      setSubmittingId(null);
    }
  }, [onSubmitDraft]);

  // Events without survey yet (draft admin path). Prefer past/ongoing, all statuses OK for admin draft.
  const [eventQuery, setEventQuery] = useState('');
  const availableEvents = events
    .filter(ev => {
      const existing = surveys.find(s => s.event_id === ev.id);
      return !existing;
    })
    .filter(ev => {
      const q = eventQuery.trim().toLowerCase();
      if (!q) return true;
      return (ev.acara || '').toLowerCase().includes(q) || (ev.dateStr || '').toLowerCase().includes(q);
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="h-4 w-4 animate-spin" />
          Memuat survey tenant...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <div>
            <p>{error}</p>
            <button onClick={onRefresh} className="mt-1 underline hover:no-underline">
              Coba lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New survey button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {surveys.length} self-assessment tercatat
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEventPicker(!showEventPicker)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-500"
          >
            <ClipboardCheck className="h-4 w-4" />
            Buat Self-Assessment
          </button>

          {/* Event picker dropdown */}
          {showEventPicker && (
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <input
                type="search"
                value={eventQuery}
                onChange={(e) => setEventQuery(e.target.value)}
                placeholder="Cari event..."
                className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-primary-400 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
              {availableEvents.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                  {eventQuery.trim()
                    ? `Tidak ada event cocok "${eventQuery}"`
                    : 'Semua event sudah memiliki self-assessment'}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {availableEvents.map(ev => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => {
                        onNewSurvey(ev.id);
                        setShowEventPicker(false);
                        setEventQuery('');
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <span className="flex-1 truncate text-slate-800 dark:text-slate-200">
                        {ev.acara}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {ev.status === 'past' ? 'past' : ev.status === 'ongoing' ? 'live' : ev.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Survey list */}
      {surveys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
          <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Belum ada self-assessment
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Buat self-assessment pertama untuk event yang sudah selesai
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map(survey => {
            const ev = eventMap.get(survey.event_id);
            const isExpanded = expandedId === survey.id;
            const statusCfg = STATUS_CONFIG[survey.status];

            return (
              <div
                key={survey.id}
                className="rounded-2xl border border-slate-200 bg-white transition dark:border-slate-700 dark:bg-slate-800"
              >
                {/* Header row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : survey.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {ev?.acara || survey.event_id}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                      {isV3Survey(survey) && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          Publik
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{ev?.dateStr || '-'}</span>
                      {isV3Survey(survey) ? (
                        <>
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            {survey.nama_gerai}
                          </span>
                          {survey.kategori && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {survey.kategori}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {survey.overall_rating != null && (
                            <span className={`flex items-center gap-1 font-semibold ${ratingColor(survey.overall_rating)}`}>
                              <Star className="h-3 w-3 fill-current" />
                              {survey.overall_rating}/5
                            </span>
                          )}
                          <span>{survey.tenant_name || survey.tenant_organization}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-slate-400" />
                    : <ChevronDown className="h-4 w-4 text-slate-400" />
                  }
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 dark:border-slate-700">
                    {isV3Survey(survey) ? (
                      <>
                        {/* V3: Info grid */}
                        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-7">
                          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                            <Store className="h-3 w-3 text-slate-400" />
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">Gerai</p>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{survey.nama_gerai || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">Lokasi</p>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{survey.lokasi_zona || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                            <Tag className="h-3 w-3 text-slate-400" />
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">Kategori</p>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{survey.kategori || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                            <TrendingUp className="h-3 w-3 text-slate-400" />
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">Traffic</p>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{survey.kenaikan_traffic || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                            <DollarSign className="h-3 w-3 text-slate-400" />
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">Sales</p>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{survey.kenaikan_sales || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                            <User className="h-3 w-3 text-slate-400" />
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">PIC</p>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{survey.pic_name || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">Telp PIC</p>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{survey.pic_phone || '-'}</p>
                            </div>
                          </div>
                        </div>

                        {/* V3: Feedback */}
                        {survey.feedback_teks && (
                          <div className="mb-4 text-xs">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Feedback: </span>
                            <span className="text-slate-600 dark:text-slate-300">{survey.feedback_teks}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* V2: Rating grid */}
                        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {([
                            ['venue_rating', 'Venue'],
                            ['management_rating', 'Manajemen'],
                            ['event_organization_rating', 'Organisasi'],
                            ['booth_facility_rating', 'Fasilitas Booth'],
                          ] as const).map(([key, label]) => {
                            const val = survey[key];
                            return (
                              <div
                                key={key}
                                className="flex flex-col items-center rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                              >
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
                                <span className={`text-sm font-bold ${ratingColor(val)}`}>
                                  {val != null ? `${val}/5` : '-'}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* V2: Qualitative highlights */}
                        <div className="mb-4 space-y-2">
                          {survey.feedback_comment && (
                            <div className="text-xs">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Feedback: </span>
                              <span className="text-slate-600 dark:text-slate-300">{survey.feedback_comment}</span>
                            </div>
                          )}
                          {survey.improvement_suggestion && (
                            <div className="text-xs">
                              <span className="font-semibold text-brand-primary-600 dark:text-brand-primary-400">Saran: </span>
                              <span className="text-slate-600 dark:text-slate-300">{survey.improvement_suggestion}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Review notes */}
                    {survey.status === 'reviewed' && survey.review_notes && (
                      <div className="mb-4 rounded-xl bg-brand-primary-50 p-3 dark:bg-brand-primary-950/30">
                        <p className="text-xs font-semibold text-brand-primary-700 dark:text-brand-primary-300">
                          Review Admin:
                        </p>
                        <p className="mt-0.5 text-xs text-brand-primary-600 dark:text-brand-primary-400">
                          {survey.review_notes}
                        </p>
                      </div>
                    )}

                    {/* Draft error */}
                    {draftError && submittingId !== survey.id && (
                      <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                        {draftError}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onViewDetail(survey)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        <Eye className="h-3 w-3" />
                        Detail
                      </button>
                      {survey.status === 'draft' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditDraft(survey)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubmitDraft(survey.id)}
                            disabled={submittingId === survey.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-primary-700 disabled:opacity-50"
                          >
                            {submittingId === survey.id ? (
                              <Clock className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            Kirim
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
