import { RefreshCw, SearchX } from 'lucide-react';
import { EventItem, ViewMode, EventStatus, HolidayItem } from '../types';
import { SearchBar } from './SearchBar';
import { FilterBar } from './FilterBar';
import { EventTable } from './EventTable';
import { CalendarView } from './CalendarView';
import { KanbanView } from './KanbanView';
import { TimelineView } from './TimelineView';

interface Props {
  viewMode: ViewMode;
  availableViewTabs: Array<{ key: ViewMode; label: string; icon: React.ReactNode }>;
  setViewMode: (view: ViewMode) => void;
  isAdmin: boolean;
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
    availableViewTabs,
    setViewMode,
    isAdmin,
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

  const resetFilters = () => {
    setSearchQuery('');
    setActiveFilter('Semua');
    setActiveCategory('Semua');
    setActivePriority('Semua');
    setActiveMonth('Semua');
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

  const handleViewTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const lastIndex = availableViewTabs.length - 1;
    let nextIndex = index;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = index === 0 ? lastIndex : index - 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = lastIndex;

    const nextTab = availableViewTabs[nextIndex];
    if (!nextTab) return;

    setViewMode(nextTab.key);
    requestAnimationFrame(() => document.getElementById(`dashboard-tab-${nextTab.key}`)?.focus());
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <section>
        <div className="ui-dashboard-surface p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            {!isAdmin && (
              <div className="w-full sm:w-[360px]">
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Cari acara, lokasi, penyelenggara..." />
              </div>
            )}
            <div>
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
                showDraft={isAdmin}
                showPriority={isAdmin}
              />
            </div>

            <div className="space-y-2">
              <p id="view-tabs-label" className="text-[11px] font-semibold uppercase tracking-wide ui-text-muted">Tampilan</p>
              <div role="tablist" aria-labelledby="view-tabs-label" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-1 sm:rounded-xl sm:bg-[var(--brand-card)] sm:p-1 dark:sm:bg-slate-700/50">
                {availableViewTabs.map(tab => (
                  <button
                    key={tab.key}
                    id={`dashboard-tab-${tab.key}`}
                    type="button"
                    role="tab"
                    aria-selected={viewMode === tab.key}
                    aria-controls={panelId}
                    tabIndex={viewMode === tab.key ? 0 : -1}
                    onClick={() => setViewMode(tab.key)}
                    onKeyDown={event => handleViewTabKeyDown(event, availableViewTabs.findIndex(item => item.key === tab.key))}
                    aria-label={`Tampilan ${tab.label}`}
                    className={`ui-focus-ring flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all whitespace-nowrap sm:justify-start sm:rounded-lg sm:border-0 sm:px-3 sm:py-1.5 ${
                      viewMode === tab.key
                        ? 'border-brand-primary-200 bg-brand-primary-50 text-brand-primary-700 shadow-sm dark:border-brand-primary-800/50 dark:bg-slate-600 dark:text-brand-primary-300'
                        : 'border-black/[0.06] bg-[var(--brand-card-light)] text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs ui-text-muted">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{visibleEvents.length}</span> dari {visibleStats.total} acara
                {searchQuery && <span>, pencarian &ldquo;<em>{searchQuery}</em>&rdquo;</span>}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ui-focus-ring flex items-center gap-1 self-start text-xs font-semibold text-brand-primary-600 hover:underline dark:text-brand-primary-400"
                >
                  <RefreshCw className="h-3 w-3" /> Reset {activeFilterCount} filter
                </button>
              )}
            </div>
          </div>
        </div>
      </section>



      {error && (
        <div className="ui-alert-panel flex items-center gap-3 px-5 py-3">
          <span className="text-lg">!</span>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {!error && visibleEvents.length === 0 && visibleStats.total > 0 && (
        <div className="ui-empty-panel flex flex-col items-center gap-3 py-16">
          <SearchX className="h-10 w-10 text-slate-400" />
          <p className="font-semibold text-slate-700 dark:text-slate-200">Tidak ada acara yang cocok</p>
          <p className="text-sm text-slate-400">Coba ubah atau reset filter.</p>
          <button
            onClick={resetFilters}
            className="ui-focus-ring mt-1 rounded-xl bg-brand-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-700"
          >
            Reset Filter
          </button>
        </div>
      )}

      {(!error && (visibleEvents.length > 0 || visibleStats.total === 0)) && (
        <section id={panelId} role="tabpanel" aria-labelledby={`dashboard-tab-${viewMode}`} tabIndex={0} className="ui-focus-ring-panel">
          {viewMode === 'table' && (
            <EventTable
              events={visibleEvents}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              onDetail={onDetail}
            />
          )}
          {isAdmin && viewMode === 'calendar' && (
            <CalendarView events={visibleEvents} holidays={holidays} onDetail={onDetail} />
          )}
          {viewMode === 'kanban' && (
            <KanbanView events={visibleEvents} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} onDetail={onDetail} />
          )}
          {viewMode === 'timeline' && (
            <TimelineView events={visibleEvents} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} onDetail={onDetail} />
          )}
        </section>
      )}
    </div>
  );
}
