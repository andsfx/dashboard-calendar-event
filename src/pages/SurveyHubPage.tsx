import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BriefcaseBusiness, CalendarDays, Store } from 'lucide-react';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { Button } from '../components/shadcn/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '../components/shadcn/empty';
import { Input } from '../components/shadcn/input';
import { Label } from '../components/shadcn/label';
import type { EventItem } from '../types';
import { fetchEvents } from '../utils/api/eventsApi';
import { fetchPublicTenantSurveyEvents, type PublicTenantSurveyEventInfo } from '../utils/domainApi';
import { formatDateRange } from '../utils/eventUtils';
import { usePageMeta } from '../utils/pageMeta';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

function surveyableEvents(events: EventItem[]): EventItem[] {
  return events.filter((event) => event.status === 'past' || event.status === 'ongoing');
}

function matchesQuery(name: string, query: string): boolean {
  return name.toLocaleLowerCase('id-ID').includes(query.trim().toLocaleLowerCase('id-ID'));
}

export function SurveyHubPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Pusat survei event - Metropolitan Mall Bekasi',
    description: 'Pilih survei tenant atau survei penyelenggara untuk event Metropolitan Mall Bekasi.',
  });

  const [events, setEvents] = useState<EventItem[]>([]);
  const [tenantEvents, setTenantEvents] = useState<PublicTenantSurveyEventInfo[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTenantEvents, setLoadingTenantEvents] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [tenantEventsError, setTenantEventsError] = useState(false);
  const [query, setQuery] = useState('');
  const [tenantRetryKey, setTenantRetryKey] = useState(0);
  const [eventsRetryKey, setEventsRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingTenantEvents(true);
    setTenantEventsError(false);

    fetchPublicTenantSurveyEvents()
      .then((data) => { if (!cancelled) setTenantEvents(data); })
      .catch(() => { if (!cancelled) { setTenantEvents([]); setTenantEventsError(true); } })
      .finally(() => { if (!cancelled) setLoadingTenantEvents(false); });

    return () => { cancelled = true; };
  }, [tenantRetryKey]);

  useEffect(() => {
    let cancelled = false;
    setLoadingEvents(true);
    setEventsError(false);

    fetchEvents()
      .then(({ events: data }) => { if (!cancelled) setEvents(surveyableEvents(data)); })
      .catch(() => { if (!cancelled) { setEvents([]); setEventsError(true); } })
      .finally(() => { if (!cancelled) setLoadingEvents(false); });

    return () => { cancelled = true; };
  }, [eventsRetryKey]);

  const filteredEvents = useMemo(
    () => events.filter((event) => matchesQuery(event.acara, query)),
    [events, query],
  );
  const filteredTenantEvents = useMemo(
    () => tenantEvents.filter((event) => matchesQuery(event.acara, query)),
    [tenantEvents, query],
  );

  return (
    <div className="ui-dashboard-page min-h-screen bg-[var(--wf-page)] text-[var(--wf-ink)]">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke konten
      </a>
      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-5xl space-y-8 px-4 py-8 outline-none sm:px-6 sm:py-12">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pusat survei event</h1>
          <p className="mt-3 text-base leading-7 text-[var(--wf-ink-muted)]">
            Pilih event dan isi survei yang sesuai dengan peran kamu.
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Pilih event</h2>
            <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">Daftar event menyesuaikan survei yang tersedia.</p>
          </div>
          <div className="w-full sm:max-w-xs">
            <Label htmlFor="survey-hub-search" className="sr-only">Cari event</Label>
            <Input
              id="survey-hub-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama event"
              className="h-auto w-full rounded-[var(--radius-control)]! border-[var(--wf-rule-control)] bg-[var(--wf-board)] px-3 py-2.5 text-sm text-[var(--wf-ink)] placeholder:text-[var(--wf-ink-muted)]!"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="tenant-survey-heading" className="rounded-[var(--radius-card-lg)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Store className="mt-0.5 size-5 shrink-0 text-[var(--wf-accent)]" aria-hidden="true" />
              <div>
                <h2 id="tenant-survey-heading" className="text-lg font-semibold">Evaluasi dampak untuk tenant</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--wf-ink-muted)]">
                  Nilai perubahan kunjungan dan penjualan gerai selama event.
                </p>
              </div>
            </div>
            {tenantEventsError ? (
              <div className="mt-5 space-y-3">
                <p className="text-sm text-[var(--wf-danger)]" role="status">Gagal memuat event survei tenant.</p>
                <Button type="button" variant="outline" onClick={() => setTenantRetryKey((key) => key + 1)}>Coba muat event tenant lagi</Button>
              </div>
            ) : loadingTenantEvents ? (
              <p className="mt-5 text-sm text-[var(--wf-ink-muted)]" role="status">Memuat event dengan survei tenant aktif…</p>
            ) : filteredTenantEvents.length === 0 ? (
              <Empty className="mt-4 rounded-[var(--radius-card)] border border-dashed border-[var(--wf-rule)] p-5">
                <EmptyHeader>
                  <EmptyTitle>{tenantEvents.length === 0 ? 'Belum ada survei tenant aktif' : 'Event tidak ditemukan'}</EmptyTitle>
                  <EmptyDescription>
                    {tenantEvents.length === 0 ? 'Survei tenant akan tampil setelah dibuka untuk event.' : 'Coba kata kunci lain.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="mt-5 divide-y divide-[var(--wf-rule)]">
                {filteredTenantEvents.map((event) => (
                  <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      to={`/tenant-survey/${encodeURIComponent(event.id)}`}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-md text-sm font-medium text-[var(--wf-ink)] hover:text-[var(--wf-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{event.acara}</span>
                        <span className="mt-1 block text-xs font-normal text-[var(--wf-ink-muted)]">{event.tanggal}</span>
                      </span>
                      <span className="shrink-0 text-xs text-[var(--wf-accent)]">Isi evaluasi</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="eo-survey-heading" className="rounded-[var(--radius-card-lg)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <BriefcaseBusiness className="mt-0.5 size-5 shrink-0 text-[var(--wf-ink-muted)]" aria-hidden="true" />
              <div>
                <h2 id="eo-survey-heading" className="text-lg font-semibold">Survei kepuasan untuk EO</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--wf-ink-muted)]">
                  Penyelenggara menilai fasilitas, koordinasi, dan dukungan mall setelah event.
                </p>
              </div>
            </div>
            {eventsError ? (
              <div className="mt-5 space-y-3">
                <p className="text-sm text-[var(--wf-danger)]" role="status">Gagal memuat daftar event.</p>
                <Button type="button" variant="outline" onClick={() => setEventsRetryKey((key) => key + 1)}>Coba muat daftar event lagi</Button>
              </div>
            ) : loadingEvents ? (
              <p className="mt-5 text-sm text-[var(--wf-ink-muted)]" role="status">Memuat event selesai dan berlangsung…</p>
            ) : filteredEvents.length === 0 ? (
              <Empty className="mt-4 rounded-[var(--radius-card)] border border-dashed border-[var(--wf-rule)] p-5">
                <EmptyHeader>
                  <EmptyTitle>{events.length === 0 ? 'Belum ada event untuk dinilai' : 'Event tidak ditemukan'}</EmptyTitle>
                  <EmptyDescription>
                    {events.length === 0 ? 'Survei EO tersedia untuk event yang sedang berlangsung atau sudah selesai.' : 'Coba kata kunci lain.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="mt-5 divide-y divide-[var(--wf-rule)]">
                {filteredEvents.map((event) => (
                  <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      to={`/survey/${encodeURIComponent(event.id)}?type=organizer`}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-md text-sm font-medium text-[var(--wf-ink)] hover:text-[var(--wf-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{event.acara}</span>
                        <span className="mt-1 flex items-center gap-1 text-xs font-normal text-[var(--wf-ink-muted)]">
                          <CalendarDays className="size-3.5" aria-hidden="true" />
                          {formatDateRange(event.dateStr, event.dateEnd || event.dateStr)}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-[var(--wf-accent)]">Isi survei EO</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
