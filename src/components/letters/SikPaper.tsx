// TSX · src/components/letters/SikPaper.tsx · Vite/React 19, Tailwind v4
// Kertas A4 inline-editable untuk SURAT IZIN KERJA (dokumen kedua, terpisah
// dari SKE). Urutan blok HARUS sama dengan buildSikPdf.ts.
// Jangan bungkus di RevealSection: wrapper itu memindahkan DOM saat tween dan
// mencabut fokus input (insiden berulang, lihat AGENTS.md).

import type { SikRequestItem } from '../../types';
import { EditableText } from '../ui/Editable';
import { formatTanggalSurat } from './letterDates';
import { LETTER_PAGE, LETTER_BASE_FONT_SIZE, LINE_RATIO } from '../pdf/letterLayout';
import { SIK_SYARAT } from './letterDocuments';

interface SikPaperProps {
  letter: SikRequestItem;
  onChange: (next: SikRequestItem) => void;
  readOnly?: boolean;
  errors?: Partial<Record<keyof SikRequestItem, string>>;
}

const SERIF = 'Times New Roman, Times, serif';
const FIELD_ERROR_CLASS = 'block text-[11px] leading-tight text-rose-700 dark:text-rose-300';

function FieldError({ message, id }: { message?: string; id: string }) {
  if (!message) return null;
  return <span id={id} className={FIELD_ERROR_CLASS}>{message}</span>;
}

/** Baris "Label : Nilai" — titik dua diletakkan tepat setelah label (bukan di ujung kanan). */
function SikRow({
  label, value, placeholder, id, disabled, error, onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  id: string;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-1">
        <span className="w-[150px] shrink-0 text-[var(--wf-ink-muted)]">{label}</span>
        <span aria-hidden className="text-[var(--wf-ink-muted)]">:</span>
        <EditableText
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          id={id}
          ariaLabel={label}
          className="min-w-0 flex-1 font-bold"
        />
      </div>
      <FieldError message={error} id={`${id}-error`} />
    </div>
  );
}

