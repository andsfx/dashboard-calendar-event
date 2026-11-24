import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, CheckCircle2, Clock, Handshake, MapPin, RefreshCw, Users,
} from 'lucide-react';
import type {
  Exhibition, ExhibitionProgramStatus, ExhibitionProgramType, ExhibitionSlot, PublicAgendaItem,
} from '../types';
import { fetchPublicExhibitions, fetchPublicExhibition } from '../utils/domainApi';
import { formatDateRange, MONTH_NAMES } from '../utils/eventUtils';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { RevealSection } from '../components/community/CommunityRevealPrimitives';
import { CollaborationForm } from '../components/collaboration/CollaborationForm';
import { Badge } from '../components/shadcn/badge';
import { Button } from '../components/shadcn/button';
import { usePageMeta } from '../utils/pageMeta';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const TYPE_LABELS: Record<ExhibitionProgramType, string> = {
  aktivasi_marcomm: 'Aktivasi Marcomm',
  pameran: 'Pameran',
};

const TYPE_BADGE: Record<ExhibitionProgramType, string> = {
  aktivasi_marcomm: 'bg-[var(--brand-pink)]/10 text-[var(--brand-pink-600)]',
  pameran: 'bg-[var(--wf-accent-soft)] text-[var(--brand-tosca-600)]',
};

const STATUS_META: Record<ExhibitionProgramStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]' },
  open: { label: 'Dibuka untuk Kolaborasi', className: 'bg-[var(--wf-accent-soft)] text-[var(--brand-tosca-600)]' },
  full: { label: 'Slot Penuh', className: 'bg-[var(--brand-pink)]/10 text-[var(--brand-pink-600)]' },
  ongoing: { label: 'Sedang Berlangsung', className: 'bg-[var(--wf-accent)] text-[var(--wf-accent-ink)]' },
  completed: { label: 'Selesai', className: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]' },
  archived: { label: 'Diarsipkan', className: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]' },
};

const SLOT_META: Record<ExhibitionSlot['slotStatus'], { label: string; className: string }> = {
  open: { label: 'Slot Tersedia', className: 'bg-[var(--wf-accent-soft)] text-[var(--brand-tosca-600)]' },
  limited: { label: 'Tersisa 1 Slot', className: 'bg-[var(--brand-pink)]/10 text-[var(--brand-pink-600)]' },
  full: { label: 'Penuh', className: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]' },
  closed: { label: 'Ditutup', className: 'bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]' },
};

const ctaClass = 'h-auto items-center gap-2 rounded-full bg-[var(--wf-accent)]! px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0!';

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function longDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return `${WEEKDAYS[date.getDay()] ?? ''}, ${day} ${MONTH_NAMES[month - 1] ?? ''} ${year}`.trim();
}

function ProgramBadges({ program }: { program: Exhibition }) {
  const status = STATUS_META[program.status];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className={`border-0 font-semibold ${TYPE_BADGE[program.programType]}`}>
        {TYPE_LABELS[program.programType]}
      </Badge>
      <Badge variant="outline" className={`border-0 font-semibold ${status.className}`}>{status.label}</Badge>
    </div>
  );
}

