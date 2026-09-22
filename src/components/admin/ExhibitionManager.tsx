import { useMemo, useState } from 'react';
import { CalendarDays, Link2, Plus, Trash2, Unlink, Users } from 'lucide-react';
import type { EventItem, Exhibition, ExhibitionActivation, ExhibitionInput, ExhibitionLead } from '../../types';
import type { AdminExhibition } from '../../utils/api/exhibitionsApi';
import { formatDateRange } from '../../utils/eventUtils';

const PARTICIPATION_LABELS: Record<ExhibitionLead['participation'], string> = {
  booth: 'Peserta booth',
  activation: 'Pengisi aktivasi',
  both: 'Booth + aktivasi',
};

const LEAD_STATUS_LABELS: Record<ExhibitionLead['status'], string> = {
  pending: 'Menunggu',
  contacted: 'Dihubungi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

/** Sumber tunggal nilai status yang sah. `satisfies` memvalidasi setiap
 *  anggota terhadap union — bukan cast buta seperti `Object.keys(...) as ...[]`. */
const LEAD_STATUSES = ['pending', 'contacted', 'approved', 'rejected'] as const satisfies readonly ExhibitionLead['status'][];

const PUBLICATION_LABELS: Record<Exhibition['publication'], string> = {
  draft: 'Draft internal',
  published: 'Tayang publik',
  archived: 'Diarsipkan',
};

const EMPTY_FORM: ExhibitionInput = {
  title: '', theme: '', description: '', location: '',
  dateStart: '', dateEnd: '', collaborationBrief: '',
  leasingPic: '', marcommPic: '', publication: 'draft', acceptingApplications: false,
};

const inputClass = 'w-full rounded-[var(--radius-control)] border border-[var(--wf-rule)] bg-[var(--wf-board)] px-3 py-2 text-sm text-[var(--wf-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]';
const labelClass = 'mb-1 block text-xs font-semibold text-[var(--wf-ink-muted)]';

interface Props {
  exhibitions: AdminExhibition[];
  leads: ExhibitionLead[];
  activations: ExhibitionActivation[];
  events: EventItem[];
  isLoading: boolean;
  error: string;
  canDelete: boolean;
  onSave: (input: ExhibitionInput, id?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onReviewLead: (id: string, status: ExhibitionLead['status']) => Promise<boolean>;
  onLinkActivation: (exhibitionId: string, eventId: string) => Promise<boolean>;
  onUnlinkActivation: (eventId: string) => Promise<boolean>;
  onConfirm: (options: { title: string; message: string; subject?: string; confirmLabel?: string }) => Promise<boolean>;
  /** Akun demo: hanya melihat. Form & tombol mutasi disembunyikan (backend juga menolak). */
  readOnly?: boolean;
}

export function ExhibitionManager({
  exhibitions, leads, activations, events, isLoading, error, canDelete,
  onSave, onDelete, onReviewLead, onLinkActivation, onUnlinkActivation, onConfirm,
  readOnly = false,
}: Props) {
  const [form, setForm] = useState<ExhibitionInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [linkEventId, setLinkEventId] = useState('');

  const selected = exhibitions.find(item => item.id === selectedId) || null;
  const selectedLeads = useMemo(
    () => (selected ? leads.filter(lead => lead.exhibitionId === selected.id) : []),
    [leads, selected],
  );

  /** Event yang tanggalnya masuk periode pameran — server tetap memvalidasi ulang. */
  const eligibleEvents = useMemo(() => {
    if (!selected) return [];
    return events.filter(ev => {
      const end = ev.dateEnd || ev.dateStr;
      return ev.dateStr >= selected.dateStart && end <= selected.dateEnd;
    });
  }, [events, selected]);

  const startCreate = () => {
    setEditingId('');
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const startEdit = (exhibition: AdminExhibition) => {
    setEditingId(exhibition.id);
    setSelectedId(exhibition.id);
    setFormError('');
    setForm({
      title: exhibition.title, theme: exhibition.theme, description: exhibition.description,
      location: exhibition.location, dateStart: exhibition.dateStart, dateEnd: exhibition.dateEnd,
      collaborationBrief: exhibition.collaborationBrief, leasingPic: exhibition.leasingPic,
      marcommPic: exhibition.marcommPic, publication: exhibition.publication,
      acceptingApplications: exhibition.acceptingApplications,
    });
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (form.title.trim().length < 3) { setFormError('Nama pameran minimal 3 karakter'); return; }
    if (!form.dateStart || !form.dateEnd) { setFormError('Periode pameran wajib diisi'); return; }
    if (form.dateEnd < form.dateStart) { setFormError('Tanggal selesai tidak boleh sebelum tanggal mulai'); return; }

    setFormError('');
    setIsSubmitting(true);
    const ok = await onSave(form, editingId || undefined);
    setIsSubmitting(false);
    if (ok) startCreate();
  };

  const handleDelete = async (exhibition: AdminExhibition) => {
    const ok = await onConfirm({
      title: 'Hapus pameran?',
      message: 'Pengajuan kolaborasi pameran ini juga akan dihapus. Event di kalender tidak dihapus.',
      subject: exhibition.title,
    });
    if (!ok) return;
    const removed = await onDelete(exhibition.id);
    if (removed && selectedId === exhibition.id) setSelectedId('');
  };

  const handleUnlink = async (eventId: string, title: string) => {
    const ok = await onConfirm({
      title: 'Lepas event aktivasi?',
      message: 'Event tetap ada di kalender, hanya tautan ke pameran yang dilepas.',
      subject: title,
      confirmLabel: 'Lepas',
    });
    if (ok) await onUnlinkActivation(eventId);
  };

  const linkedActivations = useMemo(
    () => (selected ? activations.filter(item => item.exhibitionId === selected.id) : []),
    [activations, selected],
  );

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-[var(--radius-card)] border border-red-600/20 bg-red-600/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {!readOnly && <form onSubmit={handleSubmit} className="ui-dashboard-surface space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-[var(--wf-ink)]">
            {editingId ? 'Ubah Pameran' : 'Pameran Baru'}
          </h2>
          {editingId && (
            <button type="button" onClick={startCreate} className="text-xs font-semibold text-[var(--wf-accent)]">
              Buat pameran baru
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="exh-title">
              Nama pameran <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </label>
            <input id="exh-title" className={inputClass} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Beauty Fair" />
          </div>
          <div>
            <label className={labelClass} htmlFor="exh-theme">Tema</label>
            <input id="exh-theme" className={inputClass} value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value })} placeholder="Kecantikan & perawatan diri" />
          </div>
          <div>
            <label className={labelClass} htmlFor="exh-location">Lokasi</label>
            <input id="exh-location" className={inputClass} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Atrium Lt. 1" />
          </div>
          <div>
            <label className={labelClass} htmlFor="exh-start">
              Mulai <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </label>
            <input id="exh-start" type="date" className={inputClass} value={form.dateStart} onChange={e => setForm({ ...form, dateStart: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="exh-end">
              Selesai <span className="text-rose-600" aria-hidden="true">*</span><span className="sr-only">(wajib diisi)</span>
            </label>
            <input id="exh-end" type="date" className={inputClass} value={form.dateEnd} onChange={e => setForm({ ...form, dateEnd: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="exh-leasing">PIC Casual Leasing</label>
            <input id="exh-leasing" className={inputClass} value={form.leasingPic} onChange={e => setForm({ ...form, leasingPic: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="exh-marcomm">PIC Marcomm</label>
            <input id="exh-marcomm" className={inputClass} value={form.marcommPic} onChange={e => setForm({ ...form, marcommPic: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="exh-brief">Kebutuhan kolaborasi brand/EO</label>
            <textarea id="exh-brief" rows={3} className={inputClass} value={form.collaborationBrief} onChange={e => setForm({ ...form, collaborationBrief: e.target.value })} placeholder="Contoh: brand kecantikan untuk booth, EO untuk beauty class dan talkshow." />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="exh-description">Deskripsi publik</label>
            <textarea id="exh-description" rows={3} className={inputClass} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="exh-publication">Publikasi</label>
            <select id="exh-publication" className={inputClass} value={form.publication} onChange={e => {
              // Validasi runtime terhadap sumber kebenaran (bukan `as` buta):
              // nilai di luar daftar diabaikan, bukan dipaksa ke tipe.
              const next = e.target.value;
              if (next in PUBLICATION_LABELS) {
                setForm({ ...form, publication: next as Exhibition['publication'] });
              }
            }}>
              {Object.entries(PUBLICATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 self-end text-sm text-[var(--wf-ink)]">
            <input type="checkbox" checked={form.acceptingApplications} onChange={e => setForm({ ...form, acceptingApplications: e.target.checked })} />
            Terima pengajuan kolaborasi
          </label>
        </div>

        {formError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{formError}</p>}

        <button type="submit" disabled={isSubmitting} className="ui-btn-primary inline-flex items-center gap-2 rounded-[var(--radius-control)] px-4 py-2 text-sm font-semibold disabled:opacity-60">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : 'Simpan pameran'}
        </button>
      </form>}

      <section className="ui-dashboard-surface p-5">
        <h2 className="font-display text-lg font-bold text-[var(--wf-ink)]">Daftar Pameran</h2>
        {isLoading && exhibitions.length === 0 && <p className="mt-3 text-sm text-[var(--wf-ink-muted)]">Memuat pameran…</p>}
        {!isLoading && exhibitions.length === 0 && (
          <p className="mt-3 text-sm text-[var(--wf-ink-muted)]">Belum ada pameran. Buat pameran untuk mulai mengajak brand dan EO.</p>
        )}
        <ul className="mt-3 space-y-3">
          {exhibitions.map(exhibition => (
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
                      {PUBLICATION_LABELS[exhibition.publication]}
                    </span>
                    {exhibition.acceptingApplications && (
                      <span className="rounded-full bg-[var(--wf-accent-soft)] px-2 py-0.5 font-semibold text-[var(--wf-accent)]">
                        Menerima pengajuan
                      </span>
                    )}
                    {exhibition.activationCount === 0 ? (
                      <span className="rounded-full bg-[var(--wf-action)]/10 px-2 py-0.5 font-semibold text-[var(--wf-action)]">
                        Belum ada aktivasi
                      </span>
                    ) : (
                      <span className="rounded-full bg-[var(--wf-live)]/10 px-2 py-0.5 font-semibold text-[var(--wf-live)]">
                        {exhibition.activationCount} event aktivasi
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setSelectedId(exhibition.id === selectedId ? '' : exhibition.id)} className="rounded-[var(--radius-control)] border border-[var(--wf-rule)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-ink)]">
                    {exhibition.id === selectedId ? 'Tutup' : 'Kelola'}
                  </button>
                  {!readOnly && <button type="button" onClick={() => startEdit(exhibition)} className="rounded-[var(--radius-control)] border border-[var(--wf-rule)] px-3 py-1.5 text-xs font-semibold text-[var(--wf-ink)]">
                    Ubah
                  </button>}
                  {canDelete && (
                    <button type="button" onClick={() => handleDelete(exhibition)} aria-label={`Hapus ${exhibition.title}`} className="rounded-[var(--radius-control)] border border-red-600/20 p-1.5 text-red-700 dark:text-red-300">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {exhibition.id === selectedId && (
                <div className="mt-4 space-y-4 border-t border-[var(--wf-rule)] pt-4">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--wf-ink)]">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" /> Event aktivasi
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {linkedActivations.length === 0 && (
                        <li className="text-sm text-[var(--wf-ink-muted)]">
                          Belum ada event aktivasi. Buat event di Jadwal Event, lalu tautkan di sini.
                        </li>
                      )}
                      {linkedActivations.map(item => (
                        <li key={item.eventId} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--wf-board-2)] px-3 py-2 text-sm">
                          <span className="text-[var(--wf-ink)]">
                            {item.title} · {formatDateRange(item.dateStart, item.dateEnd)}
                            {item.time && ` · ${item.time}`}
                          </span>
                          {!readOnly && <button type="button" onClick={() => handleUnlink(item.eventId, item.title)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-300">
                            <Unlink className="h-3.5 w-3.5" aria-hidden="true" /> Lepas
                          </button>}
                        </li>
                      ))}
                    </ul>
                    {!readOnly && <div className="mt-3 flex flex-wrap items-end gap-2">
                      <div className="min-w-[220px] flex-1">
                        <label className={labelClass} htmlFor={`exh-link-${exhibition.id}`}>Tautkan event dalam periode pameran</label>
                        <select id={`exh-link-${exhibition.id}`} className={inputClass} value={linkEventId} onChange={e => setLinkEventId(e.target.value)}>
                          <option value="">Pilih event…</option>
                          {eligibleEvents.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.acara} - {ev.dateStr}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        disabled={!linkEventId}
                        onClick={async () => {
                          const ok = await onLinkActivation(exhibition.id, linkEventId);
                          if (ok) setLinkEventId('');
                        }}
                        className="ui-btn-primary inline-flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold disabled:opacity-60"
                      >
                        <Link2 className="h-4 w-4" aria-hidden="true" /> Tautkan
                      </button>
                    </div>}
                  </div>

                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--wf-ink)]">
                      <Users className="h-4 w-4" aria-hidden="true" /> Pengajuan kolaborasi
                    </h3>
                    {selectedLeads.length === 0 && (
                      <p className="mt-2 text-sm text-[var(--wf-ink-muted)]">Belum ada pengajuan brand atau EO.</p>
                    )}
                    <ul className="mt-2 space-y-2">
                      {selectedLeads.map(lead => (
                        <li key={lead.id} className="rounded-[var(--radius-control)] border border-[var(--wf-rule)] p-3">
                          <p className="text-sm font-semibold text-[var(--wf-ink)]">
                            {lead.organizationName} <span className="font-normal text-[var(--wf-ink-muted)]">· {lead.organizationType === 'eo' ? 'EO' : 'Brand'}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)]">
                            {PARTICIPATION_LABELS[lead.participation]} · {lead.contactName} · {lead.phone}
                            {lead.email && ` · ${lead.email}`}
                          </p>
                          {lead.proposal && <p className="mt-1 text-sm text-[var(--wf-ink)]">{lead.proposal}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--wf-ink)]">{LEAD_STATUS_LABELS[lead.status]}</span>
                            {!readOnly && LEAD_STATUSES
                              .filter(status => status !== lead.status)
                              .map(status => (
                                <button key={status} type="button" onClick={() => onReviewLead(lead.id, status)} className="rounded-full border border-[var(--wf-rule)] px-2.5 py-1 text-xs font-medium text-[var(--wf-ink)]">
                                  {LEAD_STATUS_LABELS[status]}
                                </button>
                              ))}
                          </div>
                          <p className="mt-2 text-[11px] text-[var(--wf-ink-muted)]">
                            Menyetujui pengajuan tidak membuat event. Buat event aktivasi lalu tautkan di atas.
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
