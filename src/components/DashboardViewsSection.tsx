import { RefreshCw, SearchX } from 'lucide-react';
import { EventItem, ViewMode, EventStatus } from '../types';
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
  holidays: any[];
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
  onEdit: (event: EventItem) => void;
  onDelete: (event: EventItem) => void;
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

  return (
    <>
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tampilan</p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-1 sm:rounded-xl sm:bg-slate-100 sm:p-1 dark:sm:bg-slate-700/50">
                {availableViewTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setViewMode(tab.key)}
                    aria-pressed={viewMode === tab.key}
                    aria-label={`Tampilan ${tab.label}`}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 sm:justify-start sm:rounded-lg sm:border-0 sm:px-3 sm:py-1.5 ${
                      viewMode === tab.key
                        ? 'border-violet-200 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-800/50 dark:bg-slate-600 dark:text-violet-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{visibleEvents.length}</span> dari {visibleStats.total} acara
                {searchQuery && <span> — pencarian &ldquo;<em>{searchQuery}</em>&rdquo;</span>}
              </p>
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 self-start text-xs text-violet-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:text-violet-400 dark:focus-visible:ring-offset-slate-950"
              >
                <RefreshCw className="h-3 w-3" /> Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 dark:border-red-800/50 dark:bg-red-900/20">
          <span className="text-lg">!</span>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {!error && visibleEvents.length === 0 && visibleStats.total > 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <SearchX className="h-10 w-10 text-slate-400" />
          <p className="font-semibold text-slate-700 dark:text-slate-200">Tidak ada acara yang cocok</p>
          <p className="text-sm text-slate-400">Coba ubah atau reset filter.</p>
          <button
            onClick={resetFilters}
            className="mt-1 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            Reset Filter
          </button>
        </div>
      )}

      {viewMode === 'table' && (
        <EventTable events={visibleEvents} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} onDetail={onDetail} />
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
    </>
  );
}
