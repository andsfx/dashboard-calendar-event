import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarDays, CheckCircle2, ClipboardCheck, Copy, Check, MapPin, Search, Send, Store, Tag,
} from 'lucide-react';
import type {
  TenantParticipationEligibleEvent,
  TenantParticipationInput,
  TenantParticipationKind,
  TenantParticipationOptionGroup,
  TenantParticipationOptionPublic,
  TenantParticipationStatus,
  TenantParticipationStatusResult,
} from '../types';
import {
  fetchEventAreas,
  fetchTenantParticipationEvents,
  fetchTenantParticipationOptions,
  fetchTenantParticipationStatus,
  submitTenantParticipation,
  tenantParticipationOptionLabel,
  TENANT_PARTICIPATION_FALLBACK_OPTIONS,
} from '../utils/domainApi';
import { TenantSearchSelect } from '../components/survey/TenantSurveyShared';
import type { TenantDropdownOption } from '../utils/domainApi';
import { validateEmail, validatePhone } from '../utils/validation';
import { usePageMeta } from '../utils/pageMeta';
import { formatDateRange } from '../utils/eventUtils';
import { ApiError } from '../lib/rest';
import { PublicSiteHeader } from '../components/nav/PublicSiteHeader';
import { Button } from '../components/shadcn/button';
import { Input } from '../components/shadcn/input';
import { Label } from '../components/shadcn/label';
import { NativeSelect } from '../components/shadcn/native-select';
import { Textarea } from '../components/shadcn/textarea';
import { RevealSection } from '../components/community/CommunityRevealPrimitives';

interface Props {
  isDark: boolean;
  onToggleDark: () => void;
}

const KIND_OPTIONS: { value: TenantParticipationKind; label: string; hint: string }[] = [
  { value: 'booth', label: 'Open booth', hint: 'Berjualan atau promosi di area event' },
  { value: 'voucher', label: 'Voucher', hint: 'Diskon atau penawaran khusus untuk pengunjung event' },
  { value: 'both', label: 'Keduanya', hint: 'Booth sekaligus voucher untuk event yang sama' },
];

