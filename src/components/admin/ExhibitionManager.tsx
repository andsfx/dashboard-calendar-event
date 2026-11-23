import { useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, CheckCircle2, Link2, MessageCircle, Plus, Send, Trash2, Unlink, Users } from 'lucide-react';
import { Button } from '../shadcn/button';
import { Checkbox } from '../shadcn/checkbox';
import { Input } from '../shadcn/input';
import { Label } from '../shadcn/label';
import { NativeSelect } from '../shadcn/native-select';
import { Textarea } from '../shadcn/textarea';
import type {
  EventItem, Exhibition, ExhibitionActivation, ExhibitionInput, ExhibitionLead,
  ExhibitionOrganizationType, ExhibitionProgramStatus, ExhibitionSlot, ExhibitionSlotStatus,
} from '../../types';
import type { AdminExhibition, CollaborationReviewPatch, ExhibitionSlotInput } from '../../utils/api/exhibitionsApi';
import { formatDateRange } from '../../utils/eventUtils';

const PUBLICATION_LABELS: Record<Exhibition['publication'], string> = {
  draft: 'Draf internal',
  published: 'Tayang publik',
  archived: 'Diarsipkan',
};

const PROGRAM_STATUS_LABELS: Record<ExhibitionProgramStatus, string> = {
  draft: 'Draft',
  open: 'Dibuka untuk Kolaborasi',
  full: 'Slot Penuh',
  ongoing: 'Sedang Berlangsung',
  completed: 'Selesai',
  archived: 'Diarsipkan',
};

const SLOT_STATUS_LABELS: Record<ExhibitionSlotStatus, string> = {
  open: 'Slot Tersedia',
  limited: 'Tersisa 1 Slot',
  full: 'Penuh',
  closed: 'Ditutup',
};

const LEAD_STATUS_LABELS: Record<ExhibitionLead['status'], string> = {
  submitted: 'Baru Masuk',
  in_review: 'Sedang Ditinjau',
  need_info: 'Perlu Info Tambahan',
  approved: 'Disetujui',
  scheduled: 'Terjadwal & Tayang',
  completed: 'Selesai',
  rejected: 'Belum Sesuai',
  cancelled: 'Dibatalkan',
};

const LEAD_STATUSES = [
  'submitted', 'in_review', 'need_info', 'approved', 'scheduled', 'completed', 'rejected', 'cancelled',
] as const satisfies readonly ExhibitionLead['status'][];

const CONTRIBUTION_LABELS: Record<ExhibitionLead['contributionType'], string> = {
  pengisi_aktivasi: 'Pengisi aktivitas',
  booth_umkm: 'Booth UMKM',
  sponsor_hadiah: 'Sponsor hadiah',
  media_partner: 'Partner publikasi',
  lainnya: 'Kerja sama lain',
};

const ORGANIZATION_LABELS: Record<ExhibitionOrganizationType, string> = {
  komunitas: 'Komunitas / grup hobi',
  umkm_brand: 'UMKM / brand lokal',
  event_organizer: 'Event organizer',
  kampus_sekolah: 'Kampus / sekolah',
  instansi_ngo: 'Instansi / yayasan',
  lainnya: 'Perorangan / lainnya',
  brand: 'Brand',
  eo: 'EO',
};

const ESTIMATE_LABELS: Record<string, string> = {
  under_15: 'Di bawah 15 orang',
  '15_to_30': '15 - 30 orang',
  '30_to_50': '30 - 50 orang',
  over_50: 'Lebih dari 50 orang',
  unsure: 'Belum pasti',
};

const EMPTY_FORM: ExhibitionInput = {
  title: '', slug: '', subtitle: '', programType: 'pameran', theme: '', description: '',
  location: '', dateStart: '', dateEnd: '', scheduleNote: '',
  targetAudience: 'Terbuka untuk umum (semua usia)', collaborationBrief: '',
  lookingForSummary: '', lookingForTags: [], benefits: [], coverImageUrl: '',
  leasingPic: '', marcommPic: '', publication: 'draft', status: 'draft',
  isFeatured: false, acceptingApplications: false, defaultOrganizationType: 'komunitas',
  formConfig: {},
};

const inputClass = 'w-full rounded-[var(--radius-control)] border border-[var(--wf-rule)] bg-[var(--wf-board)] h-auto px-3 py-2 text-sm text-[var(--wf-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]';
const labelClass = 'mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]';