export function ExhibitionsLandingPage({ isDark, onToggleDark }: Props) {
  const { id } = useParams<{ id: string }>();
  usePageMeta({
    title: 'Kolaborasi pameran dan aktivasi - Metropolitan Mall Bekasi',
    description: 'Ikut meramaikan program rutin, pameran, dan aktivasi akhir pekan di Metropolitan Mall Bekasi.',
  });

  const [list, setList] = useState<Exhibition[]>([]);
  const [detail, setDetail] = useState<{
    exhibition: Exhibition;
    slots: ExhibitionSlot[];
    agenda: PublicAgendaItem[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [filter, setFilter] = useState<'semua' | ExhibitionProgramType>('semua');

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    setLoadError('');
    const load = id ? fetchPublicExhibition(id) : fetchPublicExhibitions();
    load
      .then(result => {
        if (!alive) return;
        if (Array.isArray(result)) {
          setList(result);
          setDetail(null);
        } else {
          setDetail({ exhibition: result.exhibition, slots: result.slots, agenda: result.agenda });
        }
      })
      .catch(err => {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat program kolaborasi');
      })
      .finally(() => { if (alive) setIsLoading(false); });
    return () => { alive = false; };
  }, [id, retryCount]);

  useEffect(() => {
    if (!id) setFilter('semua');
  }, [id]);

  const filtered = useMemo(
    () => (filter === 'semua' ? list : list.filter(item => item.programType === filter)),
    [filter, list],
  );

  return (
    <div className="ui-dashboard-page min-h-screen bg-[var(--wf-page)] text-[var(--wf-ink)] transition-colors duration-300">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke konten
      </a>
      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 outline-none">
        {isLoading && <p className="text-sm text-[var(--wf-ink-muted)]">Memuat program kolaborasi...</p>}

        {!isLoading && loadError && (
          <div className="rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5">
            <p role="alert" className="text-sm text-[var(--wf-danger)]">{loadError}</p>
            <Button type="button" variant="ghost" onClick={() => setRetryCount(c => c + 1)} className={`mt-3 ${ctaClass}`}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Coba lagi
            </Button>
          </div>
        )}

        {!isLoading && !loadError && !id && (
          <>
            <RevealSection as="div" refreshKey={`${list.length}:${list[0]?.id ?? ''}`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-tosca-600)]">
                Pameran &amp; Aktivasi Marcomm
              </p>
              <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">
                Ruang Pameran &amp; Kolaborasi di Metmal
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--wf-ink-muted)]">
                Ikut meramaikan program rutin, pameran, dan aktivasi akhir pekan yang diselenggarakan oleh
                Metropolitan Mall Bekasi. Pilih program yang cocok dengan komunitas, UMKM, atau brand Anda.
              </p>

              <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter jenis program">
                {([
                  { value: 'semua' as const, label: 'Semua' },
                  { value: 'aktivasi_marcomm' as const, label: 'Aktivasi Marcomm' },
                  { value: 'pameran' as const, label: 'Pameran' },
                ]).map(tab => (
                  <Button
                    key={tab.value}
                    type="button"
                    variant="outline"
                    role="tab"
                    aria-selected={filter === tab.value}
                    onClick={() => setFilter(tab.value)}
                    className={`h-auto rounded-full px-4 py-2 text-sm font-semibold active:translate-y-0 ${
                      filter === tab.value
                        ? 'border-[var(--wf-accent)]! bg-[var(--wf-accent-soft)]! text-[var(--brand-tosca-600)]!'
                        : 'border-[var(--wf-rule)]! bg-[var(--wf-board)]! text-[var(--wf-ink-muted)]!'
                    }`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </RevealSection>

            {filtered.length === 0 && (
              <div className="mt-8 rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-6">
                <h2 className="font-display text-lg font-bold">Belum ada program di kategori ini</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--wf-ink-muted)]">
                  Program pameran dan aktivasi baru akan segera dibuka. Sementara itu, Anda tetap bisa
                  mengajukan rencana acara mandiri.
                </p>
              </div>
            )}

            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {filtered.map(item => (
                <li key={item.id} className="flex flex-col rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5 shadow-sm">
                  <ProgramBadges program={item} />
                  <h2 className="mt-3 font-display text-xl font-bold">{item.title}</h2>
                  {item.subtitle && <p className="mt-1 text-sm font-medium text-[var(--wf-ink-muted)]">{item.subtitle}</p>}
                  <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--wf-ink-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDateRange(item.dateStart, item.dateEnd)}
                    </span>
                    {item.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" aria-hidden="true" />{item.location}
                      </span>
                    )}
                  </p>
                  {item.description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--wf-ink-muted)]">{item.description}</p>
                  )}
                  <div className="mt-auto pt-4">
                    <Button asChild variant="ghost" className={ctaClass}>
                      <Link to={`/kolaborasi/${item.slug || item.id}`}>
                        <Handshake className="h-4 w-4" aria-hidden="true" /> Lihat detail &amp; gabung
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <section className="mt-10 rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-accent-soft)] p-6">
              <h2 className="font-display text-lg font-bold">Punya konsep acara sendiri di luar daftar di atas?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--wf-ink-muted)]">
                Jika komunitas atau organisasi Anda ingin mengadakan acara mandiri di area Metropolitan Mall Bekasi,
                silakan ajukan lewat formulir pendaftaran event.
              </p>
              <Button asChild variant="ghost" className={`mt-4 ${ctaClass}`}>
                <Link to="/daftar">Ajukan Event Mandiri</Link>
              </Button>
            </section>
          </>
        )}

        {!isLoading && !loadError && id && detail && (
          <ProgramDetail exhibition={detail.exhibition} slots={detail.slots} agenda={detail.agenda} />
        )}
      </main>
    </div>
  );
}