export function SikPaper({ letter, onChange, readOnly = false, errors = {} }: SikPaperProps) {
  const set = (key: keyof SikRequestItem) => (value: string) =>
    onChange({ ...letter, [key]: value });

  const tanggalFormatted = formatTanggalSurat(letter.tanggalSurat);
  const disabled = readOnly;

  return (
    <div className="flex justify-center overflow-auto bg-[var(--wf-board-2)] p-4 sm:p-8">
      <div
        className="w-full max-w-[210mm] bg-white text-[#0f172a] shadow-xl dark:bg-[var(--wf-board)] dark:text-[var(--wf-ink)]"
        style={{ fontFamily: SERIF, fontSize: `${LETTER_BASE_FONT_SIZE}px`, lineHeight: LINE_RATIO }}
      >
        <div className="px-[20mm] py-[20mm]" style={{ minHeight: `${LETTER_PAGE.height}mm` }}>
          {/* ── Kop: judul + nomor di tengah, sesuai contoh resmi ─── */}
          <header className="text-center">
            <h2 className="text-base font-bold tracking-wide" id="sik-judul">SURAT IZIN KERJA</h2>
            <div className="flex justify-center">
              <EditableText
                value={letter.nomorSurat}
                onChange={set('nomorSurat')}
                placeholder="097A/MMB/MKT.SIKI/2026"
                disabled={disabled}
                id="sik-nomor-surat"
                ariaLabel="Nomor surat izin kerja"
                className="inline-block w-auto min-w-[12rem] text-center"
                style={{ width: 'auto', minWidth: `${Math.max(12, letter.nomorSurat.length + 2)}ch` }}
              />
            </div>
            <FieldError message={errors.nomorSurat} id="sik-nomor-surat-error" />
          </header>

          {/* ── Penerima izin ───────────────────────────────────── */}
          <p className="mt-6 font-semibold">Diberikan surat izin kepada :</p>
          <div className="mt-2 space-y-1">
            <SikRow label="Nama" value={letter.namaEO} placeholder="Nama EO / tenant" id="sik-nama-eo" disabled={disabled} error={errors.namaEO} onChange={set('namaEO')} />
            <SikRow label="Penanggung Jawab" value={letter.penanggungJawab} placeholder="Nama PIC lapangan" id="sik-penanggung-jawab" disabled={disabled} error={errors.penanggungJawab} onChange={set('penanggungJawab')} />
            <SikRow label="No. Hp" value={letter.nomorHp} placeholder="08xx xxxx xxxx" id="sik-nomor-hp" disabled={disabled} error={errors.nomorHp} onChange={set('nomorHp')} />
            <SikRow label="Jenis kegiatan/Lokasi" value={letter.jenisKegiatan} placeholder="Loading &amp; Unloading …" id="sik-jenis-kegiatan" disabled={disabled} error={errors.jenisKegiatan} onChange={set('jenisKegiatan')} />
            <SikRow label="Tanggal Mulai" value={letter.tanggalMulai} placeholder="8 Februari 2026" id="sik-tanggal-mulai" disabled={disabled} error={errors.tanggalMulai} onChange={set('tanggalMulai')} />
            <SikRow label="Tanggal Selesai" value={letter.tanggalSelesai} placeholder="8 Februari 2026" id="sik-tanggal-selesai" disabled={disabled} error={errors.tanggalSelesai} onChange={set('tanggalSelesai')} />
            <SikRow label="Lokasi" value={letter.lokasi} placeholder="Area Metropolitan Mall Bekasi" id="sik-lokasi" disabled={disabled} error={errors.lokasi} onChange={set('lokasi')} />
            <SikRow label="Waktu" value={letter.waktu} placeholder="08.00 - 18.00" id="sik-waktu" disabled={disabled} error={errors.waktu} onChange={set('waktu')} />
          </div>

          {/* ── 6 syarat tetap ──────────────────────────────────── */}
          <div className="mt-5">
            <p className="font-semibold">Syarat – syarat yang harus dipatuhi :</p>
            <ul className="mt-1 list-disc space-y-1 pl-6 text-justify">
              {SIK_SYARAT.map((syarat, i) => (
                <li key={syarat} className={i === SIK_SYARAT.length - 1 ? 'font-bold' : undefined}>{syarat}</li>
              ))}
            </ul>
          </div>

          {/* ── Penutup ─────────────────────────────────────────── */}
          <p className="mt-5 text-justify">
            Demikian surat izin ini diberikan agar dapat dipergunakan sebagaimana mestinya dan harapan yang berkepentingan maklum.
          </p>

          {/* ── Catatan opsional ────────────────────────────────── */}
          <div className="mt-4">
            <EditableText
              value={letter.catatan}
              onChange={set('catatan')}
              placeholder="Catatan (opsional): denda keterlambatan atau batas pengosongan."
              disabled={disabled}
              id="sik-catatan"
              ariaLabel="Catatan"
              className="block text-[10px]"
            />
          </div>

          {/* ── Tanda tangan: kiri, Marcomm Manager ───────────────── */}
          <div className="mt-8 w-64">
            <SikRow
              label="Bekasi,"
              value={tanggalFormatted}
              placeholder="Tanggal surat"
              id="sik-tanggal-surat"
              disabled={disabled}
              error={errors.tanggalSurat}
              onChange={(v) => onChange({ ...letter, tanggalSurat: v })}
            />
            <p className="mt-1 font-semibold">Metropolitan Mall Bekasi</p>
            <div className="h-14" />
            <SikRow label="Nama" value={letter.penandatanganNama} placeholder="Nama penanda tangan" id="sik-penandatangan-nama" disabled={disabled} error={errors.penandatanganNama} onChange={set('penandatanganNama')} />
            <SikRow label="Jabatan" value={letter.penandatanganJabatan} placeholder="Marcomm Manager" id="sik-penandatangan-jabatan" disabled={disabled} error={errors.penandatanganJabatan} onChange={set('penandatanganJabatan')} />
          </div>
        </div>
      </div>
    </div>
  );
}