function benefitsToText(input: ExhibitionInput): string {
  return input.benefits.map(item => `${item.title}${item.description ? ` | ${item.description}` : ''}`).join('\n');
}

function textToBenefits(text: string): ExhibitionInput['benefits'] {
  return text.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 8).map(line => {
    const [title = '', description = ''] = line.split('|').map(part => part.trim());
    return { title, description };
  }).filter(item => item.title.length > 0);
}

function whatsAppMessage(lead: ExhibitionLead, programTitle: string, slotLabel: string): string {
  const header = `Halo Kak ${lead.contactName}, kami dari tim Metmal Community Space (Metropolitan Mall Bekasi).`;
  if (lead.status === 'need_info') {
    return `${header} Terima kasih sudah mengajukan kolaborasi "${programTitle}" untuk ${lead.organizationName} (Kode: ${lead.referenceCode}). Ada beberapa detail kecil yang ingin kami diskusikan sebelum penjadwalan. Kapan waktu yang nyaman untuk mengobrol sebentar?`;
  }
  if (lead.status === 'approved' || lead.status === 'scheduled') {
    return `${header} Kabar baik! Pengajuan kolaborasi ${lead.organizationName} untuk "${programTitle}" (Kode: ${lead.referenceCode})${slotLabel ? ` pada ${slotLabel}` : ''} sudah kami setujui. Mari kita lanjut koordinasi teknis lapangan di sini ya.`;
  }
  if (lead.status === 'rejected' || lead.status === 'cancelled') {
    return `${header} Terima kasih sudah mengajukan kolaborasi ${lead.organizationName} untuk "${programTitle}" (Kode: ${lead.referenceCode}). Untuk periode ini slot dan konsep belum dapat kami jadwalkan. Data komunitas Anda tetap kami simpan untuk peluang kolaborasi berikutnya di Metropolitan Mall Bekasi.`;
  }
  return `${header} Kami sudah menerima pengajuan kolaborasi "${programTitle}" untuk ${lead.organizationName} (Kode: ${lead.referenceCode}). Tim kami sedang meninjau konsep Anda dan akan menghubungi kembali di nomor ini.`;
}

