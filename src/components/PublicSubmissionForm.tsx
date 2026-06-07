import { FormEvent, useState } from 'react';
import { Send } from 'lucide-react';
import { EventModel } from '../types';
import { RevealSection, eyebrow } from './PublicShared';

export interface PublicSubmissionFormPayload {
  dateStr: string;
  jam: string;
  acara: string;
  lokasi: string;
  eo: string;
  pic: string;
  phone: string;
  keterangan: string;
  categories: string[];
  eventModel: EventModel;
  eventNominal: string;
  eventModelNotes: string;
}

const BRAND = {
  accent: '#7c6cf2',
  accentWarm: '#f2743e',
};

const CATEGORIES = ['Bazaar', 'Festival', 'Workshop', 'Konser', 'Produk', 'Kuliner', 'Umum'];
const MODELS: Array<{ value: EventModel; label: string }> = [
  { value: '', label: 'Pilih model event' },
  { value: 'free', label: 'Free' },
  { value: 'bayar', label: 'Bayar' },
  { value: 'support', label: 'Support' },
];

interface PublicSubmissionFormProps {
  onSubmitRequest: (payload: PublicSubmissionFormPayload) => Promise<boolean>;
}

function SubmissionFormFields({ onSubmitRequest }: { onSubmitRequest: (payload: PublicSubmissionFormPayload) => Promise<boolean> }) {
  const [form, setForm] = useState<PublicSubmissionFormPayload>({
    dateStr: '',
    jam: '',
    acara: '',
    lokasi: '',
    eo: '',
    pic: '',
    phone: '',
    keterangan: '',
    categories: ['Umum'],
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (key: keyof PublicSubmissionFormPayload, value: string | string[]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.acara.trim() || !form.eo.trim() || !form.pic.trim() || !form.phone.trim() || !form.dateStr || !form.lokasi.trim()) {
      setError('Lengkapi nama event, EO, PIC, telepon, tanggal, dan area yang diinginkan.');
      return;
    }
    if ((form.eventModel === 'bayar' || form.eventModel === 'support') && (!form.eventNominal.trim() || !form.eventModelNotes.trim())) {
      setError('Lengkapi nominal dan keterangan model event.');
      return;
    }
    setSubmitting(true);
    const success = await onSubmitRequest(form);
    if (success) {
      setForm({
        dateStr: '',
        jam: '',
        acara: '',
        lokasi: '',
        eo: '',
        pic: '',
        phone: '',
        keterangan: '',
        categories: ['Umum'],
        eventModel: '',
        eventNominal: '',
        eventModelNotes: '',
      });
    }
    setSubmitting(false);
  };

  const inputClass = 'w-full rounded-2xl border border-slate-200/50 bg-[#fffdf9] px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-violet-400 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder-slate-500';
  const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5';

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-slate-200/50 bg-[#faf6ef] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:bg-slate-900 dark:border-slate-700 xl:p-7"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="submit-acara" className={labelClass}>Nama Event <span className="text-rose-500">*</span></label>
          <input id="submit-acara" value={form.acara} onChange={e => setField('acara', e.target.value)} placeholder="Nama event" className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-eo" className={labelClass}>EO / Brand <span className="text-rose-500">*</span></label>
          <input id="submit-eo" value={form.eo} onChange={e => setField('eo', e.target.value)} placeholder="EO / Brand" className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-pic" className={labelClass}>PIC <span className="text-rose-500">*</span></label>
          <input id="submit-pic" value={form.pic} onChange={e => setField('pic', e.target.value)} placeholder="PIC" className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-phone" className={labelClass}>Nomor Telepon <span className="text-rose-500">*</span></label>
          <input id="submit-phone" type="tel" autoComplete="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="Nomor telepon" className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-date" className={labelClass}>Tanggal <span className="text-rose-500">*</span></label>
          <input id="submit-date" type="date" value={form.dateStr} onChange={e => setField('dateStr', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-jam" className={labelClass}>Jam Pelaksanaan</label>
          <input id="submit-jam" value={form.jam} onChange={e => setField('jam', e.target.value)} placeholder="Jam pelaksanaan" className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-lokasi" className={labelClass}>Preferensi Area <span className="text-rose-500">*</span></label>
          <input id="submit-lokasi" value={form.lokasi} onChange={e => setField('lokasi', e.target.value)} placeholder="Preferensi area" className={inputClass} />
        </div>
        <div>
          <label htmlFor="submit-category" className={labelClass}>Kategori</label>
          <select id="submit-category" value={form.categories[0] || 'Umum'} onChange={e => setField('categories', [e.target.value])} className={inputClass}>
            {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="submit-model" className={labelClass}>Model Event</label>
          <select id="submit-model" value={form.eventModel} onChange={e => setField('eventModel', e.target.value)} className={inputClass}>
            {MODELS.map(model => <option key={model.label} value={model.value}>{model.label}</option>)}
          </select>
        </div>
        {(form.eventModel === 'bayar' || form.eventModel === 'support') && (
          <>
            <div>
              <label htmlFor="submit-nominal" className={labelClass}>Nominal <span className="text-rose-500">*</span></label>
              <input id="submit-nominal" value={form.eventNominal} onChange={e => setField('eventNominal', e.target.value)} placeholder="Nominal" className={inputClass} />
            </div>
            <div>
              <label htmlFor="submit-model-notes" className={labelClass}>Keterangan Model <span className="text-rose-500">*</span></label>
              <input id="submit-model-notes" value={form.eventModelNotes} onChange={e => setField('eventModelNotes', e.target.value)} placeholder="Keterangan model" className={inputClass} />
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <label htmlFor="submit-keterangan" className={labelClass}>Keterangan</label>
          <textarea id="submit-keterangan" value={form.keterangan} onChange={e => setField('keterangan', e.target.value)} rows={5} placeholder="Ringkas konsep event, target pengunjung, dan kebutuhan utama." className={`${inputClass} resize-none`} />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      <div className="mt-6 flex flex-col gap-4 border-t border-slate-200/50 pt-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-400">Setiap pengajuan akan ditinjau tim mall berdasarkan jadwal, area, dan kebutuhan pelaksanaan acara sebelum ditindaklanjuti ke PIC.</p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${BRAND.accentWarm} 0%, ${BRAND.accent} 100%)` }}
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Mengirim...' : 'Ajukan Event'}
        </button>
      </div>
    </form>
  );
}


export function PublicSubmissionForm({ onSubmitRequest }: PublicSubmissionFormProps) {
  return (
<RevealSection id="submit" intensity="strong" className="border-y border-black/5 bg-[#f4efe8] px-4 py-20 dark:bg-slate-900 dark:border-slate-800 sm:px-6">
          <div className="reveal-cluster mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <div className="max-w-md">
              {eyebrow('Pengajuan Event')}
              <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-5xl">Ajukan event dari sini.</h2>
              <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-400">Isi tanggal, area, PIC, dan kebutuhan acara agar tim Metropolitan Mall Bekasi bisa mengecek kecocokan jadwal serta kesiapan area sebelum program ditindaklanjuti.</p>
            </div>
            <SubmissionFormFields onSubmitRequest={onSubmitRequest} />
          </div>
        </RevealSection>
  );
}
