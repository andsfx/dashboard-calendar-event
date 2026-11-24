import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Copy, Handshake } from 'lucide-react';
import type {
  CollaborationContributionType, EstimatedParticipants, Exhibition, ExhibitionLeadInput,
  ExhibitionSlot, ExhibitionSubmissionResult, TechnicalNeed,
} from '../../types';
import { submitExhibitionLead } from '../../utils/api/exhibitionsApi';
import { validateEmail, validatePhone } from '../../utils/validation';
import { Button } from '../shadcn/button';
import { Checkbox } from '../shadcn/checkbox';
import { Input } from '../shadcn/input';
import { Label } from '../shadcn/label';
import { NativeSelect } from '../shadcn/native-select';
import { RadioGroup, RadioGroupItem } from '../shadcn/radio-group';
import { Textarea } from '../shadcn/textarea';

const CONTRIBUTION_OPTIONS: { value: CollaborationContributionType; title: string; hint: string }[] = [
  { value: 'pengisi_aktivasi', title: 'Pengisi Kegiatan / Aktivasi', hint: 'Mengisi acara seperti senam, kelas singkat, permainan, kopdar, demo, atau musik.' },
  { value: 'booth_umkm', title: 'Tenant / Booth UMKM', hint: 'Membuka meja atau booth untuk jualan makanan, minuman, atau produk lokal.' },
  { value: 'sponsor_hadiah', title: 'Sponsor / Support Hadiah', hint: 'Mendukung acara lewat produk, voucher, atau hadiah doorprize.' },
  { value: 'media_partner', title: 'Partner Publikasi', hint: 'Bantu publikasi dan liputan acara di media atau komunitas.' },
  { value: 'lainnya', title: 'Bentuk Kerja Sama Lainnya', hint: 'Punya ide kolaborasi lain yang ingin didiskusikan bersama tim.' },
];

const ORGANIZATION_OPTIONS = [
  { value: 'komunitas', label: 'Komunitas / Grup Hobi' },
  { value: 'umkm_brand', label: 'UMKM / Brand Lokal' },
  { value: 'event_organizer', label: 'Event Organizer (EO)' },
  { value: 'kampus_sekolah', label: 'Kampus / Sekolah' },
  { value: 'instansi_ngo', label: 'Instansi / Yayasan' },
  { value: 'lainnya', label: 'Perorangan / Lainnya' },
] as const;

const ESTIMATE_OPTIONS: { value: EstimatedParticipants; label: string }[] = [
  { value: 'under_15', label: 'Di bawah 15 orang' },
  { value: '15_to_30', label: '15 - 30 orang' },
  { value: '30_to_50', label: '30 - 50 orang' },
  { value: 'over_50', label: 'Lebih dari 50 orang' },
  { value: 'unsure', label: 'Belum pasti' },
];

const TECHNICAL_OPTIONS: { value: TechnicalNeed; label: string }[] = [
  { value: 'listrik', label: 'Akses listrik' },
  { value: 'area_teduh', label: 'Area teduh / tenda' },
  { value: 'sound_system', label: 'Sound system / mic' },
  { value: 'meja_kursi', label: 'Meja / kursi' },
  { value: 'tanpa_kebutuhan', label: 'Tidak ada kebutuhan khusus' },
];

const labelClass = 'mb-1.5 block! text-xs font-semibold leading-normal text-[var(--wf-ink-muted)]';
const inputClass = 'w-full rounded-[var(--radius-control)]! border border-[var(--wf-rule)]! bg-[var(--wf-board)]! px-4 py-3 text-sm text-[var(--wf-ink)] outline-none transition h-auto field-sizing-fixed! focus-visible:ring-2! focus-visible:ring-[var(--brand-tosca)]!';
const selectClass = 'w-full [&>select]:h-auto [&>select]:rounded-[var(--radius-control)]! [&>select]:border-[var(--wf-rule)]! [&>select]:bg-[var(--wf-board)]! [&>select]:py-3 [&>select]:pl-4 [&>select]:focus-visible:ring-2! [&>select]:focus-visible:ring-[var(--brand-tosca)]!';
const ctaClass = 'h-auto items-center gap-2 rounded-full bg-[var(--wf-accent)]! px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0!';

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function longDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  const monthName = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][month - 1] ?? '';
  return `${WEEKDAYS[date.getDay()] ?? ''}, ${day} ${monthName} ${year}`.trim();
}

/** Slot yang masih bisa dipilih calon mitra. */
function isSelectable(slot: ExhibitionSlot): boolean {
  return slot.slotStatus === 'open' || slot.slotStatus === 'limited';
}