const STATUS_LABELS: Record<TenantParticipationStatus, string> = {
  pending: 'Menunggu tinjauan',
  contacted: 'Sedang dihubungi tim',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

/** Nada status di panel cek — satu kelas per status, bukan warna acak. */
const STATUS_TONE: Record<TenantParticipationStatus, string> = {
  pending: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
  contacted: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200',
  approved: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
  rejected: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200',
};

const EMPTY_FORM: TenantParticipationInput = {
  tenantId: '',
  tenantName: '', unitNumber: '', tenantCategory: '', tenantLogo: '',
  contactName: '', phone: '', email: '',
  eventId: '', kind: 'both',
  boothArea: '', boothStart: '', boothEnd: '', boothSize: '', boothProducts: '', boothScheme: 'solo', boothNeeds: '',
  voucherType: 'discount_percent', voucherTerms: '', voucherQuota: '', voucherFormat: 'both',
};

/**
 * Kontrol form. `h-auto` menaklukkan tinggi bawaan `Input`/`Textarea` shadcn (`h-8`)
 * sehingga padding asli (`py-3`) tetap yang menentukan tinggi. Sufiks `!` dipakai pada
 * kelas yang kalah urutan dari token bawaan shadcn (`rounded-lg`, `ring-3`,
 * `ring-ring/50`, `aria-invalid:*`) supaya tampilan kontrol tidak bergeser; `dark:bg-\[var\(--wf-board\)\]`
 * mempertahankan latar kontrol yang memang putih di kedua tema seperti sebelumnya.
 */
const inputClass = 'h-auto w-full rounded-[var(--radius-control)]! border border-[var(--wf-rule-control)] bg-[var(--wf-board)] px-4 py-3 text-sm text-[var(--wf-ink)] outline-none transition! placeholder:text-[var(--wf-ink-muted)] focus-visible:border-[var(--wf-rule-control)]! focus-visible:ring-2! focus-visible:ring-[var(--brand-tosca)]! aria-invalid:border-[var(--wf-rule-control)]! aria-invalid:ring-0!';
/**
 * `className` pada `NativeSelect` mendarat di pembungkus, bukan di elemen pilihannya, jadi
 * token kontrol lama dioper lewat varian anak (`[&>select]:*`). Padding kanan dibiarkan
 * `pr-8` bawaan agar chevron yang digambar primitive tidak menimpa teks pilihan.
 */
const nativeSelectClass = 'w-full [&>select]:h-auto [&>select]:rounded-[var(--radius-control)] [&>select]:bg-[var(--wf-board)] [&>select]:pl-4 [&>select]:py-3 [&>select]:transition [&>select]:focus-visible:border-[var(--wf-rule-control)] [&>select]:focus-visible:ring-2 [&>select]:focus-visible:ring-[var(--brand-tosca)] [&>select]:aria-invalid:border-[var(--wf-rule-control)] [&>select]:aria-invalid:ring-0';
const tenantFieldClass = 'rounded-md border-[var(--wf-rule-control)] py-3 bg-[var(--wf-board-2)] placeholder:text-[var(--wf-ink-muted)]';
const labelClass = 'mb-1.5 block! select-text! text-xs font-semibold leading-normal text-[var(--wf-ink-muted)]';
const focusRing = 'ui-focus-ring';

/** Label tanggal dari date_str/date_end event — pakai util tanggal yang sudah ada. */
function eventDateLabel(event: TenantParticipationEligibleEvent): string {
  return formatDateRange(event.dateStr, event.dateEnd || event.dateStr);
}

/** Samakan lokasi event dengan nama area kanonis: exact → trim/case-insensitive → apa adanya. */
function resolveBoothArea(lokasi: string, areas: string[]): string {
  const trimmed = lokasi.trim();
  if (!trimmed) return '';
  if (areas.includes(trimmed)) return trimmed;
  const loose = areas.find((name) => name.trim().toLowerCase() === trimmed.toLowerCase());
  return loose ?? lokasi;
}

export function TenantParticipationPage({ isDark, onToggleDark }: Props) {
  usePageMeta({
    title: 'Partisipasi tenant - Metropolitan Mall Bekasi',
    description: 'Ajukan booth terbuka atau voucher tenant kamu untuk event di Metropolitan Mall Bekasi. Pantau status pengajuan dengan kode pengajuan.',
  });

  const [searchParams] = useSearchParams();
  const preselectedEventId = (searchParams.get('event') || '').trim();

  const [form, setForm] = useState<TenantParticipationInput>({ ...EMPTY_FORM });
  const [events, setEvents] = useState<TenantParticipationEligibleEvent[]>([]);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  // Opsi form (skema/ukuran booth, jenis/format voucher) dikelola admin.
  // Fallback bawaan dipakai sampai daftar dari server tiba (atau bila gagal).
  const [options, setOptions] = useState<TenantParticipationOptionPublic[]>(TENANT_PARTICIPATION_FALLBACK_OPTIONS);
  const [selectedTenant, setSelectedTenant] = useState<TenantDropdownOption | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [autoFilled, setAutoFilled] = useState({ unitNumber: false, tenantCategory: false, boothArea: false });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /** Kode pengajuan hasil submit — ditampilkan sekali; null = form masih tampil. */
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const successRef = useRef<HTMLDivElement | null>(null);

  // Panel cek status
  const [statusCode, setStatusCode] = useState('');
  const [statusPhone, setStatusPhone] = useState('');
  const [statusChecking, setStatusChecking] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusResult, setStatusResult] = useState<TenantParticipationStatusResult | null>(null);

  useEffect(() => {
    if (submittedCode) successRef.current?.focus();
  }, [submittedCode]);

  // Daftar event eligible (published + belum mulai). Gagal memuat = form tidak
  // bisa dikirim (event wajib), jadi keadaan itu ditampilkan jelas — bukan
  // dropdown kosong tanpa alasan.
  useEffect(() => {
    let cancelled = false;
    fetchTenantParticipationEvents()
      .then((rows) => {
        if (cancelled) return;
        setEvents(rows);
        setEventsFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setEvents([]);
        setEventsFailed(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Daftar area kanonis untuk pilihan lokasi booth; gagal = input teks bebas.
  useEffect(() => {
    let cancelled = false;
    fetchEventAreas()
      .then((areas) => { if (!cancelled) setAreaOptions(areas.map((area) => area.name).filter(Boolean)); })
      .catch(() => { if (!cancelled) setAreaOptions([]); });
    return () => { cancelled = true; };
  }, []);

  // Opsi form aktif dari server (dikelola admin). fetchTenantParticipationOptions
  // sudah fallback ke opsi bawaan saat gagal — tidak perlu state error di sini.
  useEffect(() => {
    let cancelled = false;
    fetchTenantParticipationOptions()
      .then((rows) => { if (!cancelled && rows.length > 0) setOptions(rows); })
      .catch(() => { /* fallback bawaan sudah dipakai */ });
    return () => { cancelled = true; };
  }, []);

  // Pilihan terkini per grup, terurut. Nilai form yang tidak ada di daftar
  // (opsi dimatikan admin di sela pengisian) tetap tampil sebagai opsi tambahan
  // agar textarea/select tidak "kehilangan" nilai yang sudah dipilih tenant.
  const optionsFor = (group: TenantParticipationOptionGroup): TenantParticipationOptionPublic[] => {
    const active = options
      .filter((option) => option.group === group)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    const current = form[group === 'booth_scheme' ? 'boothScheme' : group === 'booth_size' ? 'boothSize' : group === 'voucher_type' ? 'voucherType' : 'voucherFormat'];
    if (typeof current === 'string' && current !== '' && !active.some((option) => option.value === current)) {
      return [...active, { group, value: current, label: `${current} (tidak tersedia lagi)`, sortOrder: 0 }];
    }
    return active;
  };

  // Event dari CTA halaman detail (`?event=`) dipilih otomatis bila masih eligible.
  useEffect(() => {
    if (!preselectedEventId || events.length === 0) return;
    const match = events.find((ev) => ev.id === preselectedEventId);
    if (!match) return;
    setForm((prev) => {
      if (prev.eventId) return prev;
      return {
        ...prev,
        eventId: match.id,
        boothStart: prev.boothStart || match.dateStr,
        boothEnd: prev.boothEnd || (match.dateEnd || match.dateStr),
        // Sama seperti handleEventSelect: area dari lokasi event, tanpa menimpa
        // nilai manual (di jalur preselect form baru → boothArea pasti kosong).
        boothArea: match.lokasi.trim() && !prev.boothArea ? resolveBoothArea(match.lokasi, areaOptions) : prev.boothArea,
      };
    });
    if (match.lokasi.trim()) {
      setAutoFilled((prev) => ({ ...prev, boothArea: true }));
    }
  }, [preselectedEventId, events, areaOptions]);

  const selectedEvent = useMemo(
    () => events.find((ev) => ev.id === form.eventId) ?? null,
    [events, form.eventId],
  );

  const setField = <K extends keyof TenantParticipationInput>(key: K, value: TenantParticipationInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'unitNumber') {
      setAutoFilled((prev) => (prev.unitNumber ? { ...prev, unitNumber: false } : prev));
    } else if (key === 'tenantCategory') {
      setAutoFilled((prev) => (prev.tenantCategory ? { ...prev, tenantCategory: false } : prev));
    } else if (key === 'boothArea') {
      setAutoFilled((prev) => (prev.boothArea ? { ...prev, boothArea: false } : prev));
    }
    setError('');
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  /** Pilih event → periode booth mengikuti rentang tanggal event (bisa disunting). */
  const handleEventSelect = (eventId: string) => {
    const match = events.find((ev) => ev.id === eventId) ?? null;
    setForm((prev) => ({
      ...prev,
      eventId,
      boothStart: match ? match.dateStr : prev.boothStart,
      boothEnd: match ? (match.dateEnd || match.dateStr) : prev.boothEnd,
      // Auto-isi area dari lokasi event — hanya bila kosong atau masih nilai
      // auto-isi event sebelumnya; nilai ketikan manual tidak pernah ditimpa.
      boothArea: match && match.lokasi.trim() && (!prev.boothArea || autoFilled.boothArea)
        ? resolveBoothArea(match.lokasi, areaOptions)
        : prev.boothArea,
    }));
    if (match && match.lokasi.trim()) {
      setAutoFilled((prev) => ({ ...prev, boothArea: true }));
    }
    setError('');
    setFieldErrors((prev) => {
      if (!prev.eventId) return prev;
      const next = { ...prev };
      delete next.eventId;
      return next;
    });
  };

  const handleTenantSelect = (tenant: TenantDropdownOption | null) => {
    setSelectedTenant(tenant);
    setForm((prev) => {
      if (!tenant) {
        return {
          ...prev,
          tenantId: '',
          unitNumber: autoFilled.unitNumber ? '' : prev.unitNumber,
          tenantCategory: autoFilled.tenantCategory ? '' : prev.tenantCategory,
          tenantLogo: '',
        };
      }
      return {
        ...prev,
        tenantId: tenant.id,
        tenantName: tenant.name,
        unitNumber: tenant.lot,
        tenantCategory: tenant.category,
        tenantLogo: tenant.logo || '',
      };
    });
    setAutoFilled((prev) => (tenant
      ? { ...prev, unitNumber: Boolean(tenant.lot), tenantCategory: Boolean(tenant.category) }
      : { ...prev, unitNumber: false, tenantCategory: false }));
    setError('');
    setFieldErrors((prev) => {
      if (!prev.tenantName) return prev;
      const next = { ...prev };
      delete next.tenantName;
      return next;
    });
  };

  /** Pindah jalur pengisian tenant; pilihan MID dibuang agar tidak ada data separuh. */
  const switchEntryMode = (manual: boolean) => {
    setManualEntry(manual);
    setSelectedTenant(null);
    setForm((prev) => ({
      ...prev,
      tenantId: '',
      tenantName: '',
      unitNumber: autoFilled.unitNumber ? '' : prev.unitNumber,
      tenantCategory: autoFilled.tenantCategory ? '' : prev.tenantCategory,
      tenantLogo: '',
    }));
    setAutoFilled((prev) => ({ ...prev, unitNumber: false, tenantCategory: false }));
    setError('');
    setFieldErrors((prev) => {
      if (!prev.tenantName) return prev;
      const next = { ...prev };
      delete next.tenantName;
      return next;
    });
  };

  const includeBooth = form.kind !== 'voucher';
  const includeVoucher = form.kind !== 'booth';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};

    if (!form.eventId) errors.eventId = 'Pilih event tujuan pengajuan.';
    if (!manualEntry && !selectedTenant) errors.tenantName = 'Pilih tenant dari daftar, atau isi manual.';
    else if (form.tenantName.trim().length < 2) errors.tenantName = 'Nama tenant minimal 2 karakter.';
    if (form.contactName.trim().length < 3) errors.contactName = 'Nama PIC minimal 3 karakter.';
    const phoneCheck = validatePhone(form.phone);
    if (!phoneCheck.valid) errors.phone = phoneCheck.error || 'Nomor WhatsApp tidak valid.';
    if (form.email.trim()) {
      const emailCheck = validateEmail(form.email);
      if (!emailCheck.valid) errors.email = emailCheck.error || 'Email belum sesuai format. Contoh yang benar: nama@email.com';
    }
    if (includeBooth) {
      if (!form.boothArea.trim()) errors.boothArea = 'Area booth wajib diisi.';
      if (!form.boothStart) errors.boothStart = 'Tanggal mulai booth wajib diisi.';
      if (form.boothEnd && form.boothStart && form.boothEnd < form.boothStart) {
        errors.boothEnd = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
      }
      if (!form.boothProducts.trim()) errors.boothProducts = 'Produk atau jasa yang dijual wajib diisi.';
    }
    if (includeVoucher && !form.voucherTerms.trim()) {
      errors.voucherTerms = 'Ketentuan voucher wajib diisi.';
    }
    if (form.voucherQuota !== '' && includeVoucher) {
      if (!Number.isInteger(form.voucherQuota) || form.voucherQuota < 0) errors.voucherQuota = 'Kuota harus bilangan bulat 0 atau lebih.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Periksa kolom yang ditandai, lalu kirim ulang.');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const code = await submitTenantParticipation(form);
      setSubmittedCode(code);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === '429') {
        setError('Terlalu banyak pengajuan dari jaringan ini. Tunggu sebentar, lalu kirim ulang.');
      } else if (code === '400' || code === '422') {
        setError(err instanceof Error ? err.message : 'Ada data yang belum sesuai. Periksa kembali lalu kirim ulang.');
      } else {
        setError(err instanceof Error ? err.message : 'Gagal mengirim pengajuan. Coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async (event: FormEvent) => {
    event.preventDefault();
    if (statusCode.trim().length < 4 || statusPhone.trim().length < 8) {
      setStatusError('Isi kode pengajuan dan nomor telepon yang dipakai saat mengajukan.');
      setStatusResult(null);
      return;
    }
    setStatusChecking(true);
    setStatusError('');
    setStatusResult(null);
    try {
      const result = await fetchTenantParticipationStatus(statusCode.trim(), statusPhone.trim());
      if (!result) {
        setStatusError('Pengajuan tidak ditemukan. Periksa kembali kode dan nomor teleponnya.');
      } else {
        setStatusResult(result);
      }
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Gagal memeriksa status. Coba lagi.');
    } finally {
      setStatusChecking(false);
    }
  };

  const handleCopyCode = async () => {
    if (!submittedCode) return;
    try {
      await navigator.clipboard.writeText(submittedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard bisa ditolak browser — kode tetap terbaca di layar */ }
  };

  return (
    <div className="ui-dashboard-page min-h-screen bg-[var(--wf-page)] text-[var(--wf-ink)] transition-colors duration-300">
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--wf-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--wf-accent-ink)]"
      >
        Langsung ke konten
      </a>

      <PublicSiteHeader isDark={isDark} onToggleDark={onToggleDark} />

      <main id="konten-utama" tabIndex={-1} className="mx-auto max-w-3xl px-4 pb-16 pt-10 outline-none sm:px-6">
        <RevealSection as="div">
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ikut event sebagai tenant
          </h1>
          <p className="mt-3 text-sm leading-7 ui-text-secondary">
            Ajukan <strong>booth terbuka</strong> untuk berjualan atau promosi di area event, atau{' '}
            <strong>voucher</strong> untuk menarik pengunjung datang ke tenant kamu. Pengajuan ditinjau tim Marcomm;
            yang disetujui tampil di halaman detail event.
          </p>
        </RevealSection>

        <RevealSection aria-labelledby="alur-title" className="mt-8 rounded-[var(--radius-card-lg)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5 sm:p-6">
          <h2 id="alur-title" className="font-display text-lg font-bold">Alur pengajuan</h2>
          <ol className="mt-3 space-y-3 text-sm ui-text-secondary">
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums">1</span>
              <span>Pilih event yang belum berjalan, lalu isi data booth atau voucher. Pengajuan ditutup paling lambat sehari sebelum event mulai.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums">2</span>
              <span>Tim Marcomm meninjau kelayakan. Simpan <strong>kode pengajuan</strong> yang muncul setelah kirim untuk memantau status.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums">3</span>
              <span>Bila disetujui, booth dan voucher kamu tampil di halaman event dan tim menghubungi PIC lewat nomor yang dicantumkan.</span>
            </li>
          </ol>
        </RevealSection>

        <RevealSection aria-labelledby="form-title" className="mt-8 rounded-[var(--radius-card-lg)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5 sm:p-6">
          <h2 id="form-title" className="font-display text-lg font-bold">Formulir pengajuan</h2>

          {submittedCode ? (
            <div ref={successRef} tabIndex={-1} className="mt-4 rounded-[var(--radius-card)] bg-emerald-50 p-4 text-sm text-emerald-900 outline-none dark:bg-emerald-950/40 dark:text-emerald-200">
              <p className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <span>
                  Pengajuan kamu sudah terkirim dan masuk antrean tinjauan tim. Simpan kode pengajuan ini.
                  Kamu butuh kode dan nomor telepon untuk memantau statusnya.
                </span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-[var(--radius-control)] border border-emerald-300 bg-white px-4 py-2 font-mono text-base font-bold tracking-wider text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-100">
                  {submittedCode}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCopyCode}
                  className={`${focusRing} inline-flex h-auto items-center gap-2 rounded-full! border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100! hover:text-emerald-800! focus-visible:border-emerald-300! dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-900/60! dark:hover:text-emerald-100! dark:focus-visible:border-emerald-700! active:translate-y-0!`}
                >
                  {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                  {copied ? 'Kode tersalin' : 'Salin kode'}
                </Button>
              </div>
              <p className="mt-3 text-xs text-emerald-800 dark:text-emerald-300">
                Pantau statusnya di panel “Cek status pengajuan” di bawah, atau ajukan partisipasi lain untuk event berbeda.
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSubmittedCode(null);
                  setForm({ ...EMPTY_FORM });
                  setSelectedTenant(null);
                  setManualEntry(false);
                  setAutoFilled({ unitNumber: false, tenantCategory: false, boothArea: false });
                  setCopied(false);
                }}
                className={`${focusRing} mt-3 inline-flex h-auto min-h-11 items-center whitespace-normal! text-xs font-semibold text-emerald-800 underline-offset-2 hover:bg-transparent hover:text-emerald-800! hover:underline dark:text-emerald-200 dark:hover:bg-transparent dark:hover:text-emerald-200! active:translate-y-0!`}
              >
                Ajukan partisipasi lagi
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
              {/* ── Event tujuan ── */}
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--wf-ink-muted)]">Event tujuan</legend>
                {eventsFailed ? (
                  <p role="alert" className="rounded-[var(--radius-control)] border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                    Gagal memuat daftar event. Muat ulang halaman ini untuk mencoba lagi.
                  </p>
                ) : events.length === 0 ? (
                  <p className="rounded-[var(--radius-control)] border border-[var(--wf-rule-strong)] bg-[var(--wf-board-2)] px-4 py-3 text-sm ui-text-secondary">
                    Belum ada event yang bisa diajukan saat ini. Pengajuan dibuka untuk event yang belum berjalan
                    dan ditutup paling lambat sehari sebelum event mulai.
                  </p>
                ) : (
                  <>
                    <Label className={labelClass} htmlFor="tp-event">
                      Pilih event <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </Label>
                    <NativeSelect
                      id="tp-event"
                      className={nativeSelectClass}
                      value={form.eventId}
                      onChange={(e) => handleEventSelect(e.target.value)}
                      aria-invalid={Boolean(fieldErrors.eventId)}
                      aria-describedby={fieldErrors.eventId ? 'tp-event-err' : 'tp-event-hint'}
                    >
                      <option value="">Pilih event…</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.acara} ({eventDateLabel(ev)})
                        </option>
                      ))}
                    </NativeSelect>
                    {fieldErrors.eventId
                      ? <p id="tp-event-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.eventId}</p>
                      : <p id="tp-event-hint" className="mt-1 text-xs text-[var(--wf-ink-muted)]">Hanya event yang belum mulai yang bisa dipilih (pengajuan ditutup H-1).</p>}
                    {selectedEvent && (
                      <div className="mt-2 rounded-[var(--radius-control)] border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-3 py-2">
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--wf-ink-muted)]">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                            {eventDateLabel(selectedEvent)}
                          </span>
                          {selectedEvent.lokasi && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                              {selectedEvent.lokasi}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </fieldset>

              {/* ── Jenis partisipasi ── */}
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--wf-ink-muted)]">
                  Jenis partisipasi <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {KIND_OPTIONS.map((option) => {
                    const selected = form.kind === option.value;
                    return (
                      <Label
                        key={option.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border px-4 py-3 leading-normal select-text! transition-colors focus-within:ring-2 focus-within:ring-[var(--brand-tosca)] ${
                          selected
                            ? 'border-[var(--wf-accent)] bg-[var(--wf-accent-soft)]'
                            : 'border-[var(--wf-rule-strong)] bg-[var(--wf-board)] hover:border-[var(--wf-rule-control)]'
                        }`}
                      >
                        <Input
                          type="radio"
                          name="kind"
                          value={option.value}
                          checked={selected}
                          onChange={() => setField('kind', option.value)}
                          className="mt-0.5 h-4! w-4! shrink-0 border-0! p-0! accent-[var(--brand-tosca-600)] focus-visible:ring-0! dark:bg-transparent"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[var(--wf-ink)]">{option.label}</span>
                          <span className="mt-0.5 block text-xs text-[var(--wf-ink-muted)]">{option.hint}</span>
                        </span>
                      </Label>
                    );
                  })}
                </div>
              </fieldset>

              {/* ── Data tenant ── */}
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--wf-ink-muted)]">Data tenant</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {!manualEntry ? (
                    <div className="sm:col-span-2">
                      <Label className={labelClass} htmlFor="tp-tenant">
                        Nama tenant <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </Label>
                      <TenantSearchSelect
                        id="tp-tenant"
                        value={selectedTenant?.name || form.tenantName}
                        onChange={(next) => setField('tenantName', next)}
                        onTenantSelect={handleTenantSelect}
                        required
                        error={fieldErrors.tenantName}
                        className={tenantFieldClass}
                      />
                      {selectedTenant && (
                        <div className="mt-2 rounded-[var(--radius-control)] border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-3 py-2">
                          <p className="text-xs font-semibold text-[var(--wf-ink)]">{selectedTenant.name}</p>
                          <p className="text-[11px] text-[var(--wf-ink-muted)]">
                            {[selectedTenant.category, selectedTenant.floor, selectedTenant.lot && `Lot ${selectedTenant.lot}`]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => switchEntryMode(true)}
                        className={`${focusRing} mt-2 inline-flex h-auto min-h-11 items-center whitespace-normal! text-xs font-semibold text-[var(--brand-tosca-600)] underline-offset-2 hover:bg-transparent hover:text-[var(--brand-tosca-600)]! hover:underline dark:text-[var(--brand-tosca-soft)] dark:hover:bg-transparent dark:hover:text-[var(--brand-tosca-soft)]! active:translate-y-0!`}
                      >
                        Tenant saya belum ada di daftar
                      </Button>
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <Label className={labelClass} htmlFor="tp-tenant-manual">
                        Nama tenant <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </Label>
                      <Input
                        id="tp-tenant-manual"
                        className={inputClass}
                        value={form.tenantName}
                        onChange={(e) => setField('tenantName', e.target.value)}
                        maxLength={200}
                        aria-invalid={Boolean(fieldErrors.tenantName)}
                        aria-describedby={fieldErrors.tenantName ? 'tp-tenant-err' : undefined}
                      />
                      {fieldErrors.tenantName && <p id="tp-tenant-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.tenantName}</p>}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => switchEntryMode(false)}
                        className={`${focusRing} mt-2 inline-flex h-auto min-h-11 items-center whitespace-normal! text-xs font-semibold text-[var(--brand-tosca-600)] underline-offset-2 hover:bg-transparent hover:text-[var(--brand-tosca-600)]! hover:underline dark:text-[var(--brand-tosca-soft)] dark:hover:bg-transparent dark:hover:text-[var(--brand-tosca-soft)]! active:translate-y-0!`}
                      >
                        Cari tenant di daftar
                      </Button>
                    </div>
                  )}
                  <div>
                    <Label className={labelClass} htmlFor="tp-unit">Nomor unit atau lot</Label>
                    <Input id="tp-unit" className={inputClass} value={form.unitNumber} onChange={(e) => setField('unitNumber', e.target.value)} maxLength={50} placeholder="Contoh: GF-12" />
                  </div>
                  <div>
                    <Label className={labelClass} htmlFor="tp-category">Kategori tenant</Label>
                    <Input id="tp-category" className={inputClass} value={form.tenantCategory} onChange={(e) => setField('tenantCategory', e.target.value)} maxLength={100} placeholder="Contoh: F&amp;B, Fashion" />
                  </div>
                </div>
              </fieldset>

              {/* ── PIC ── */}
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--wf-ink-muted)]">PIC yang bisa dihubungi</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className={labelClass} htmlFor="tp-contact">
                      Nama PIC <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </Label>
                    <Input
                      id="tp-contact"
                      className={inputClass}
                      value={form.contactName}
                      onChange={(e) => setField('contactName', e.target.value)}
                      maxLength={100}
                      aria-invalid={Boolean(fieldErrors.contactName)}
                      aria-describedby={fieldErrors.contactName ? 'tp-contact-err' : undefined}
                    />
                    {fieldErrors.contactName && <p id="tp-contact-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.contactName}</p>}
                  </div>
                  <div>
                    <Label className={labelClass} htmlFor="tp-phone">
                      Nomor WhatsApp <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                    </Label>
                    <Input
                      id="tp-phone"
                      className={inputClass}
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      aria-invalid={Boolean(fieldErrors.phone)}
                      aria-describedby={fieldErrors.phone ? 'tp-phone-err' : 'tp-phone-hint'}
                    />
                    {fieldErrors.phone
                      ? <p id="tp-phone-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.phone}</p>
                      : <p id="tp-phone-hint" className="mt-1 text-xs text-[var(--wf-ink-muted)]">Nomor ini juga dipakai untuk cek status pengajuan.</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label className={labelClass} htmlFor="tp-email">Email</Label>
                    <Input
                      id="tp-email"
                      type="email"
                      className={inputClass}
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      maxLength={255}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'tp-email-err' : undefined}
                    />
                    {fieldErrors.email && <p id="tp-email-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.email}</p>}
                  </div>
                </div>
              </fieldset>

              {/* ── Booth ── */}
              {includeBooth && (
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--wf-ink-muted)]">
                    <Store className="h-3.5 w-3.5" aria-hidden="true" /> Data booth
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className={labelClass} htmlFor="tp-booth-area">
                        Area yang diminta <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </Label>
                      {areaOptions.length > 0 ? (
                        <NativeSelect
                          id="tp-booth-area"
                          className={nativeSelectClass}
                          value={form.boothArea}
                          onChange={(e) => setField('boothArea', e.target.value)}
                          aria-invalid={Boolean(fieldErrors.boothArea)}
                          aria-describedby={fieldErrors.boothArea ? 'tp-booth-area-err' : (autoFilled.boothArea ? 'tp-booth-area-hint' : undefined)}
                        >
                          <option value="">Pilih area…</option>
                          {areaOptions.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                          {/* Nilai auto-isi dari lokasi event yang tidak ada di daftar
                              kanonis tetap ditampilkan agar select tidak "kehilangan" nilai. */}
                          {form.boothArea && !areaOptions.includes(form.boothArea) && (
                            <option value={form.boothArea}>{form.boothArea} (tidak tersedia lagi)</option>
                          )}
                        </NativeSelect>
                      ) : (
                        <Input
                          id="tp-booth-area"
                          className={inputClass}
                          value={form.boothArea}
                          onChange={(e) => setField('boothArea', e.target.value)}
                          maxLength={200}
                          placeholder="Contoh: Main Atrium"
                          aria-invalid={Boolean(fieldErrors.boothArea)}
                          aria-describedby={fieldErrors.boothArea ? 'tp-booth-area-err' : (autoFilled.boothArea ? 'tp-booth-area-hint' : undefined)}
                        />
                      )}
                      {fieldErrors.boothArea
                        ? <p id="tp-booth-area-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.boothArea}</p>
                        : (autoFilled.boothArea && <p id="tp-booth-area-hint" className="mt-1 text-xs text-[var(--wf-ink-muted)]">Terisi otomatis dari lokasi event; sesuaikan bila perlu.</p>)}
                    </div>
                    <div>
                      <Label className={labelClass} htmlFor="tp-booth-size">Ukuran booth yang dibutuhkan</Label>
                      {optionsFor('booth_size').length > 0 ? (
                        <NativeSelect
                          id="tp-booth-size"
                          className={nativeSelectClass}
                          value={form.boothSize}
                          onChange={(e) => setField('boothSize', e.target.value)}
                        >
                          <option value="">Pilih ukuran…</option>
                          {optionsFor('booth_size').map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </NativeSelect>
                      ) : (
                        <Input
                          id="tp-booth-size"
                          className={inputClass}
                          value={form.boothSize}
                          onChange={(e) => setField('boothSize', e.target.value)}
                          maxLength={100}
                          placeholder="Contoh: 2×2 m"
                        />
                      )}
                    </div>
                    <div>
                      <Label className={labelClass} htmlFor="tp-booth-start">
                        Mulai booth <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </Label>
                      <Input
                        id="tp-booth-start"
                        type="date"
                        className={inputClass}
                        value={form.boothStart}
                        onChange={(e) => setField('boothStart', e.target.value)}
                        aria-invalid={Boolean(fieldErrors.boothStart)}
                        aria-describedby={fieldErrors.boothStart ? 'tp-booth-start-err' : undefined}
                      />
                      {fieldErrors.boothStart && <p id="tp-booth-start-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.boothStart}</p>}
                    </div>
                    <div>
                      <Label className={labelClass} htmlFor="tp-booth-end">Selesai booth</Label>
                      <Input
                        id="tp-booth-end"
                        type="date"
                        className={inputClass}
                        value={form.boothEnd}
                        min={form.boothStart || undefined}
                        onChange={(e) => setField('boothEnd', e.target.value)}
                        aria-invalid={Boolean(fieldErrors.boothEnd)}
                        aria-describedby={fieldErrors.boothEnd ? 'tp-booth-end-err' : 'tp-booth-end-hint'}
                      />
                      {fieldErrors.boothEnd
                        ? <p id="tp-booth-end-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.boothEnd}</p>
                        : <p id="tp-booth-end-hint" className="mt-1 text-xs text-[var(--wf-ink-muted)]">Terisi otomatis dari tanggal event; sesuaikan bila perlu.</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <Label className={labelClass} htmlFor="tp-booth-products">
                        Produk atau jasa yang dijual <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </Label>
                      <Textarea
                        id="tp-booth-products"
                        rows={2}
                        className={`${inputClass} inline-block field-sizing-fixed`}
                        value={form.boothProducts}
                        onChange={(e) => setField('boothProducts', e.target.value)}
                        maxLength={1000}
                        placeholder="Contoh: aneka kopi kemasan 200gr dan merchandise"
                        aria-invalid={Boolean(fieldErrors.boothProducts)}
                        aria-describedby={fieldErrors.boothProducts ? 'tp-booth-products-err' : undefined}
                      />
                      {fieldErrors.boothProducts && <p id="tp-booth-products-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.boothProducts}</p>}
                    </div>
                    <div>
                      <Label className={labelClass} htmlFor="tp-booth-scheme">Skema booth</Label>
                      <NativeSelect id="tp-booth-scheme" className={nativeSelectClass} value={form.boothScheme} onChange={(e) => setField('boothScheme', e.target.value as TenantParticipationInput['boothScheme'])}>
                        {optionsFor('booth_scheme').map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div>
                      <Label className={labelClass} htmlFor="tp-booth-needs">Kebutuhan fasilitas</Label>
                      <Input id="tp-booth-needs" className={inputClass} value={form.boothNeeds} onChange={(e) => setField('boothNeeds', e.target.value)} maxLength={2000} placeholder="Contoh: listrik 1 titik, 2 meja" />
                    </div>
                  </div>
                </fieldset>
              )}

              {/* ── Voucher ── */}
              {includeVoucher && (
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--wf-ink-muted)]">
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" /> Data voucher
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className={labelClass} htmlFor="tp-voucher-type">Jenis voucher</Label>
                      <NativeSelect id="tp-voucher-type" className={nativeSelectClass} value={form.voucherType} onChange={(e) => setField('voucherType', e.target.value as TenantParticipationInput['voucherType'])}>
                        {optionsFor('voucher_type').map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div>
                      <Label className={labelClass} htmlFor="tp-voucher-format">Format voucher</Label>
                      <NativeSelect id="tp-voucher-format" className={nativeSelectClass} value={form.voucherFormat} onChange={(e) => setField('voucherFormat', e.target.value as TenantParticipationInput['voucherFormat'])}>
                        {optionsFor('voucher_format').map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div>
                      <Label className={labelClass} htmlFor="tp-voucher-quota">Kuota voucher (opsional)</Label>
                      <Input
                        id="tp-voucher-quota"
                        type="number"
                        min={0}
                        max={100000}
                        className={inputClass}
                        value={form.voucherQuota === '' ? '' : String(form.voucherQuota)}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setField('voucherQuota', raw === '' ? '' : Number(raw));
                        }}
                        placeholder="Contoh: 100"
                        aria-invalid={Boolean(fieldErrors.voucherQuota)}
                        aria-describedby={fieldErrors.voucherQuota ? 'tp-voucher-quota-err' : 'tp-voucher-quota-hint'}
                      />
                      {fieldErrors.voucherQuota
                        ? <p id="tp-voucher-quota-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.voucherQuota}</p>
                        : <p id="tp-voucher-quota-hint" className="mt-1 text-xs text-[var(--wf-ink-muted)]">Kosongkan bila tanpa batas kuota.</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <Label className={labelClass} htmlFor="tp-voucher-terms">
                        Ketentuan voucher <span className="text-rose-700 dark:text-rose-400" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
                      </Label>
                      <Textarea
                        id="tp-voucher-terms"
                        rows={3}
                        className={`${inputClass} inline-block field-sizing-fixed`}
                        value={form.voucherTerms}
                        onChange={(e) => setField('voucherTerms', e.target.value)}
                        maxLength={2000}
                        placeholder="Contoh: Diskon 20% untuk semua menu, minimum belanja Rp50.000, tidak berlaku dengan promo lain."
                        aria-invalid={Boolean(fieldErrors.voucherTerms)}
                        aria-describedby={fieldErrors.voucherTerms ? 'tp-voucher-terms-err' : undefined}
                      />
                      {fieldErrors.voucherTerms && <p id="tp-voucher-terms-err" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{fieldErrors.voucherTerms}</p>}
                    </div>
                  </div>
                </fieldset>
              )}

              {error && (
                <p role="alert" className="sm:col-span-2 text-sm text-rose-700 dark:text-rose-400">{error}</p>
              )}

              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  variant="ghost"
                  disabled={submitting || events.length === 0}
                  className={`${focusRing} inline-flex h-auto items-center gap-2 whitespace-normal! rounded-full! bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60`}
                >
                  <Send className="size-4" aria-hidden="true" />
                  {submitting ? 'Mengirim…' : 'Kirim pengajuan'}
                </Button>
                <p className="mt-2 text-xs text-[var(--wf-ink-muted)]">
                  Data kontak hanya dipakai tim Metropolitan Mall Bekasi untuk menindaklanjuti pengajuan ini.
                </p>
              </div>
            </form>
          )}
        </RevealSection>

        {/* ── Cek status ── */}
        <RevealSection aria-labelledby="status-title" className="mt-8 rounded-[var(--radius-card-lg)] border border-[var(--wf-rule)] bg-[var(--wf-board)] p-5 sm:p-6">
          <h2 id="status-title" className="flex items-center gap-2 font-display text-lg font-bold">
            <ClipboardCheck className="h-5 w-5" aria-hidden="true" /> Cek status pengajuan
          </h2>
          <p className="mt-2 text-sm ui-text-secondary">
            Masukkan kode pengajuan (format <span className="font-mono">TPR-XXXXXX</span>) dan nomor telepon yang dipakai saat mengajukan.
          </p>
          <form onSubmit={handleCheckStatus} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
            <div>
              <Label className={labelClass} htmlFor="tp-status-code">Kode pengajuan</Label>
              <Input
                id="tp-status-code"
                className={`${inputClass} font-mono uppercase`}
                value={statusCode}
                onChange={(e) => setStatusCode(e.target.value.toUpperCase())}
                maxLength={30}
                placeholder="TPR-XXXXXX"
                autoComplete="off"
                aria-invalid={Boolean(statusError)}
                aria-describedby={statusError ? 'tp-status-error' : undefined}
              />
            </div>
            <div>
              <Label className={labelClass} htmlFor="tp-status-phone">Nomor telepon</Label>
              <Input
                id="tp-status-phone"
                className={inputClass}
                value={statusPhone}
                onChange={(e) => setStatusPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                autoComplete="tel"
                aria-invalid={Boolean(statusError)}
                aria-describedby={statusError ? 'tp-status-error' : undefined}
              />
            </div>
            <Button
              type="submit"
              variant="ghost"
              disabled={statusChecking}
              className={`${focusRing} inline-flex h-auto items-center justify-center gap-2 whitespace-normal! rounded-full! border border-[var(--brand-tosca-600)] px-5 py-3 text-sm font-bold! text-[var(--brand-tosca-600)] transition hover:bg-[var(--wf-accent-soft)]! hover:text-[var(--brand-tosca-600)]! focus-visible:border-[var(--brand-tosca-600)]! dark:hover:bg-[var(--wf-accent-soft)]! dark:hover:text-[var(--brand-tosca-600)]! active:translate-y-0! disabled:opacity-60`}
            >
              <Search className="size-4" aria-hidden="true" />
              {statusChecking ? 'Memeriksa…' : 'Cek status'}
            </Button>
          </form>

          {statusError && (
            <p id="tp-status-error" role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-400">{statusError}</p>
          )}

          {statusResult && (
            <div
              role="status"
              aria-live="polite"
              aria-busy={statusChecking}
              className={`mt-4 rounded-[var(--radius-card)] border p-4 text-sm ${STATUS_TONE[statusResult.status]}`}
            >
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-bold">{STATUS_LABELS[statusResult.status]}</span>
                <span className="opacity-70">·</span>
                <span className="font-mono text-xs">{statusResult.code}</span>
              </p>
              <p className="mt-2 font-semibold">{statusResult.tenantName}</p>
              <p className="mt-0.5 text-xs opacity-80">
                {statusResult.eventTitle}
                {statusResult.eventDate && ` · ${statusResult.eventDate}`}
                {' · '}
                {statusResult.kind === 'booth' ? 'Open booth' : statusResult.kind === 'voucher' ? 'Voucher' : 'Booth + voucher'}
              </p>
              {statusResult.kind !== 'voucher' && statusResult.boothArea && (
                <p className="mt-2 text-xs opacity-90">
                  Booth: {statusResult.boothArea}
                  {statusResult.boothStart && ` · ${formatDateRange(statusResult.boothStart, statusResult.boothEnd || statusResult.boothStart)}`}
                </p>
              )}
              {statusResult.kind !== 'booth' && statusResult.voucherTerms && (
                <p className="mt-1 text-xs opacity-90 [overflow-wrap:anywhere]">Voucher: {statusResult.voucherTerms}</p>
              )}
              {statusResult.kind !== 'booth' && statusResult.voucherType && (
                <p className="mt-1 text-xs opacity-90">
                  Jenis voucher: {tenantParticipationOptionLabel('voucher_type', statusResult.voucherType, options)}
                  {' · '}
                  Format: {tenantParticipationOptionLabel('voucher_format', statusResult.voucherFormat, options)}
                </p>
              )}
              {statusResult.status === 'approved' && (
                <p className="mt-3 text-xs opacity-80">
                  Partisipasi kamu tampil di halaman event. Tim akan menghubungi PIC untuk detail teknis bila diperlukan.
                </p>
              )}
            </div>
          )}
        </RevealSection>
      </main>

      <footer className="border-t border-[var(--wf-rule)] py-8 text-center text-xs text-[var(--wf-ink-muted)]">
        &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &middot; Metland Coloring Life
      </footer>
    </div>
  );
}