function whatsAppHref(lead: ExhibitionLead, programTitle: string, slotLabel: string): string {
  const digits = lead.phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(whatsAppMessage(lead, programTitle, slotLabel))}`;
}

interface Props {
  exhibitions: AdminExhibition[];
  leads: ExhibitionLead[];
  activations: ExhibitionActivation[];
  slots: ExhibitionSlot[];
  events: EventItem[];
  isLoading: boolean;
  error: string;
  canDelete: boolean;
  onSave: (input: ExhibitionInput, id?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onReviewLead: (id: string, patch: CollaborationReviewPatch) => Promise<boolean>;
  onPublishLead: (id: string) => Promise<boolean>;
  onSaveSlot: (exhibitionId: string, input: ExhibitionSlotInput, id?: string) => Promise<boolean>;
  onDeleteSlot: (id: string) => Promise<boolean>;
  onGenerateSlots: (exhibitionId: string) => Promise<boolean>;
  onLinkActivation: (exhibitionId: string, eventId: string) => Promise<boolean>;
  onUnlinkActivation: (eventId: string) => Promise<boolean>;
  onConfirm: (options: { title: string; message: string; subject?: string; confirmLabel?: string }) => Promise<boolean>;
  /** Akun demo: hanya melihat. Form & tombol mutasi disembunyikan (backend juga menolak). */
  readOnly?: boolean;
}

export function ExhibitionManager({
  exhibitions, leads, activations, slots, events, isLoading, error, canDelete,
  onSave, onDelete, onReviewLead, onPublishLead, onSaveSlot, onDeleteSlot, onGenerateSlots,
  onLinkActivation, onUnlinkActivation, onConfirm, readOnly = false,
}: Props) {
  const [form, setForm] = useState<ExhibitionInput>(EMPTY_FORM);
  const [benefitsText, setBenefitsText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [linkEventId, setLinkEventId] = useState('');
  const [slotForm, setSlotForm] = useState<ExhibitionSlotInput>({
    slotDate: '', startTime: '06:30', endTime: '10:00', zoneName: 'Area Utama', capacity: 3,
    slotStatus: 'open', publicNote: '',
  });
  const [editingSlotId, setEditingSlotId] = useState('');
  const [editingId, setEditingId] = useState('');

  const selected = exhibitions.find(item => item.id === selectedId) || null;
  const selectedLeads = useMemo(
    () => (selected ? leads.filter(lead => lead.exhibitionId === selected.id) : []),
    [leads, selected],
  );
  const selectedSlots = useMemo(
    () => (selected ? slots.filter(slot => slot.exhibitionId === selected.id) : []),
    [slots, selected],
  );
  const eligibleEvents = useMemo(() => {
    if (!selected) return [];
    return events.filter(ev => {
      const end = ev.dateEnd || ev.dateStr;
      return ev.dateStr >= selected.dateStart && end <= selected.dateEnd;
    });
  }, [events, selected]);

  const resetForm = () => {
    setEditingId('');
    setForm(EMPTY_FORM);
    setBenefitsText('');
    setTagsText('');
    setFormError('');
  };

  const startEdit = (exhibition: AdminExhibition) => {
    setEditingId(exhibition.id);
    setSelectedId(exhibition.id);
    setFormError('');
    setForm({
      title: exhibition.title, slug: exhibition.slug, subtitle: exhibition.subtitle,
      programType: exhibition.programType, theme: exhibition.theme, description: exhibition.description,
      location: exhibition.location, dateStart: exhibition.dateStart, dateEnd: exhibition.dateEnd,
      scheduleNote: exhibition.scheduleNote, targetAudience: exhibition.targetAudience,
      collaborationBrief: exhibition.collaborationBrief, lookingForSummary: exhibition.lookingForSummary,
      lookingForTags: exhibition.lookingForTags, benefits: exhibition.benefits,
      coverImageUrl: exhibition.coverImageUrl, leasingPic: exhibition.leasingPic,
      marcommPic: exhibition.marcommPic, publication: exhibition.publication, status: exhibition.status,
      isFeatured: exhibition.isFeatured, acceptingApplications: exhibition.acceptingApplications,
      defaultOrganizationType: exhibition.defaultOrganizationType, formConfig: exhibition.formConfig,
    });
    setBenefitsText(benefitsToText(exhibition));
    setTagsText(exhibition.lookingForTags.join(', '));
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (form.title.trim().length < 3) { setFormError('Nama program minimal 3 karakter'); return; }
    if (!form.dateStart || !form.dateEnd) { setFormError('Periode program wajib diisi'); return; }
    if (form.dateEnd < form.dateStart) { setFormError('Tanggal selesai tidak boleh sebelum tanggal mulai'); return; }

    const payload: ExhibitionInput = {
      ...form,
      benefits: textToBenefits(benefitsText),
      lookingForTags: tagsText.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 12),
    };
    setFormError('');
    setIsSubmitting(true);
    const ok = await onSave(payload, editingId || undefined);
    setIsSubmitting(false);
    if (ok) resetForm();
  };

  const handleDelete = async (exhibition: AdminExhibition) => {
    const ok = await onConfirm({
      title: 'Hapus program kolaborasi?',
      message: 'Pengajuan, slot, dan tautan aktivasi program ini ikut terhapus. Event di kalender tidak dihapus.',
      subject: exhibition.title,
    });
    if (!ok) return;
    const removed = await onDelete(exhibition.id);
    if (removed && selectedId === exhibition.id) setSelectedId('');
  };

  const handleUnlink = async (eventId: string, title: string) => {
    const ok = await onConfirm({
      title: 'Lepas event aktivasi?',
      message: 'Event tetap ada di kalender, hanya tautan ke program yang dilepas.',
      subject: title,
      confirmLabel: 'Lepas',
    });
    if (ok) await onUnlinkActivation(eventId);
  };

  const resetSlotForm = (exhibition: AdminExhibition | null) => {
    setEditingSlotId('');
    setSlotForm({
      slotDate: '', startTime: '06:30', endTime: '10:00',
      zoneName: exhibition?.location || 'Area Utama', capacity: 3,
      slotStatus: 'open', publicNote: '',
    });
  };

  const submitSlot = async (exhibition: AdminExhibition) => {
    if (!slotForm.slotDate) { setFormError('Tanggal slot wajib diisi'); return; }
    const ok = await onSaveSlot(exhibition.id, slotForm, editingSlotId || undefined);
    if (ok) resetSlotForm(exhibition);
  };

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-[var(--radius-card)] border border-[var(--wf-danger)]/30 bg-[var(--wf-danger)]/10 px-4 py-3 text-sm text-[var(--wf-danger)]">
          {error}
        </p>
      )}

      {!readOnly && (
        <form onSubmit={handleSubmit} className="ui-dashboard-surface space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-[var(--wf-ink)]">
              {editingId ? 'Ubah Program Kolaborasi' : 'Program Kolaborasi Baru'}
            </h2>
            {editingId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetForm}
              >
                Buat program baru
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="exh-title" className={labelClass}>
                Nama program <span className="text-[var(--wf-danger)]" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
              </Label>
              <Input id="exh-title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Sarapan di Metmal" className={inputClass} />
            </div>
            <div>
              <Label htmlFor="exh-slug" className={labelClass}>Alamat halaman</Label>
              <Input id="exh-slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="sarapan-di-metmal" className={inputClass} />
            </div>
            <div>
              <Label htmlFor="exh-subtitle" className={labelClass}>Subjudul</Label>
              <Input id="exh-subtitle" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="exh-program-type" className={labelClass}>Jenis program</Label>
              <NativeSelect id="exh-program-type" value={form.programType} onChange={e => setForm({ ...form, programType: e.target.value as Exhibition['programType'] })} className="w-full">
                <option value="aktivasi_marcomm">Aktivasi Marcomm</option>
                <option value="pameran">Pameran</option>
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="exh-status" className={labelClass}>Status siklus</Label>
              <NativeSelect id="exh-status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ExhibitionProgramStatus })} className="w-full">
                {Object.entries(PROGRAM_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="exh-theme" className={labelClass}>Tema</Label>
              <Input id="exh-theme" value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="exh-location" className={labelClass}>Lokasi</Label>
              <Input id="exh-location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass} htmlFor="exh-start">
                Mulai <span className="text-[var(--wf-danger)]" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
              </Label>
              <Input id="exh-start" type="date" className={inputClass} value={form.dateStart} onChange={e => setForm({ ...form, dateStart: e.target.value })} />
            </div>
            <div>
              <Label className={labelClass} htmlFor="exh-end">
                Selesai <span className="text-[var(--wf-danger)]" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
              </Label>
              <Input id="exh-end" type="date" className={inputClass} value={form.dateEnd} onChange={e => setForm({ ...form, dateEnd: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="exh-schedule" className={labelClass}>Jadwal rutin</Label>
              <Input id="exh-schedule" value={form.scheduleNote} onChange={e => setForm({ ...form, scheduleNote: e.target.value })} placeholder="Setiap hari Minggu, 06.30 - 10.00 WIB" className={inputClass} />
            </div>
            <div>
              <Label htmlFor="exh-audience" className={labelClass}>Sasaran pengunjung</Label>
              <Input id="exh-audience" value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="exh-default-org" className={labelClass}>Jenis pendaftar default</Label>
              <NativeSelect id="exh-default-org" value={form.defaultOrganizationType} onChange={e => setForm({ ...form, defaultOrganizationType: e.target.value as ExhibitionOrganizationType })} className="w-full">
                <option value="komunitas">Komunitas / grup hobi</option>
                <option value="umkm_brand">UMKM / brand lokal</option>
                <option value="event_organizer">Event organizer</option>
                <option value="kampus_sekolah">Kampus / sekolah</option>
                <option value="instansi_ngo">Instansi / yayasan</option>
                <option value="lainnya">Perorangan / lainnya</option>
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="exh-publication" className={labelClass}>Publikasi</Label>
              <NativeSelect
                id="exh-publication"
                value={form.publication}
                onChange={e => {
                  const next = e.target.value;
                  if (next in PUBLICATION_LABELS) setForm({ ...form, publication: next as Exhibition['publication'] });
                }}
                className="w-full"
              >
                {Object.entries(PUBLICATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="exh-description" className={labelClass}>Deskripsi publik</Label>
              <Textarea id="exh-description" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="exh-summary" className={labelClass}>Ringkasan "Siapa yang Kami Cari?"</Label>
              <Textarea id="exh-summary" rows={2} value={form.lookingForSummary} onChange={e => setForm({ ...form, lookingForSummary: e.target.value })} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="exh-tags" className={labelClass}>Kategori minat (pisahkan dengan koma)</Label>
              <Input id="exh-tags" value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="Olahraga & Senam Santai, UMKM Sarapan & Kopi" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="exh-benefits" className={labelClass}>Yang didapatkan mitra (satu baris per poin, format: Judul | Deskripsi)</Label>
              <Textarea id="exh-benefits" rows={3} value={benefitsText} onChange={e => setBenefitsText(e.target.value)} placeholder="Arus pengunjung pagi | Komunitas menjangkau keluarga peserta Morning Sale." className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="exh-brief" className={labelClass}>Kebutuhan kolaborasi (teks lama)</Label>
              <Textarea id="exh-brief" rows={2} value={form.collaborationBrief} onChange={e => setForm({ ...form, collaborationBrief: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="exh-leasing" className={labelClass}>PIC Casual Leasing</Label>
              <Input id="exh-leasing" value={form.leasingPic} onChange={e => setForm({ ...form, leasingPic: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="exh-marcomm" className={labelClass}>PIC Marcomm</Label>
              <Input id="exh-marcomm" value={form.marcommPic} onChange={e => setForm({ ...form, marcommPic: e.target.value })} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="exh-concept-placeholder" className={labelClass}>Contoh isian formulir kegiatan</Label>
              <Textarea
                id="exh-concept-placeholder"
                rows={2}
                value={form.formConfig.concept_placeholder || ''}
                onChange={e => setForm({ ...form, formConfig: { ...form.formConfig, concept_placeholder: e.target.value } })}
                className={inputClass}
              />
            </div>
            <Label htmlFor="exh-accepting" className="flex items-center gap-2 text-sm text-[var(--wf-ink)]">
              <Checkbox id="exh-accepting" checked={form.acceptingApplications} onCheckedChange={checked => setForm({ ...form, acceptingApplications: checked === true })} aria-label="Terima pengajuan kolaborasi" />
              Terima pengajuan kolaborasi
            </Label>
            <Label htmlFor="exh-featured" className="flex items-center gap-2 text-sm text-[var(--wf-ink)]">
              <Checkbox id="exh-featured" checked={form.isFeatured} onCheckedChange={checked => setForm({ ...form, isFeatured: checked === true })} aria-label="Tampilkan di urutan teratas" />
              Tampilkan di urutan teratas
            </Label>
            <Label htmlFor="exh-show-estimate" className="flex items-center gap-2 text-sm text-[var(--wf-ink)]">
              <Checkbox
                id="exh-show-estimate"
                checked={form.formConfig.show_participant_estimate !== false}
                onCheckedChange={checked => setForm({ ...form, formConfig: { ...form.formConfig, show_participant_estimate: checked === true } })}
              />
              Tanyakan perkiraan peserta
            </Label>
            <Label htmlFor="exh-show-technical" className="flex items-center gap-2 text-sm text-[var(--wf-ink)]">
              <Checkbox
                id="exh-show-technical"
                checked={form.formConfig.show_technical_needs !== false}
                onCheckedChange={checked => setForm({ ...form, formConfig: { ...form.formConfig, show_technical_needs: checked === true } })}
              />
              Tanyakan kebutuhan teknis
            </Label>
          </div>

          {formError && <p role="alert" className="text-sm text-[var(--wf-danger)]">{formError}</p>}

          <Button type="submit" disabled={isSubmitting}>
            <Plus className="size-4" aria-hidden="true" />
            {isSubmitting ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Simpan program'}
          </Button>
        </form>
      )}

      <section className="ui-dashboard-surface p-5">
        <h2 className="font-display text-lg font-bold text-[var(--wf-ink)]">Daftar Program</h2>
        {isLoading && exhibitions.length === 0 && <p className="mt-3 text-sm text-[var(--wf-ink-muted)]">Memuat program...</p>}
        {!isLoading && exhibitions.length === 0 && (
          <p className="mt-3 text-sm text-[var(--wf-ink-muted)]">Belum ada program. Buat program untuk mulai mengajak komunitas, UMKM, dan brand.</p>
        )}
        <ul className="mt-3 space-y-3">
          {exhibitions.map(exhibition => {
            const linkedActivations = activations.filter(item => item.exhibitionId === exhibition.id);
            const programLeads = leads.filter(lead => lead.exhibitionId === exhibition.id);
            return (
              <li key={exhibition.id} className="rounded-[var(--radius-card)] border border-[var(--wf-rule)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--wf-ink)]">{exhibition.title}</p>
                    <p className="mt-0.5 text-sm text-[var(--wf-ink-muted)]">
                      {formatDateRange(exhibition.dateStart, exhibition.dateEnd)}
                      {exhibition.location && ` · ${exhibition.location}`}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-2 py-0.5 font-semibold text-[var(--wf-ink-muted)]">
                        {PROGRAM_STATUS_LABELS[exhibition.status]}
                      </span>
                      <span className="rounded-full border border-[var(--wf-rule)] px-2 py-0.5 font-semibold text-[var(--wf-ink-muted)]">
                        {PUBLICATION_LABELS[exhibition.publication]}
                      </span>
                      {exhibition.acceptingApplications && (
                        <span className="rounded-full bg-[var(--wf-accent-soft)] px-2 py-0.5 font-semibold text-[var(--wf-accent)]">
                          Menerima pengajuan
                        </span>
                      )}
                      <span className="rounded-full bg-[var(--wf-board-2)] px-2 py-0.5 font-semibold text-[var(--wf-ink-muted)]">
                        {programLeads.length} pengajuan
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedId(exhibition.id === selectedId ? '' : exhibition.id); resetSlotForm(exhibition); }}>
                      {exhibition.id === selectedId ? 'Tutup' : 'Kelola'}
                    </Button>
                    {!readOnly && <Button variant="outline" size="sm" onClick={() => startEdit(exhibition)}>Ubah</Button>}
                    {canDelete && (
                      <Button variant="outline" size="icon-sm" aria-label={`Hapus ${exhibition.title}`} onClick={() => handleDelete(exhibition)} className="active:translate-y-0">
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>

                {exhibition.id === selectedId && (
                  <div className="mt-4 space-y-5 border-t border-[var(--wf-rule)] pt-4">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--wf-ink)]">
                        <CalendarDays className="h-4 w-4" aria-hidden="true" /> Slot tanggal
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {selectedSlots.length === 0 && (
                          <li className="text-sm text-[var(--wf-ink-muted)]">Belum ada slot tanggal.</li>
                        )}
                        {selectedSlots.map(slot => (
                          <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] bg-[var(--wf-board-2)] px-3 py-2 text-sm">
                            <span className="text-[var(--wf-ink)]">
                              {slot.slotDate} · {slot.startTime} - {slot.endTime} · {slot.zoneName} · kapasitas {slot.capacity} · {SLOT_STATUS_LABELS[slot.slotStatus]}
                            </span>
                            {!readOnly && (
                              <span className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingSlotId(slot.id);
                                    setSlotForm({
                                      slotDate: slot.slotDate, startTime: slot.startTime, endTime: slot.endTime,
                                      zoneName: slot.zoneName, capacity: slot.capacity,
                                      slotStatus: slot.slotStatus, publicNote: slot.publicNote,
                                    });
                                  }}
                                >
                                  Ubah
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Hapus slot ${slot.slotDate}`}
                                  onClick={async () => {
                                    const ok = await onConfirm({
                                      title: 'Hapus slot tanggal?',
                                      message: 'Slot yang sudah dipakai pengajuan tidak bisa dihapus. Tutup slotnya lewat tombol Ubah.',
                                      subject: slot.slotDate,
                                    });
                                    if (ok) await onDeleteSlot(slot.id);
                                  }}
                                >
                                  <Trash2 className="size-3.5" aria-hidden="true" />
                                </Button>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>

                      {!readOnly && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <Input id="slot-date" name="slotDate" type="date" className={inputClass} value={slotForm.slotDate} onChange={e => setSlotForm({ ...slotForm, slotDate: e.target.value })} aria-label="Tanggal slot" />
                          <div className="grid grid-cols-2 gap-2">
                            <Input id="slot-start" name="startTime" type="time" className={inputClass} value={slotForm.startTime} onChange={e => setSlotForm({ ...slotForm, startTime: e.target.value })} aria-label="Jam mulai slot" />
                            <Input id="slot-end" name="endTime" type="time" className={inputClass} value={slotForm.endTime} onChange={e => setSlotForm({ ...slotForm, endTime: e.target.value })} aria-label="Jam selesai slot" />
                          </div>
                          <Input id="slot-zone" name="zoneName" className={inputClass} value={slotForm.zoneName} onChange={e => setSlotForm({ ...slotForm, zoneName: e.target.value })} placeholder="Zona / area" aria-label="Zona slot" />
                          <Input id="slot-capacity" name="capacity" type="number" min={1} className={inputClass} value={slotForm.capacity} onChange={e => setSlotForm({ ...slotForm, capacity: Number(e.target.value) || 1 })} aria-label="Kapasitas slot" />
                          <NativeSelect
                            id="slot-status"
                            name="slotStatus"
                            className="w-full"
                            value={slotForm.slotStatus}
                            onChange={e => setSlotForm({ ...slotForm, slotStatus: e.target.value as ExhibitionSlotStatus })}
                            aria-label="Status slot"
                          >
                            {Object.entries(SLOT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </NativeSelect>
                          <div className="flex flex-wrap gap-2 sm:col-span-2">
                            <Button type="button" onClick={() => submitSlot(exhibition)}>
                              <Plus className="size-4" aria-hidden="true" /> {editingSlotId ? 'Simpan slot' : 'Tambah slot'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={async () => {
                                const ok = await onGenerateSlots(exhibition.id);
                                if (ok) resetSlotForm(exhibition);
                              }}
                            >
                              <CalendarPlus className="size-4" aria-hidden="true" /> Generate Slot Tiap Hari Minggu
                            </Button>
                            {editingSlotId && (
                              <Button type="button" variant="ghost" onClick={() => resetSlotForm(exhibition)}>Batal</Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--wf-ink)]">
                        <CalendarDays className="h-4 w-4" aria-hidden="true" /> Event aktivasi
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {linkedActivations.length === 0 && (
                          <li className="text-sm text-[var(--wf-ink-muted)]">Belum ada event aktivasi. Buat event di Jadwal event, lalu tautkan di sini.</li>
                        )}
                        {linkedActivations.map(item => (
                          <li key={item.eventId} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--wf-board-2)] px-3 py-2 text-sm">
                            <span className="text-[var(--wf-ink)]">
                              {item.title} · {formatDateRange(item.dateStart, item.dateEnd)}{item.time && ` · ${item.time}`}
                            </span>
                            {!readOnly && (
                              <Button variant="ghost" size="sm" onClick={() => handleUnlink(item.eventId, item.title)} className="text-[var(--wf-danger)] hover:bg-[var(--wf-danger)]/10 hover:text-[var(--wf-danger)]">
                                <Unlink className="size-3.5" aria-hidden="true" /> Lepas
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                      {!readOnly && (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <div className="min-w-[220px] flex-1">
                            <Label htmlFor={`exh-link-${exhibition.id}`} className={labelClass}>Tautkan event dalam periode program</Label>
                            <NativeSelect id={`exh-link-${exhibition.id}`} value={linkEventId} onChange={e => setLinkEventId(e.target.value)} className="w-full">
                              <option value="">Pilih event...</option>
                              {eligibleEvents.map(ev => <option key={ev.id} value={ev.id}>{`${ev.acara} - ${ev.dateStr}`}</option>)}
                            </NativeSelect>
                          </div>
                          <Button
                            disabled={!linkEventId}
                            onClick={async () => {
                              const ok = await onLinkActivation(exhibition.id, linkEventId);
                              if (ok) setLinkEventId('');
                            }}
                          >
                            <Link2 className="size-4" aria-hidden="true" /> Tautkan
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--wf-ink)]">
                        <Users className="h-4 w-4" aria-hidden="true" /> Kurasi Kolaborasi
                      </h3>
                      {programLeads.length === 0 && (
                        <p className="mt-2 text-sm text-[var(--wf-ink-muted)]">Belum ada pengajuan untuk program ini.</p>
                      )}
                      <ul className="mt-2 space-y-3">
                        {programLeads.map(lead => (
                          <LeadReviewCard
                            key={lead.id}
                            lead={lead}
                            program={exhibition}
                            slot={slots.find(item => item.id === lead.slotId) || null}
                            readOnly={readOnly}
                            onReviewLead={onReviewLead}
                            onPublishLead={onPublishLead}
                          />
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

interface LeadReviewCardProps {
  lead: ExhibitionLead;
  program: AdminExhibition;
  slot: ExhibitionSlot | null;
  readOnly: boolean;
  onReviewLead: (id: string, patch: CollaborationReviewPatch) => Promise<boolean>;
  onPublishLead: (id: string) => Promise<boolean>;
}

function LeadReviewCard({ lead, program, slot, readOnly, onReviewLead, onPublishLead }: LeadReviewCardProps) {
  const [status, setStatus] = useState<ExhibitionLead['status']>(lead.status);
  const [publicTitle, setPublicTitle] = useState(lead.publicActivityTitle);
  const [publicSummary, setPublicSummary] = useState(lead.publicActivitySummary);
  const [isPublicAgenda, setIsPublicAgenda] = useState(lead.isPublicAgenda);
  const [internalNotes, setInternalNotes] = useState(lead.internalNotes);
  const [saving, setSaving] = useState(false);

  const slotLabel = slot ? `${slot.slotDate} (${slot.startTime} - ${slot.endTime})` : lead.preferredDateNote;

  const save = async () => {
    setSaving(true);
    await onReviewLead(lead.id, {
      status, publicActivityTitle: publicTitle, publicActivitySummary: publicSummary,
      isPublicAgenda, internalNotes,
    });
    setSaving(false);
  };

  return (
    <li className="rounded-[var(--radius-card)] border border-[var(--wf-rule)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--wf-ink)]">
            {lead.organizationName}
            <span className="ml-2 font-mono text-xs font-normal text-[var(--wf-ink-muted)]">{lead.referenceCode}</span>
          </p>
          <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)]">
            {ORGANIZATION_LABELS[lead.organizationType]} · {CONTRIBUTION_LABELS[lead.contributionType]}
            {slotLabel && ` · ${slotLabel}`}
          </p>
          <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)]">
            {lead.contactName} · {lead.phone}{lead.email && ` · ${lead.email}`}
            {lead.socialMediaHandle && ` · ${lead.socialMediaHandle}`}
          </p>
        </div>
        <span className="rounded-full bg-[var(--wf-board-2)] px-2 py-0.5 text-xs font-semibold text-[var(--wf-ink)]">
          {LEAD_STATUS_LABELS[lead.status]}
        </span>
      </div>

      <p className="mt-2 text-sm text-[var(--wf-ink)]">{lead.proposal}</p>
      {(lead.estimatedParticipants || lead.technicalNeeds.length > 0) && (
        <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">
          {lead.estimatedParticipants && `Peserta: ${ESTIMATE_LABELS[lead.estimatedParticipants] ?? lead.estimatedParticipants}`}
          {lead.technicalNeeds.length > 0 && ` · Kebutuhan: ${lead.technicalNeeds.join(', ')}`}
          {lead.technicalNeedsNote && ` (${lead.technicalNeedsNote})`}
        </p>
      )}

      {!readOnly && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor={`lead-status-${lead.id}`} className={labelClass}>Status pengajuan</Label>
            <NativeSelect
              id={`lead-status-${lead.id}`}
              className="w-full"
              value={status}
              onChange={e => setStatus(e.target.value as ExhibitionLead['status'])}
            >
              {LEAD_STATUSES.map(value => <option key={value} value={value}>{LEAD_STATUS_LABELS[value]}</option>)}
            </NativeSelect>
          </div>
          <Label htmlFor={`lead-agenda-${lead.id}`} className="flex items-center gap-2 self-end text-sm text-[var(--wf-ink)]">
            <Checkbox
              id={`lead-agenda-${lead.id}`}
              checked={isPublicAgenda}
              onCheckedChange={checked => setIsPublicAgenda(checked === true)}
              aria-label="Tampilkan di Agenda Aktivasi Publik"
            />
            Tampilkan di Agenda Aktivasi Publik
          </Label>
          <div>
            <Label htmlFor={`lead-title-${lead.id}`} className={labelClass}>Judul kegiatan publik</Label>
            <Input id={`lead-title-${lead.id}`} className={inputClass} value={publicTitle} onChange={e => setPublicTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`lead-summary-${lead.id}`} className={labelClass}>Ringkasan untuk pengunjung</Label>
            <Input id={`lead-summary-${lead.id}`} className={inputClass} value={publicSummary} onChange={e => setPublicSummary(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor={`lead-notes-${lead.id}`} className={labelClass}>Catatan internal</Label>
            <Textarea id={`lead-notes-${lead.id}`} rows={2} className={inputClass} value={internalNotes} onChange={e => setInternalNotes(e.target.value)} />
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!readOnly && (
          <Button size="sm" onClick={save} disabled={saving}>
            <CheckCircle2 className="size-4" aria-hidden="true" /> {saving ? 'Menyimpan...' : 'Simpan kurasi'}
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <a href={whatsAppHref(lead, program.title, slotLabel)} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" aria-hidden="true" /> Chat PIC via WhatsApp
          </a>
        </Button>
        {!readOnly && !lead.syncedEventId && (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const ok = await onPublishLead(lead.id);
              if (ok) setIsPublicAgenda(true);
            }}
          >
            <Send className="size-4" aria-hidden="true" /> Terbitkan ke Jadwal Event
          </Button>
        )}
        {lead.syncedEventId && (
          <span className="text-xs font-semibold text-[var(--wf-live)]">Sudah terbit di Jadwal Event</span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-[var(--wf-ink-muted)]">
        Menyetujui pengajuan tidak membuat event. Tombol terbit membuat event baru di kalender; setelah itu event hidup sendiri.
      </p>
    </li>
  );
}
