import type {
  CommunityRegistration,
  DraftEventItem,
  EventArea,
  EventInsight,
  EventItem,
  ExhibitionLead,
  InsightSeverity,
  TenantEventSurvey,
} from '../types';
import { MONTH_NAMES, getDateRange, getStatus, parseDateStrLocal } from './eventUtils';
import { computeAreaUsage, computeAreaUtilisation, computeCategoryCounts } from './dashboardOverview';

/**
 * Mesin "Insight Cerdas" (`/dashboard/insights`) — derivasi DETERMINISTIK dari data yang
 * sudah dimuat halaman (event, draft, pendaftaran komunitas, area) plus data
 * lintas-modul opsional (survey kepuasan tenant, pengajuan pameran).
 *
 * Bukan panggilan model bahasa: tidak ada data yang keluar dari browser, tidak
 * ada biaya per-panggilan, dan setiap kalimat bisa dilacak ke satu sumber angka.
 * Semua fungsi di sini murni (tanpa I/O, tanpa jam tersembunyi) supaya dapat
 * diuji langsung dengan `now` eksplisit.
 *
 * Seam: bila kelak narasi dihasilkan server/LLM, cukup ganti `buildEventInsights`
 * — bentuk keluaran `EventInsightsResult` tetap. Insight tetap memancarkan
 * `actions` relatif-dashboard; penyaringan izin dilakukan pemanggil.
 */

export interface EventInsightsInput {
  events: EventItem[];
  activeDrafts: DraftEventItem[];
  registrations: CommunityRegistration[];
  areas: EventArea[];
  /** Opsional — hanya diisi bila pemanggil boleh & berhasil memuatnya. */
  surveys?: TenantEventSurvey[];
  /** Opsional — pengajuan kolaborasi pameran. */
  exhibitionLeads?: ExhibitionLead[];
  /** Titik waktu acuan. Eksplisit agar dapat diuji; default `new Date()`. */
  now?: Date;
}

export interface EventInsightsResult {
  /** ISO timestamp saat insight dihitung. */
  generatedAt: string;
  insights: EventInsight[];
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = { peringatan: 0, saran: 1, info: 2 };

/** Jendela "event dekat" (hari). */
const NEAR_DAYS = 7;
/** Jendela pemindaian hari padat (hari). */
const DENSE_DAY_WINDOW = 14;
/** Ambang jumlah event pada satu hari sebelum dianggap padat. */
const DENSE_DAY_MIN = 3;
/** Basis minimum event bulan lalu sebelum tren dilaporkan. */
const TREND_MIN_BASE = 3;
/** Horizon pemindaian kelengkapan & jeda kosong (hari). */
const HORIZON_DAYS = 30;
/** Ambang panjang jeda kosong yang dilaporkan (hari). */
const GAP_MIN_DAYS = 7;
/** Jendela deteksi lonjakan pendaftaran (hari, dibanding periode sebelumnya). */
const SPIKE_WINDOW_DAYS = 7;
/** Ambang lonjakan pendaftaran. */
const SPIKE_MIN_RECENT = 3;
/** Jendela tren rating tenant (hari). */
const RATING_WINDOW_DAYS = 90;
/** Ambang perubahan rating yang bermakna. */
const RATING_MIN_DELTA = 0.3;

/** Awal hari (00:00 waktu lokal). */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Tanggal dalam `YYYY-MM-DD` waktu lokal (bukan UTC — hindari geser hari). */
function toDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Awal bulan (epoch ms) — menjaga definisi "satu bulan" seragam. */
function startOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function daysBefore(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() - days);
  return shifted;
}