function slotOptionLabel(slot: ExhibitionSlot): string {
  const status = slot.slotStatus === 'limited' ? 'Tersisa 1 Slot' : 'Slot Tersedia';
  return `${longDate(slot.slotDate)} (${slot.startTime} - ${slot.endTime} WIB) - ${status}`;
}

function initialForm(exhibition: Exhibition): ExhibitionLeadInput {
  const fallbackType = exhibition.defaultOrganizationType;
  return {
    exhibitionId: exhibition.id,
    programSlug: exhibition.slug,
    organizationName: '',
    organizationType: fallbackType === 'brand' || fallbackType === 'eo' ? 'komunitas' : fallbackType,
    socialMediaHandle: '',
    contributionType: 'pengisi_aktivasi',
    conceptDescription: '',
    preferredSlotId: '',
    preferredDateNote: '',
    flexibleDate: false,
    estimatedParticipants: null,
    technicalNeeds: [],
    technicalNeedsNote: '',
    contactName: '',
    phone: '',
    email: '',
  };
}

interface Props {
  exhibition: Exhibition;
  slots: ExhibitionSlot[];
  chosenSlotId: string;
}

export function CollaborationForm({ exhibition, slots, chosenSlotId }: Props) {
  const [form, setForm] = useState<ExhibitionLeadInput>(() => initialForm(exhibition));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExhibitionSubmissionResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!chosenSlotId) return;
    setForm(prev => ({ ...prev, preferredSlotId: chosenSlotId, flexibleDate: false }));
  }, [chosenSlotId]);

  const selectableSlots = slots.filter(isSelectable);
  const allowed = exhibition.formConfig.allowed_contributions;
  const contributionOptions = allowed && allowed.length > 0
    ? CONTRIBUTION_OPTIONS.filter(option => allowed.includes(option.value))
    : CONTRIBUTION_OPTIONS;
  const showEstimate = exhibition.formConfig.show_participant_estimate !== false;
  const showTechnical = exhibition.formConfig.show_technical_needs !== false;
  const conceptPlaceholder = exhibition.formConfig.concept_placeholder
    || (exhibition.programType === 'aktivasi_marcomm'
      ? 'Contoh: Kami komunitas olahraga santai ingin mengadakan senam bersama 45 menit, terbuka untuk umum dan keluarga.'
      : 'Contoh: Kami ingin mengadakan kelas merangkai bunga 60 menit untuk 25 peserta di area pameran.');

  const set = <K extends keyof ExhibitionLeadInput>(key: K, value: ExhibitionLeadInput[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleTechnical = (need: TechnicalNeed, checked: boolean) => {
    setForm(prev => {
      if (need === 'tanpa_kebutuhan') {
        return { ...prev, technicalNeeds: checked ? ['tanpa_kebutuhan'] : [] };
      }
      const withoutNone = prev.technicalNeeds.filter(item => item !== 'tanpa_kebutuhan');
      return {
        ...prev,
        technicalNeeds: checked
          ? [...withoutNone, need]
          : withoutNone.filter(item => item !== need),
      };
    });
  };

  const selectedSlot = slots.find(slot => slot.id === form.preferredSlotId) ?? null;

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (form.organizationName.trim().length < 3) errors.organizationName = 'Mohon isi nama komunitas, brand, atau tim Anda.';
    if (!form.preferredSlotId && !form.flexibleDate) {
      errors.preferredSlotId = 'Mohon pilih salah satu tanggal yang tersedia atau pilih tanggal fleksibel.';
    }
    if (form.conceptDescription.trim().length < 20) {
      errors.conceptDescription = 'Ceritakan sedikit lebih jelas rencana kegiatan Anda (minimal 20 karakter).';
    }
    if (form.contactName.trim().length < 3) errors.contactName = 'Mohon isi nama penanggung jawab (PIC).';
    if (!validatePhone(form.phone).valid) {
      errors.phone = 'Mohon masukkan nomor WhatsApp Indonesia yang valid (contoh: 081234567890).';
    }
    if (form.email.trim() && !validateEmail(form.email).valid) {
      errors.email = 'Format email belum sesuai, mohon periksa kembali.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitError('');
    setSubmitting(true);
    try {
      const submission = await submitExhibitionLead({
        ...form,
        preferredSlotId: form.flexibleDate ? '' : form.preferredSlotId,
      });
      setResult(submission);
    } catch (err) {
      setSubmitError(err instanceof Error
        ? err.message
        : 'Maaf, pengajuan belum berhasil terkirim. Mohon periksa koneksi internet Anda lalu coba kirim ulang.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (!result?.referenceCode) return;
    try {
      await navigator.clipboard.writeText(result.referenceCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (result) {
    return (
      <div className="mt-4 rounded-xl bg-[var(--wf-accent-soft)] p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand-tosca-600)]" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-[var(--wf-ink)]">Pengajuan Anda Sudah Kami Terima!</h3>
            <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">Simpan kode ini untuk menanyakan status pengajuan.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-[var(--wf-board)] px-4 py-2 font-mono text-base font-bold tracking-wide text-[var(--brand-tosca-600)]">
                {result.referenceCode || 'Kode belum tersedia'}
              </span>
              {result.referenceCode && (
                <Button type="button" variant="outline" onClick={copyCode} className="h-auto rounded-full px-3 py-2 text-sm active:translate-y-0">
                  <Copy className="h-4 w-4" aria-hidden="true" /> {copied ? 'Tersalin' : 'Salin Kode'}
                </Button>
              )}
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-[var(--wf-ink-muted)]">Komunitas / usaha</dt><dd className="font-semibold">{form.organizationName}</dd></div>
              <div><dt className="text-[var(--wf-ink-muted)]">Program</dt><dd className="font-semibold">{exhibition.title}</dd></div>
              <div><dt className="text-[var(--wf-ink-muted)]">Tanggal pilihan</dt><dd className="font-semibold">{selectedSlot ? longDate(selectedSlot.slotDate) : 'Tanggal fleksibel'}</dd></div>
              <div><dt className="text-[var(--wf-ink-muted)]">WhatsApp</dt><dd className="font-semibold">{form.phone}</dd></div>
            </dl>
            <div className="mt-4 rounded-xl bg-[var(--wf-board)] p-4">
              <h4 className="text-sm font-bold">Apa langkah selanjutnya?</h4>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--wf-ink-muted)]">
                <li>Tim Metropolitan Mall Bekasi meninjau konsep kegiatan Anda (maksimal 2-3 hari kerja).</li>
                <li>Kami akan menghubungi PIC melalui WhatsApp untuk konfirmasi jadwal dan teknis lapangan.</li>
                <li>Setelah disepakati, kegiatan Anda akan masuk ke jadwal resmi Agenda Aktivasi.</li>
              </ol>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="ghost" className={ctaClass}>
                <Link to="/kolaborasi">Kembali ke Daftar Program</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setResult(null); setForm(initialForm(exhibition)); setCopied(false); }}
                className="h-auto rounded-full px-4 py-2 text-sm font-semibold active:translate-y-0"
              >
                Ajukan Kolaborasi Lainnya
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-6" noValidate>
      <fieldset className="rounded-xl border border-[var(--wf-rule)] p-4 sm:p-5">
        <legend className="px-2 font-display text-base font-bold">1. Tentang Komunitas atau Usaha Anda</legend>
        <div className="mt-3 space-y-4">
          <div>
            <Label htmlFor="kolaborasi-org" className={labelClass}>
              Nama komunitas, brand, atau tim <span className="text-[var(--brand-pink-600)]" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </Label>
            <Input
              id="kolaborasi-org"
              className={inputClass}
              value={form.organizationName}
              onChange={e => set('organizationName', e.target.value)}
              placeholder="Contoh: Komunitas Senam Bekasi, Kopi Pagi, atau nama pribadi"
              aria-invalid={!!fieldErrors.organizationName}
              aria-describedby={fieldErrors.organizationName ? 'kolaborasi-org-err' : 'kolaborasi-org-hint'}
            />
            <p id="kolaborasi-org-hint" className="mt-1 text-xs text-[var(--wf-ink-muted)]">Tulis nama grup, komunitas, UMKM, atau organisasi Anda.</p>
            {fieldErrors.organizationName && <p id="kolaborasi-org-err" className="mt-1 text-xs text-[var(--wf-danger)]" role="alert">{fieldErrors.organizationName}</p>}
          </div>

          <div>
            <Label htmlFor="kolaborasi-org-type" className={labelClass}>
              Anda mendaftar sebagai <span className="text-[var(--brand-pink-600)]" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </Label>
            <NativeSelect
              id="kolaborasi-org-type"
              className={selectClass}
              value={form.organizationType}
              onChange={e => set('organizationType', e.target.value as ExhibitionLeadInput['organizationType'])}
            >
              {ORGANIZATION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </NativeSelect>
          </div>

          <div>
            <Label htmlFor="kolaborasi-social" className={labelClass}>Akun Instagram atau media sosial (opsional)</Label>
            <Input
              id="kolaborasi-social"
              className={inputClass}
              value={form.socialMediaHandle}
              onChange={e => set('socialMediaHandle', e.target.value)}
              placeholder="Contoh: @komunitasbekasi atau link TikTok"
              aria-describedby="kolaborasi-social-hint"
            />
            <p id="kolaborasi-social-hint" className="mt-1 text-xs text-[var(--wf-ink-muted)]">Bantu tim kami mengenal kegiatan Anda lebih cepat.</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-[var(--wf-rule)] p-4 sm:p-5">
        <legend className="px-2 font-display text-base font-bold">2. Rencana Kegiatan yang Ingin Diisi</legend>
        <div className="mt-3 space-y-5">
          <div>
            <p className={labelClass}>
              Ingin berpartisipasi sebagai apa? <span className="text-[var(--brand-pink-600)]" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </p>
            <RadioGroup
              value={form.contributionType}
              onValueChange={value => set('contributionType', value as CollaborationContributionType)}
              className="grid gap-2 sm:grid-cols-2"
            >
              {contributionOptions.map(option => (
                <label key={option.value} htmlFor={`kolaborasi-contribution-${option.value}`} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-3 hover:border-[var(--wf-rule-strong)]">
                  <RadioGroupItem id={`kolaborasi-contribution-${option.value}`} value={option.value} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--wf-ink)]">{option.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-[var(--wf-ink-muted)]">{option.hint}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="kolaborasi-slot" className={labelClass}>
              Pilih tanggal yang diminati <span className="text-[var(--brand-pink-600)]" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </Label>
            <NativeSelect
              id="kolaborasi-slot"
              className={selectClass}
              value={form.flexibleDate ? 'fleksibel' : form.preferredSlotId}
              onChange={e => {
                const value = e.target.value;
                if (value === 'fleksibel') {
                  setForm(prev => ({ ...prev, preferredSlotId: '', flexibleDate: true }));
                } else {
                  setForm(prev => ({ ...prev, preferredSlotId: value, flexibleDate: false }));
                }
              }}
              aria-invalid={!!fieldErrors.preferredSlotId}
              aria-describedby={fieldErrors.preferredSlotId ? 'kolaborasi-slot-err' : undefined}
            >
              <option value="">Pilih tanggal...</option>
              {selectableSlots.map(slot => (
                <option key={slot.id} value={slot.id}>{slotOptionLabel(slot)}</option>
              ))}
              <option value="fleksibel">Tanggal fleksibel / diskusikan dengan tim nanti</option>
            </NativeSelect>
            {form.flexibleDate && (
              <div className="mt-2">
                <Label htmlFor="kolaborasi-date-note" className={labelClass}>Catatan tanggal (opsional)</Label>
                <Input
                  id="kolaborasi-date-note"
                  className={inputClass}
                  value={form.preferredDateNote}
                  onChange={e => set('preferredDateNote', e.target.value)}
                  placeholder="Contoh: Bebas di bulan Desember"
                />
              </div>
            )}
            {fieldErrors.preferredSlotId && <p id="kolaborasi-slot-err" className="mt-1 text-xs text-[var(--wf-danger)]" role="alert">{fieldErrors.preferredSlotId}</p>}
          </div>

          <div>
            <Label htmlFor="kolaborasi-concept" className={labelClass}>
              Ceritakan rencana kegiatan Anda <span className="text-[var(--brand-pink-600)]" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </Label>
            <Textarea
              id="kolaborasi-concept"
              rows={4}
              className={inputClass}
              value={form.conceptDescription}
              onChange={e => set('conceptDescription', e.target.value)}
              placeholder={conceptPlaceholder}
              aria-invalid={!!fieldErrors.conceptDescription}
              aria-describedby={fieldErrors.conceptDescription ? 'kolaborasi-concept-err' : 'kolaborasi-concept-hint'}
            />
            <p id="kolaborasi-concept-hint" className="mt-1 text-xs text-[var(--wf-ink-muted)]">Tidak perlu bahasa formal. Cukup tulis kegiatannya apa dan kira-kira berapa lama.</p>
            {fieldErrors.conceptDescription && <p id="kolaborasi-concept-err" className="mt-1 text-xs text-[var(--wf-danger)]" role="alert">{fieldErrors.conceptDescription}</p>}
          </div>

          {showEstimate && (
            <div>
              <p className={labelClass}>Perkiraan jumlah anggota atau peserta</p>
              <RadioGroup
                value={form.estimatedParticipants ?? ''}
                onValueChange={value => set('estimatedParticipants', (value || null) as EstimatedParticipants | null)}
                className="flex flex-wrap gap-2"
              >
                {ESTIMATE_OPTIONS.map(option => (
                  <label key={option.value} htmlFor={`kolaborasi-estimate-${option.value}`} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-1.5 text-sm">
                    <RadioGroupItem id={`kolaborasi-estimate-${option.value}`} value={option.value} />
                    <span>{option.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {showTechnical && (
            <div>
              <p className={labelClass}>Kebutuhan dasar di lokasi</p>
              <div className="flex flex-wrap gap-2">
                {TECHNICAL_OPTIONS.map(option => (
                  <label key={option.value} htmlFor={`kolaborasi-need-${option.value}`} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-1.5 text-sm">
                    <Checkbox
                      id={`kolaborasi-need-${option.value}`}
                      checked={form.technicalNeeds.includes(option.value)}
                      onCheckedChange={checked => toggleTechnical(option.value, checked === true)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2">
                <Label htmlFor="kolaborasi-needs-note" className={labelClass}>Catatan tambahan (opsional)</Label>
                <Input
                  id="kolaborasi-needs-note"
                  className={inputClass}
                  value={form.technicalNeedsNote}
                  onChange={e => set('technicalNeedsNote', e.target.value)}
                  placeholder="Misal: butuh area datar untuk 20 matras."
                />
              </div>
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-[var(--wf-rule)] p-4 sm:p-5">
        <legend className="px-2 font-display text-base font-bold">3. Kontak Penanggung Jawab (PIC)</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="kolaborasi-pic" className={labelClass}>
              Nama lengkap PIC <span className="text-[var(--brand-pink-600)]" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </Label>
            <Input
              id="kolaborasi-pic"
              className={inputClass}
              value={form.contactName}
              onChange={e => set('contactName', e.target.value)}
              placeholder="Nama orang yang bisa kami hubungi"
              aria-invalid={!!fieldErrors.contactName}
              aria-describedby={fieldErrors.contactName ? 'kolaborasi-pic-err' : undefined}
            />
            {fieldErrors.contactName && <p id="kolaborasi-pic-err" className="mt-1 text-xs text-[var(--wf-danger)]" role="alert">{fieldErrors.contactName}</p>}
          </div>
          <div>
            <Label htmlFor="kolaborasi-phone" className={labelClass}>
              Nomor WhatsApp aktif <span className="text-[var(--brand-pink-600)]" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </Label>
            <Input
              id="kolaborasi-phone"
              type="tel"
              inputMode="tel"
              className={inputClass}
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="081234567890"
              aria-invalid={!!fieldErrors.phone}
              aria-describedby={fieldErrors.phone ? 'kolaborasi-phone-err' : 'kolaborasi-phone-hint'}
            />
            <p id="kolaborasi-phone-hint" className="mt-1 text-xs text-[var(--wf-ink-muted)]">Tim kami akan menghubungi nomor ini untuk konfirmasi jadwal dan teknis.</p>
            {fieldErrors.phone && <p id="kolaborasi-phone-err" className="mt-1 text-xs text-[var(--wf-danger)]" role="alert">{fieldErrors.phone}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="kolaborasi-email" className={labelClass}>Alamat email (opsional)</Label>
            <Input
              id="kolaborasi-email"
              type="email"
              className={inputClass}
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="nama@email.com"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'kolaborasi-email-err' : 'kolaborasi-email-hint'}
            />
            <p id="kolaborasi-email-hint" className="mt-1 text-xs text-[var(--wf-ink-muted)]">Opsional, dipakai jika perlu pengiriman surat atau jadwal tertulis.</p>
            {fieldErrors.email && <p id="kolaborasi-email-err" className="mt-1 text-xs text-[var(--wf-danger)]" role="alert">{fieldErrors.email}</p>}
          </div>
        </div>
      </fieldset>

      <div className="rounded-xl bg-[var(--wf-board-2)] p-4">
        <p className="text-xs leading-5 text-[var(--wf-ink-muted)]">
          Data kontak Anda aman dan hanya digunakan oleh tim Metropolitan Mall Bekasi untuk menindaklanjuti pengajuan kolaborasi ini.
        </p>
        {submitError && <p role="alert" className="mt-2 text-sm text-[var(--wf-danger)]">{submitError}</p>}
        <Button type="submit" disabled={submitting} className={`mt-3 w-full sm:w-auto ${ctaClass} disabled:opacity-60`}>
          <Handshake className="h-4 w-4" aria-hidden="true" />
          {submitting ? 'Sedang mengirim pengajuan...' : 'Kirim Pengajuan Kolaborasi'}
        </Button>
      </div>
    </form>
  );
}
