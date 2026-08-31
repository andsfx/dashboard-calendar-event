import { useState } from 'react';
import { Download, Loader2, RefreshCw, SearchX } from 'lucide-react';
import { EventItem, ViewMode, EventStatus, HolidayItem } from '../types';
import { SearchBar } from './SearchBar';
import { FilterBar } from './FilterBar';
import { EventTable } from './EventTable';
import { CalendarView } from './CalendarView';
import { KanbanView } from './KanbanView';
import { TimelineView } from './TimelineView';
import { downloadEventsSchedulePdf } from '../utils/eventsSchedulePdf';

interface Props {
  viewMode: ViewMode;
  isAdmin: boolean;
  /** Show Event status "draft" filter tab (admin/superadmin only). */
  showInternalDraftFilter?: boolean;
  /** Calendar + Kanban tabs/panels — canEditEvents only (not viewer). */
  canUseCalendarKanban?: boolean;
  /** Allow unduh PDF jadwal (admin/viewer export). */
  canExportSchedulePdf?: boolean;
  visibleEvents: EventItem[];
  visibleStats: { total: number };
  holidays: HolidayItem[];
  error: string | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  activeFilter: EventStatus | 'Semua';
  setActiveFilter: (value: EventStatus | 'Semua') => void;
  activeCategory: string;
  setActiveCategory: (value: string) => void;
  activePriority: string;
  setActivePriority: (value: string) => void;
  activeMonth: string;
  setActiveMonth: (value: string) => void;
  visibleCategories: string[];
  visibleMonths: string[];
  onEdit?: (event: EventItem) => void;
  onDelete?: (event: EventItem) => void;
  onDetail: (event: EventItem) => void;
}

export function DashboardViewsSection(props: Props) {
  const {
    viewMode,
    isAdmin,
    showInternalDraftFilter = false,
    canUseCalendarKanban = false,
    canExportSchedulePdf = false,
    visibleEvents,
    visibleStats,
    holidays,
    error,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    activeCategory,
    setActiveCategory,
    activePriority,
    setActivePriority,
    activeMonth,
    setActiveMonth,
    visibleCategories,
    visibleMonths,
    onEdit,
    onDelete,
    onDetail,
  } = props;

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const resetFilters = () => {
    setSearchQuery('');
    setActiveFilter('Semua');
    setActiveCategory('Semua');
    setActivePriority('Semua');
    setActiveMonth('Semua');
  };

  const handleExportSchedulePdf = async () => {
    if (!canExportSchedulePdf || isExportingPdf || visibleEvents.length === 0) return;
    setIsExportingPdf(true);
    try {
      await downloadEventsSchedulePdf(visibleEvents);
    } catch (err) {
      console.error('Schedule PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const activeFilterCount = [
    searchQuery.trim(),
    activeFilter !== 'Semua' ? activeFilter : '',
    activeCategory !== 'Semua' ? activeCategory : '',
    activePriority !== 'Semua' ? activePriority : '',
    activeMonth !== 'Semua' ? activeMonth : '',
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;
  const panelId = `dashboard-panel-${viewMode}`;



  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3">
        {!isAdmin && (
          <div className="w-full sm:w-[360px]">
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Cari acara, lokasi, penyelenggara..." />
          </div>
        )}
        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          categories={visibleCategories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          activePriority={activePriority}
          onPriorityChange={setActivePriority}
          months={visibleMonths}
          activeMonth={activeMonth}
          onMonthChange={setActiveMonth}
          showDraft={showInternalDraftFilter}
          showPriority={isAdmin}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs ui-text-muted">
            Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{visibleEvents.length}</span> dari {visibleStats.total} acara
            {searchQuery && <span>, pencarian &ldquo;<em>{searchQuery}</em>&rdquo;</span>}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="ui-focus-ring flex items-center gap-1 self-start text-xs font-semibold text-brand-primary-600 hover:underline dark:text-brand-primary-400"
              >
                <RefreshCw className="h-3 w-3" /> Reset {activeFilterCount} filter
              </button>
            )}
            {canExportSchedulePdf && (
              <button
                type="button"
                onClick={handleExportSchedulePdf}
                disabled={isExportingPdf || visibleEvents.length === 0}
                className="ui-focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--brand-card-light)] px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                aria-label="Unduh jadwal event sebagai PDF"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                ) : (
                  <Download className="h-3.5 w-3.5" aria-hidden />
                )}
                {isExportingPdf ? 'PDF…' : 'Unduh PDF'}
              </button>
            )}
          </div>
        </div>
      </div>



      {error && (
        <div className="ui-alert-panel flex items-center gap-3 px-5 py-3">
          <span className="text-lg">!</span>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}


      {!error && (
        <section id={panelId} role="tabpanel" aria-labelledby={`dashboard-tab-${viewMode}`} tabIndex={0} className="ui-focus-ring-panel">
          {visibleEvents.length === 0 && visibleStats.total > 0 ? (
            <div className="ui-empty-panel flex flex-col items-center gap-3 py-16" role="status" aria-live="polite">
              <SearchX className="h-10 w-10 text-slate-400" aria-hidden="true" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">Tidak ada acara yang cocok</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Coba ubah atau reset filter.</p>
              <button
                onClick={resetFilters}
                className="ui-focus-ring mt-1 rounded-xl bg-brand-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-700"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <>
              {viewMode === 'table' && (
                <EventTable
                  events={visibleEvents}
                  isAdmin={isAdmin}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDetail={onDetail}
                />
              )}
              {canUseCalendarKanban && viewMode === 'calendar' && (
                <CalendarView events={visibleEvents} holidays={holidays} onDetail={onDetail} />
              )}
              {canUseCalendarKanban && viewMode === 'kanban' && (
                <KanbanView
                  events={visibleEvents}
                  isAdmin={isAdmin}
                  showInternalDraftColumn={showInternalDraftFilter}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDetail={onDetail}
                />
              )}
              {viewMode === 'timeline' && (
                <TimelineView events={visibleEvents} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} onDetail={onDetail} />
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