interface ProgramDetailProps {
  exhibition: Exhibition;
  slots: ExhibitionSlot[];
  agenda: PublicAgendaItem[];
}

function ProgramDetail({ exhibition, slots, agenda }: ProgramDetailProps) {
  const [chosenSlotId, setChosenSlotId] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);
  const canApply = exhibition.acceptingApplications
    && exhibition.status !== 'full'
    && exhibition.status !== 'completed'
    && exhibition.status !== 'archived'
    && exhibition.status !== 'draft';

  const chooseSlot = (slotId: string) => {
    setChosenSlotId(slotId);
    setCopiedNotice(true);
    window.requestAnimationFrame(() => {
      document.getElementById('form-kolaborasi')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <>
      <Link to="/kolaborasi" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--wf-ink-muted)]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Semua program kolaborasi
      </Link>

      <RevealSection as="div" refreshKey={exhibition.id}>
        <div className="mt-4"><ProgramBadges program={exhibition} /></div>
        <h1 className="mt-3 max-w-4xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">{exhibition.title}</h1>
        {exhibition.subtitle && <p className="mt-2 max-w-3xl text-base font-medium text-[var(--wf-ink-muted)]">{exhibition.subtitle}</p>}

        <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--wf-ink-muted)]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDateRange(exhibition.dateStart, exhibition.dateEnd)}
          </span>
          {exhibition.scheduleNote && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />{exhibition.scheduleNote}
            </span>
          )}
          {exhibition.location && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-1.5">
              <MapPin className="h-4 w-4" aria-hidden="true" />{exhibition.location}
            </span>
          )}
          {exhibition.targetAudience && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-1.5">
              <Users className="h-4 w-4" aria-hidden="true" />{exhibition.targetAudience}
            </span>
          )}
        </div>

        {canApply && (
          <Button asChild variant="ghost" className={`mt-5 ${ctaClass}`}>
            <a href="#form-kolaborasi"><Handshake className="h-4 w-4" aria-hidden="true" /> Langsung Isi Formulir</a>
          </Button>
        )}
      </RevealSection>

      <section className="mt-8 rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold">Tentang Program</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--wf-ink-muted)]">{exhibition.description}</p>
        {exhibition.benefits.length > 0 && (
          <div className="mt-5 rounded-xl bg-[var(--wf-board-2)] p-4">
            <h3 className="font-display text-base font-bold">Yang Didapatkan Mitra</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {exhibition.benefits.slice(0, 5).map(benefit => (
                <li key={benefit.title} className="flex items-start gap-2 text-sm text-[var(--wf-ink)]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-tosca-600)]" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold">{benefit.title}</strong>
                    {benefit.description && <>: {benefit.description}</>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold">Siapa yang Kami Cari?</h2>
        {exhibition.lookingForSummary && (
          <p className="mt-2 text-sm leading-7 text-[var(--wf-ink-muted)]">{exhibition.lookingForSummary}</p>
        )}
        {exhibition.lookingForTags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {exhibition.lookingForTags.map(tag => (
              <li key={tag} className="rounded-full bg-[var(--wf-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-tosca-600)]">{tag}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5">
        <h2 className="font-display text-xl font-bold">Jadwal &amp; Agenda Aktivasi</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--wf-ink-muted)]">
          {canApply
            ? 'Lihat jadwal kegiatan yang sudah terkonfirmasi atau pilih tanggal yang masih tersedia untuk komunitas Anda.'
            : 'Jadwal dan agenda kegiatan program ini.'}
        </p>
        {slots.length === 0 && (
          <p className="mt-4 rounded-xl bg-[var(--wf-board)] p-4 text-sm text-[var(--wf-ink-muted)]">
            {canApply
              ? 'Jadwal tanggal akan diumumkan. Anda tetap bisa mengajukan tanggal fleksibel di formulir bawah.'
              : 'Belum ada jadwal tanggal yang ditampilkan untuk program ini.'}
          </p>
        )}
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {slots.map(slot => {
            const slotAgenda = agenda.filter(item => item.slotId === slot.id);
            const selectable = slot.slotStatus === 'open' || slot.slotStatus === 'limited';
            const slotMeta = SLOT_META[slot.slotStatus];
            return (
              <li key={slot.id} className="rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-bold">{longDate(slot.slotDate)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--wf-ink-muted)]">
                      <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden="true" />{slot.startTime} - {slot.endTime} WIB</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{slot.zoneName}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className={`border-0 font-semibold ${slotMeta.className}`}>{slotMeta.label}</Badge>
                </div>

                <div className="mt-3 space-y-2">
                  {slotAgenda.length === 0 && (
                    <p className="text-sm text-[var(--wf-ink-muted)]">
                      Belum ada agenda terkonfirmasi. Jadilah yang pertama mengisi tanggal ini!
                    </p>
                  )}
                  {slotAgenda.map(item => (
                    <div key={item.id} className="rounded-xl bg-[var(--wf-board-2)] p-3">
                      <p className="text-sm font-semibold">{item.publicActivityTitle}</p>
                      <p className="text-xs text-[var(--wf-ink-muted)]">oleh {item.organizationName}</p>
                      {item.publicActivitySummary && (
                        <p className="mt-1 text-sm text-[var(--wf-ink)]">{item.publicActivitySummary}</p>
                      )}
                    </div>
                  ))}
                </div>

                {selectable && canApply && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => chooseSlot(slot.id)}
                    className="mt-4 h-auto rounded-full px-4 py-2 text-sm font-semibold active:translate-y-0"
                  >
                    Pilih tanggal ini
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section id="form-kolaborasi" className="mt-10 scroll-mt-20 rounded-2xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold">
          {canApply ? 'Ajukan Kolaborasi' : exhibition.status === 'completed' ? 'Program Telah Selesai' : 'Kolaborasi Ditutup'}
        </h2>
        {canApply && (
          <p className="mt-1 text-sm leading-6 text-[var(--wf-ink-muted)]">
            Isi data singkat di bawah ini.
          </p>
        )}
        {copiedNotice && chosenSlotId && (
          <p role="status" className="mt-2 text-sm font-medium text-[var(--brand-tosca-600)]">
            Tanggal sudah dipilih. Lengkapi data di bawah untuk mengirim pengajuan.
          </p>
        )}
        {!canApply ? (
          <div className="mt-4 rounded-xl bg-[var(--wf-board-2)] p-4">
            {exhibition.status === 'full' ? (
              <>
                <p className="text-sm font-semibold text-[var(--wf-ink)]">Slot periode ini sudah penuh</p>
                <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">
                  Terima kasih atas minat Anda. Silakan lihat program lain yang masih membuka kolaborasi.
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--wf-ink-muted)]">
                Silakan lihat program lain yang masih membuka kolaborasi.
              </p>
            )}
            <Button asChild variant="ghost" className={`mt-3 ${ctaClass}`}>
              <Link to="/kolaborasi">Lihat program lain</Link>
            </Button>
          </div>
        ) : (
          <CollaborationForm exhibition={exhibition} slots={slots} chosenSlotId={chosenSlotId} />
        )}
      </section>
    </>
  );
}
