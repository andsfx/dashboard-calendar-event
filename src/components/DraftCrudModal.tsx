import { useEffect, useMemo, useState } from 'react';
import { Calendar, Save, X } from 'lucide-react';
import { DraftEventItem, DraftProgress, EventItem } from '../types';
import { createId } from '../utils/eventUtils';
import { getDraftDateMeta, getDraftSuggestions, getSuggestionPlaceholder } from '../utils/draftUtils';
import { ModalWrapper } from './ModalWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DraftEventItem>) => Promise<boolean>;
  editingDraft: DraftEventItem | null;
  events: EventItem[];
  draftEvents: DraftEventItem[];
}

const EMPTY = {
  dateStr: '',
  jam: '',
  acara: '',
  lokasi: '',
  eo: '',
  pic: '',
  phone: '',
  keterangan: '',
  progress: 'draft' as DraftProgress,
};

export function DraftCrudModal({ isOpen, onClose, onSave, editingDraft, events, draftEvents }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestionSource = useMemo(
    () => [
      ...events.map(event => ({ jam: event.jam, lokasi: event.lokasi, eo: event.eo })),
      ...draftEvents.map(draft => ({ jam: draft.jam, lokasi: draft.lokasi, eo: draft.eo })),
    ],
    [events, draftEvents]
  );

  const jamSuggestions = getDraftSuggestions(suggestionSource, 'jam');
  const lokasiSuggestions = getDraftSuggestions(suggestionSource, 'lokasi');
  const eoSuggestions = getDraftSuggestions(suggestionSource, 'eo');

  useEffect(() => {
    if (editingDraft) {
      setForm({
        dateStr: editingDraft.dateStr,
        jam: editingDraft.jam,
        acara: editingDraft.acara,
        lokasi: editingDraft.lokasi,
        eo: editingDraft.eo,
        pic: editingDraft.pic,
        phone: editingDraft.phone,
        keterangan: editingDraft.keterangan,
        progress: editingDraft.progress,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setIsSubmitting(false);
  }, [editingDraft, isOpen]);

  if (!isOpen) return null;

  const set = (key: keyof typeof EMPTY, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.dateStr) nextErrors.dateStr = 'Tanggal wajib diisi';
    if (!form.acara.trim()) nextErrors.acara = 'Nama event wajib diisi';
    if (!form.lokasi.trim()) nextErrors.lokasi = 'Lokasi wajib diisi';
    if (!form.pic.trim()) nextErrors.pic = 'Penanggung jawab wajib diisi';
    if (!form.phone.trim()) nextErrors.phone = 'Nomor telepon wajib diisi';
    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const meta = getDraftDateMeta(form.dateStr);
    setIsSubmitting(true);
    const success = await onSave({
      ...(editingDraft ? { id: editingDraft.id, rowIndex: editingDraft.rowIndex } : { id: createId(), rowIndex: 0 }),
      ...form,
      ...meta,
      published: editingDraft?.published ?? false,
      publishedAt: editingDraft?.publishedAt || '',
      deleted: editingDraft?.deleted ?? false,
      deletedAt: editingDraft?.deletedAt || '',
    });
    if (!success) setIsSubmitting(false);
  };

  const isEdit = !!editingDraft;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
      <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white">{isEdit ? 'Edit Draft Event' : 'Tambah Draft Event'}</p>
              <p className="text-xs text-slate-400">{isEdit ? `Mengubah: ${editingDraft.acara}` : 'Isi data antrian event untuk ditindaklanjuti'}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Tanggal <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.dateStr}
                onChange={e => set('dateStr', e.target.value)}
                className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark] ${errors.dateStr ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`}
              />
              {errors.dateStr && <p className="mt-1 text-xs text-red-500">{errors.dateStr}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Jam</label>
              <input
                value={form.jam}
                onChange={e => set('jam', e.target.value)}
                placeholder={getSuggestionPlaceholder(jamSuggestions, '09:00 - 17:00 / 10:00 - 22:00')}
                list="draft-jam-suggestions"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <datalist id="draft-jam-suggestions">
                {jamSuggestions.map(item => <option key={item} value={item} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nama Event <span className="text-red-500">*</span></label>
            <input
              value={form.acara}
              onChange={e => set('acara', e.target.value)}
              placeholder="Masukkan nama event yang akan diproses"
              className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${errors.acara ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`}
            />
            {errors.acara && <p className="mt-1 text-xs text-red-500">{errors.acara}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nama EO</label>
              <input
                value={form.eo}
                onChange={e => set('eo', e.target.value)}
                placeholder={getSuggestionPlaceholder(eoSuggestions, 'Internal MMB / EO Partner / Organizer Event')}
                list="draft-eo-suggestions"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <datalist id="draft-eo-suggestions">
                {eoSuggestions.map(item => <option key={item} value={item} />)}
              </datalist>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Lokasi <span className="text-red-500">*</span></label>
              <input
                value={form.lokasi}
                onChange={e => set('lokasi', e.target.value)}
                placeholder={getSuggestionPlaceholder(lokasiSuggestions, 'Atrium Lt.1 / Hall A / Main Lobby')}
                list="draft-lokasi-suggestions"
                className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${errors.lokasi ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`}
              />
              <datalist id="draft-lokasi-suggestions">
                {lokasiSuggestions.map(item => <option key={item} value={item} />)}
              </datalist>
              {errors.lokasi && <p className="mt-1 text-xs text-red-500">{errors.lokasi}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Penanggung Jawab <span className="text-red-500">*</span></label>
              <input
                value={form.pic}
                onChange={e => set('pic', e.target.value)}
                placeholder="Nama PIC event"
                className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${errors.pic ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`}
              />
              {errors.pic && <p className="mt-1 text-xs text-red-500">{errors.pic}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nomor Telepon <span className="text-red-500">*</span></label>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${errors.phone ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100 dark:border-slate-600'}`}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Progress</label>
              <select
                value={form.progress}
                onChange={e => set('progress', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="draft">Draft</option>
                <option value="confirm">Confirm</option>
                <option value="cancel">Cancel</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Keterangan</label>
            <textarea
              value={form.keterangan}
              onChange={e => set('keterangan', e.target.value)}
              rows={3}
              placeholder="Tulis status progres atau catatan follow-up event"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-violet-900/30"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Draft Event' : 'Tambah Draft Event'}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