function daysAfter(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

/** Format tanggal Indonesia ringkas: "4 Oktober". */
function formatDay(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()] ?? ''}`;
}

/** Antrian yang benar-benar menunggu keputusan manusia (draft + pendaftaran pending). */
function queueInsight(activeDrafts: DraftEventItem[], registrations: CommunityRegistration[]): EventInsight[] {
  const pending = registrations.filter((registration) => registration.status === 'pending').length;
  if (activeDrafts.length === 0 && pending === 0) return [];

  const parts: string[] = [];
  const actions = [];
  if (activeDrafts.length > 0) {
    parts.push(`${activeDrafts.length} draft menunggu dipublikasikan`);
    actions.push({ label: 'Antrian Draft', path: '/drafts' });
  }
  if (pending > 0) {
    parts.push(`${pending} pendaftaran komunitas menunggu review`);
    actions.push({ label: 'Pendaftaran', path: '/registrations' });
  }

  return [{
    id: 'antrian',
    severity: 'peringatan',
    title: 'Antrian menunggu tindakan',
    body: `${parts.join(' dan ')}.`,
    metric: String(activeDrafts.length + pending),
    actions,
  }];
}

/** Dua event atau lebih memakai area yang sama pada rentang tanggal beririsan. */
function conflictInsights(events: EventItem[], areas: EventArea[], now: Date): EventInsight[] {
  const areaNameById = new Map(areas.map((area) => [area.id, area.name]));
  const groups = new Map<string, EventItem[]>();

  for (const event of events) {
    if (getStatus(event.dateStr, event.jam, event.dateEnd, event.dayTimeSlots, now) === 'past') continue;
    const areaId = (event.areaId ?? '').trim();
    const lokasi = (event.lokasi ?? '').trim().toLowerCase();
    const key = areaId ? `id:${areaId}` : lokasi ? `loc:${lokasi}` : '';
    if (!key) continue;
    const list = groups.get(key);
    if (list) list.push(event);
    else groups.set(key, [event]);
  }

  const insights: EventInsight[] = [];
  for (const [key, list] of groups) {
    if (list.length < 2) continue;

    const pairs: Array<[EventItem, EventItem]> = [];
    for (let i = 0; i < list.length; i += 1) {
      const a = list[i];
      if (!a) continue;
      const aStart = a.dateStr;
      const aEnd = a.dateEnd && a.dateEnd !== a.dateStr ? a.dateEnd : aStart;
      for (let j = i + 1; j < list.length; j += 1) {
        const b = list[j];
        if (!b) continue;
        const bStart = b.dateStr;
        const bEnd = b.dateEnd && b.dateEnd !== b.dateStr ? b.dateEnd : bStart;
        if (aStart <= bEnd && bStart <= aEnd) pairs.push([a, b]);
      }
    }
    if (pairs.length === 0) continue;

    const first = pairs[0];
    if (!first) continue;
    const [firstEvent] = first;
    const names = pairs.slice(0, 3).map(([a, b]) => `${a.acara} ↔ ${b.acara}`).join('; ');
    const areaLabel = firstEvent.areaId ? areaNameById.get(firstEvent.areaId) : undefined;
    const scope = areaLabel || firstEvent.lokasi || firstEvent.acara;

    insights.push({
      id: `konflik-area-${key}`,
      severity: 'peringatan',
      title: 'Potensi bentrok jadwal area',
      body: `${pairs.length} pasangan event memakai area yang sama pada rentang tanggal beririsan: ${names}${pairs.length > 3 ? '…' : ''}`,
      metric: String(pairs.length),
      scope,
      actions: [{ label: 'Jadwal Event', path: '/events', filter: { search: scope } }],
    });
  }
  return insights;
}

/** Perubahan jumlah event bulan ini dibanding bulan lalu. */
function trendInsight(events: EventItem[], now: Date): EventInsight[] {
  const currentMonth = startOfMonth(now);
  const previousMonth = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  let current = 0;
  let previous = 0;
  for (const event of events) {
    const date = parseDateStrLocal(event.dateStr);
    if (!date) continue;
    const month = startOfMonth(date);
    if (month === currentMonth) current += 1;
    else if (month === previousMonth) previous += 1;
  }

  if (previous < TREND_MIN_BASE) return [];

  const delta = current - previous;
  const ratio = delta / previous;
  if (Math.abs(delta) < 2 && Math.abs(ratio) < 0.3) return [];

  const direction = delta >= 0 ? 'naik' : 'turun';
  const percent = Math.round(Math.abs(ratio) * 100);
  const monthName = MONTH_NAMES[now.getMonth()] ?? '';

  return [{
    id: 'tren-bulanan',
    severity: 'saran',
    title: delta >= 0 ? 'Tren event bulan ini meningkat' : 'Tren event bulan ini menurun',
    body: `Jumlah event bulan ${monthName} ${direction} ${percent}% dibanding bulan lalu (${previous} → ${current}).`,
    metric: `${delta >= 0 ? '+' : ''}${delta}`,
    actions: [{ label: 'Analitik', path: '/analytics' }],
  }];
}

/** Satu hari dalam dua pekan ke depan memuat banyak event (risiko kepadatan). */
function denseDayInsight(events: EventItem[], now: Date): EventInsight[] {
  const today = startOfDay(now);
  const limit = daysAfter(today, DENSE_DAY_WINDOW);

  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.dateEnd && event.dateEnd !== event.dateStr) continue; // hari tunggal saja
    const date = parseDateStrLocal(event.dateStr);
    if (!date || date < today || date > limit) continue;
    counts.set(event.dateStr, (counts.get(event.dateStr) ?? 0) + 1);
  }

  let busiestDate = '';
  let busiest = 0;
  for (const [date, count] of counts) {
    if (count > busiest || (count === busiest && date < busiestDate)) {
      busiest = count;
      busiestDate = date;
    }
  }
  if (busiest < DENSE_DAY_MIN) return [];

  const date = parseDateStrLocal(busiestDate);
  const label = date ? formatDay(date) : busiestDate;
  const monthName = date ? MONTH_NAMES[date.getMonth()] : undefined;

  return [{
    id: 'hari-padat',
    severity: 'saran',
    title: 'Satu hari memuat banyak event',
    body: `Tanggal ${label} memuat ${busiest} event. Periksa kesiapan area dan tim pada hari itu.`,
    metric: String(busiest),
    scope: busiestDate,
    actions: [{ label: 'Jadwal Event', path: '/events', filter: monthName ? { month: monthName } : undefined }],
  }];
}

/** Event yang mulai dalam sepekan ke depan. */
function nearbyInsight(events: EventItem[], now: Date): EventInsight[] {
  const today = startOfDay(now);
  const limit = daysAfter(today, NEAR_DAYS);

  const upcoming = events.filter((event) => {
    const date = parseDateStrLocal(event.dateStr);
    return date !== null && date >= today && date <= limit;
  });
  if (upcoming.length === 0) return [];

  const names = upcoming.slice(0, 3).map((event) => event.acara).join(', ');
  return [{
    id: 'event-dekat',
    severity: 'info',
    title: 'Event dalam 7 hari ke depan',
    body: `${upcoming.length} event mulai dalam sepekan: ${names}${upcoming.length > 3 ? '…' : ''}`,
    metric: String(upcoming.length),
    actions: [{ label: 'Jadwal Event', path: '/events', filter: { status: 'upcoming' } }],
  }];
}

/** Area dengan beban event terbanyak + utilisasi area aktif saat ini. */
function areaInsight(events: EventItem[], areas: EventArea[]): EventInsight[] {
  const usage = computeAreaUsage(events, areas);
  const top = usage[0];
  if (!top || top.totalEvents < 2) return [];

  const { inUseNow, totalActive } = computeAreaUtilisation(events, areas);
  return [{
    id: 'area-tersibuk',
    severity: 'info',
    title: 'Area paling sering dipakai',
    body: `${top.name} memimpin dengan ${top.totalEvents} event${top.inUseNow ? ' dan sedang dipakai saat ini' : ''}. ${inUseNow} dari ${totalActive} area aktif sedang terpakai.`,
    metric: String(top.totalEvents),
    scope: top.name,
    actions: [{ label: 'Jadwal Event', path: '/events', filter: { search: top.name } }],
  }];
}

/** Kategori yang paling sering muncul pada event. */
function categoryInsight(events: EventItem[]): EventInsight[] {
  const counts = computeCategoryCounts(events);
  const top = counts[0];
  if (!top || top.value < 2) return [];

  const share = Math.round((top.value / Math.max(events.length, 1)) * 100);
  return [{
    id: 'kategori-dominan',
    severity: 'info',
    title: 'Kategori event dominan',
    body: `Kategori ${top.label} muncul pada ${top.value} event (${share}% dari total).`,
    metric: String(top.value),
    scope: top.label,
    actions: [{ label: 'Jadwal Event', path: '/events', filter: { category: top.label } }],
  }];
}

/** Event terdekat yang datanya belum lengkap (poster/EO/PIC kosong). */
function completenessInsight(events: EventItem[], now: Date): EventInsight[] {
  const today = startOfDay(now);
  const limit = daysAfter(today, HORIZON_DAYS);

  const incomplete = events.filter((event) => {
    const date = parseDateStrLocal(event.dateStr);
    if (!date || date < today || date > limit) return false;
    return !event.posterUrl || !event.eo.trim() || !event.pic.trim();
  });
  if (incomplete.length < 2) return [];

  const names = incomplete.slice(0, 3).map((event) => event.acara).join(', ');
  return [{
    id: 'kelengkapan-event',
    severity: 'saran',
    title: 'Event terdekat belum lengkap datanya',
    body: `${incomplete.length} event dalam 30 hari ke depan belum punya poster, EO, atau PIC: ${names}${incomplete.length > 3 ? '…' : ''}`,
    metric: String(incomplete.length),
    actions: [{ label: 'Jadwal Event', path: '/events', filter: { status: 'upcoming' } }],
  }];
}

/** Rentang hari tanpa satu pun event dalam horizon pemindaian. */
function gapInsight(events: EventItem[], now: Date): EventInsight[] {
  const today = startOfDay(now);
  const covered = new Set<string>();
  const todayKey = toDayKey(today);
  for (const event of events) {
    for (const day of getDateRange(event.dateStr, event.dateEnd)) {
      if (day >= todayKey) covered.add(day);
    }
  }

  if (covered.size === 0) return []; // kalender kosong ≠ jeda; jangan menyesatkan

  let runStartIndex = -1;
  let bestLength = 0;
  let bestStartIndex = -1;
  let bestEndIndex = -1;
  for (let offset = 0; offset <= HORIZON_DAYS; offset += 1) {
    const day = daysAfter(today, offset);
    if (covered.has(toDayKey(day))) {
      runStartIndex = -1;
      continue;
    }
    if (runStartIndex === -1) runStartIndex = offset;
    const length = offset - runStartIndex + 1;
    if (length > bestLength) {
      bestLength = length;
      bestStartIndex = runStartIndex;
      bestEndIndex = offset;
    }
  }
  if (bestLength < GAP_MIN_DAYS) return [];

  const bestStart = daysAfter(today, bestStartIndex);
  const bestEnd = daysAfter(today, bestEndIndex);

  return [{
    id: 'jeda-kosong',
    severity: 'info',
    title: 'Ada rentang tanpa event',
    body: `Tidak ada event terjadwal ${bestLength} hari berturut-turut (${formatDay(bestStart)} – ${formatDay(bestEnd)}). Manfaatkan untuk promo atau pemeliharaan area.`,
    metric: `${bestLength} hari`,
    actions: [{ label: 'Jadwal Event', path: '/events' }],
  }];
}

/** Lonjakan pendaftaran komunitas dibanding periode sebelumnya. */
function registrationSpikeInsight(registrations: CommunityRegistration[], now: Date): EventInsight[] {
  const today = startOfDay(now);
  const recentStart = daysBefore(today, SPIKE_WINDOW_DAYS);
  const previousStart = daysBefore(today, SPIKE_WINDOW_DAYS * 2);

  let recent = 0;
  let previous = 0;
  for (const registration of registrations) {
    const date = new Date(registration.createdAt);
    if (Number.isNaN(date.getTime()) || date < previousStart || date > today) continue;
    if (date >= recentStart) recent += 1;
    else previous += 1;
  }

  if (recent < SPIKE_MIN_RECENT || recent < previous * 2) return [];

  const percent = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : null;
  return [{
    id: 'lonjakan-pendaftaran',
    severity: 'saran',
    title: 'Pendaftaran komunitas melonjak',
    body: percent === null
      ? `${recent} pendaftaran dalam 7 hari terakhir, sebelumnya belum ada. Siapkan kapasitas review.`
      : `${recent} pendaftaran dalam 7 hari terakhir, naik ${percent}% dari pekan sebelumnya (${previous}). Siapkan kapasitas review.`,
    metric: `+${recent - previous}`,
    actions: [{ label: 'Pendaftaran', path: '/registrations' }],
  }];
}

/** Rata-rata rating tenant pada jendela terakhir dibanding jendela sebelumnya. */
function tenantRatingInsight(surveys: TenantEventSurvey[], now: Date): EventInsight[] {
  if (surveys.length === 0) return [];
  const today = startOfDay(now);
  const windowStart = daysBefore(today, RATING_WINDOW_DAYS);
  const previousStart = daysBefore(today, RATING_WINDOW_DAYS * 2);

  const recent: number[] = [];
  const previous: number[] = [];
  for (const survey of surveys) {
    const rating = survey.overall_rating;
    if (typeof rating !== 'number' || Number.isNaN(rating)) continue;
    const date = new Date(survey.created_at);
    if (Number.isNaN(date.getTime()) || date > today || date < previousStart) continue;
    if (date >= windowStart) recent.push(rating);
    else previous.push(rating);
  }
  if (recent.length < 2 || previous.length < 2) return [];

  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const recentAvg = average(recent);
  const previousAvg = average(previous);
  const delta = recentAvg - previousAvg;
  if (Math.abs(delta) < RATING_MIN_DELTA) return [];

  const format = (value: number) => value.toFixed(2).replace('.', ',');
  return [{
    id: 'tren-rating-tenant',
    severity: delta >= 0 ? 'info' : 'saran',
    title: delta >= 0 ? 'Rating tenant meningkat' : 'Rating tenant menurun',
    body: `Rata-rata penilaian tenant ${delta >= 0 ? 'naik' : 'turun'} ke ${format(recentAvg)} dari ${format(previousAvg)} pada 90 hari terakhir (${recent.length} respons).`,
    metric: `${delta >= 0 ? '+' : '−'}${format(Math.abs(delta))}`,
    crossModule: true,
    actions: [{ label: 'Evaluasi Tenant', path: '/tenant-surveys' }],
  }];
}

/** Pengajuan kolaborasi pameran yang belum ditinjau. */
function exhibitionQueueInsight(leads: ExhibitionLead[]): EventInsight[] {
  const pending = leads.filter((lead) => lead.status === 'pending').length;
  if (pending === 0) return [];

  return [{
    id: 'pengajuan-pameran',
    severity: pending >= 3 ? 'saran' : 'info',
    title: 'Pengajuan pameran menunggu tinjauan',
    body: `${pending} pengajuan kolaborasi pameran berstatus "menunggu" belum ditinjau.`,
    metric: String(pending),
    crossModule: true,
    actions: [{ label: 'Pameran & Aktivasi', path: '/exhibitions' }],
  }];
}

/**
 * Susun seluruh insight dari data mentah halaman, diurutkan menurut kepentingan
 * (peringatan → saran → info). Urutan antar-severity stabil sesuai urutan sumber.
 */
export function buildEventInsights({
  events,
  activeDrafts,
  registrations,
  areas,
  surveys,
  exhibitionLeads,
  now = new Date(),
}: EventInsightsInput): EventInsightsResult {
  const insights: EventInsight[] = [
    ...queueInsight(activeDrafts, registrations),
    ...conflictInsights(events, areas, now),
    ...trendInsight(events, now),
    ...denseDayInsight(events, now),
    ...registrationSpikeInsight(registrations, now),
    ...completenessInsight(events, now),
    ...nearbyInsight(events, now),
    ...areaInsight(events, areas),
    ...categoryInsight(events),
    ...gapInsight(events, now),
    ...tenantRatingInsight(surveys ?? [], now),
    ...exhibitionQueueInsight(exhibitionLeads ?? []),
  ];

  insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return { generatedAt: now.toISOString(), insights };
}