import type { LetterRequestItem } from '../../types';
import { EditableText, EditableArea } from '../ui/Editable';
import { formatTanggalSurat } from './letterDates';
import { LETTER_PAGE, LETTER_BASE_FONT_SIZE, LINE_RATIO } from '../pdf/letterLayout';
// A2 (footer blok identitas PT). SVG aset ini dipakai di seluruh aplikasi;
// di sini diimpor langsung — Vite mengubahnya menjadi URL yang aman dipakai
// di <img>. Jika implementasi aset terbukti bermasalah saat build, fallback
// blok teks PT di bawah sudah mencakup seluruh isi identitas.
import mallLogo from '../../assets/brand/LOGOMETMAL2016-01.svg';

interface LetterPaperProps {
  letter: LetterRequestItem;
  onChange: (next: LetterRequestItem) => void;
  readOnly?: boolean;
  errors?: Partial<Record<keyof LetterRequestItem, string>>;
}

const SERIF = 'Times New Roman, Times, serif';

const FIELD_ERROR_CLASS = 'block text-[11px] leading-tight text-rose-700 dark:text-rose-300';

function FieldError({ message, id }: { message?: string; id: string }) {
  if (!message) return null;
  return (
    <span id={id} className={FIELD_ERROR_CLASS}>
      {message}
    </span>
  );
}

/** Teks WYSIWYG satu baris — label opsional + ":" untuk baris tabel. */
function LabeledText({
  label, value, placeholder, id, disabled, errors, bold, onChange,
}: {
  label?: string;
  value: string;
  placeholder?: string;
  id: string;
  disabled?: boolean;
  errors?: string;
  bold?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className={`flex gap-1 ${bold ? 'font-bold' : ''}`}>
        {label != null && (
          <span className="shrink-0 whitespace-nowrap text-[var(--wf-ink-muted)]">{label}</span>
        )}
        <EditableText
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          id={id}
          ariaLabel={label ?? placeholder}
          className="min-w-0 flex-1"
        />
        {label != null && <span className="shrink-0 text-[var(--wf-ink-muted)]">:</span>}
      </div>
      <FieldError message={errors} id={`${id}-error`} />
    </div>
  );
}

// ============================================================
// SKE — format resmi MMB (PERBANDINGAN-FORMAT-RESMI.md §2, A1–A14):
// kop MetLand saja; meta tempat/tanggal + nomor tanpa label; tujuan tanpa
// `u.p.`/telepon; kalimat pembuka dinamis; tabel 3 baris tanpa latar;
// varian berbayar opsional; penutup tunggal; dua kolom tanda tangan;
// footer blok identitas PT. JADWAL LOADING sengaja TIDAK ada (milik SIK).
// ============================================================
export function LetterPaper({ letter, onChange, readOnly = false, errors = {} }: LetterPaperProps) {
  const set = (key: keyof LetterRequestItem) => (value: string) =>
    onChange({ ...letter, [key]: value });

  const tanggalFormatted = formatTanggalSurat(letter.tanggalSurat);
  const disabled = readOnly;

  const biayaTerisi = (letter.biayaKebersihan ?? '').trim() !== '';
  const vaTerisi = (letter.vaBank ?? '').trim() !== '';

  return (
    <div className="flex justify-center overflow-auto bg-[var(--wf-board-2)] p-4 sm:p-8">
      <div
        className="w-full max-w-[210mm] bg-white text-[#0f172a] shadow-xl dark:bg-[var(--wf-board)] dark:text-[var(--wf-ink)]"
        style={{ fontFamily: SERIF, fontSize: `${LETTER_BASE_FONT_SIZE}px`, lineHeight: LINE_RATIO }}
      >
        <div
          className="flex flex-col px-[25.4mm] py-[25.4mm]"
          style={{ minHeight: `${LETTER_PAGE.height}mm` }}
        >
          {/* A1 — kop: logo MetLand saja, tanpa nama mall/divisi/alamat */}
          <header className="shrink-0">
            <img src={mallLogo} alt="MetLand" className="h-12 w-auto" />
          </header>

          {/* A3 — meta kiri atas tanpa label */}
          <div className="mt-5 shrink-0 space-y-0">
            <div className="flex gap-1">
              <EditableText
                value={letter.tempatSurat}
                onChange={(v) => onChange({ ...letter, tempatSurat: v })}
                placeholder="Bekasi"
                disabled={disabled}
                id="letter-tempat-surat"
                ariaLabel="Tempat surat"
                className="min-w-0"
              />
              <span>,&nbsp;</span>
              <EditableText
                value={tanggalFormatted}
                onChange={(v) => onChange({ ...letter, tanggalSurat: v })}
                placeholder="5 Februari 2026"
                disabled={disabled}
                id="letter-tanggal-surat"
                ariaLabel="Tanggal surat"
                className="min-w-0"
              />
            </div>
            <FieldError message={errors.tanggalSurat} id="letter-tanggal-surat-error" />
            <div className="flex gap-1">
              <span>No.&nbsp;</span>
              <EditableText
                value={letter.nomorSurat}
                onChange={set('nomorSurat')}
                placeholder="097/MMB/MKT.MC/II/2026"
                disabled={disabled}
                id="letter-nomor-surat"
                ariaLabel="Nomor surat"
                className="min-w-0 flex-1"
              />
            </div>
            <FieldError message={errors.nomorSurat} id="letter-nomor-surat-error" />
          </div>

          {/* A5 — tujuan: nama EO + alamat, tanpa `u.p.` dan tanpa telepon */}
          <div className="mt-4 shrink-0">
            <p>Kepada Yth,</p>
            <LabeledText
              value={letter.namaEO}
              placeholder="Nama Event Organizer"
              id="letter-nama-eo"
              disabled={disabled}
              errors={errors.namaEO}
              bold
              onChange={set('namaEO')}
            />
            <div className="min-w-0">
              <EditableArea
                value={letter.alamatEO}
                placeholder="Alamat lengkap Event Organizer"
                id="letter-alamat-eo"
                disabled={disabled}
                ariaLabel="Alamat"
                rows={2}
                onChange={set('alamatEO')}
                className="min-w-0 flex-1"
              />
              <FieldError message={errors.alamatEO} id="letter-alamat-eo-error" />
            </div>
          </div>

          {/* A6 — salam + kalimat pembuka DINAMIS. Nama EO/event merender dari
              data (bukan input) — pengeditan tetap lewat field standalone di
              atas/tabel agar onChange mengalir dari satu sumber. */}
          <div className="mt-4 shrink-0">
            <p>Dengan hormat,</p>
            <p className="text-justify">
              Bersama ini kami sampaikan konfirmasi{' '}
              <span className="font-bold">{letter.namaEO || '……'}</span> untuk mengadakan{' '}
              <span className="font-bold">{letter.namaEvent || '……'}</span> di Metropolitan Mall
              Bekasi sebagai berikut :
            </p>
          </div>

          {/* A7/A8 — tabel 3 baris, tanpa latar berwarna (A14) */}
          <div className="mt-4 shrink-0 space-y-1">
            <LabeledText
              label="Lokasi"
              value={letter.lokasi}
              placeholder="Area Metropolitan Mall Bekasi"
              id="letter-lokasi"
              disabled={disabled}
              errors={errors.lokasi}
              onChange={set('lokasi')}
            />
            <LabeledText
              label="Hari / Tanggal Pelaksanaan"
              value={letter.hariTanggalPelaksanaan}
              placeholder="8 Februari 2026"
              id="letter-hari-tanggal"
              disabled={disabled}
              errors={errors.hariTanggalPelaksanaan}
              onChange={set('hariTanggalPelaksanaan')}
            />
            <LabeledText
              label="Waktu Pelaksanaan"
              value={letter.waktuPelaksanaan}
              placeholder="10.00 - 17.00 WIB"
              id="letter-waktu-pelaksanaan"
              disabled={disabled}
              errors={errors.waktuPelaksanaan}
              onChange={set('waktuPelaksanaan')}
            />

            {/* Varian berbayar (reference-01 TK Al Jasmine) — baris cetak hanya
                bila diisi. Nama Event sengaja tidak jadi baris tabel (A8):
                sudah ada di kalimat pembuka, diedit lewat input di sana? Tidak —
                edit lewat field standalone di bawah agar kontrak input tetap. */}
            {biayaTerisi && (
              <LabeledText
                label="Biaya Kebersihan"
                value={letter.biayaKebersihan ?? ''}
                placeholder="900.901,- (Exclude PPN)"
                id="letter-biaya-kebersihan"
                disabled={disabled}
                onChange={set('biayaKebersihan')}
              />
            )}
            {vaTerisi && (
              <LabeledText
                label="No. VA / Bank"
                value={letter.vaBank ?? ''}
                placeholder="8808 1234 5678 / Mandiri"
                id="letter-va-bank"
                disabled={disabled}
                onChange={set('vaBank')}
              />
            )}
          </div>

          {/* Field standalone (selalu tersedia, tidak tercetak sebagai judul
              blok) — memenuhi kontrak WYSIWYG tanpa menambah baris tabel A8.
              Input varian berbayar hanya versi tersembunyi BILA baris cetaknya
              kosong, supaya setiap field selalu punya tepat satu input. */}
          <div className="sr-only">
            <LabeledText
              value={letter.namaEvent}
              placeholder="Nama acara"
              id="letter-nama-event"
              disabled={disabled}
              errors={errors.namaEvent}
              onChange={set('namaEvent')}
            />
            <LabeledText
              value={letter.nomorTelepon}
              placeholder="Nomor telepon EO"
              id="letter-nomor-telepon"
              disabled={disabled}
              onChange={set('nomorTelepon')}
            />
            {!biayaTerisi && (
              <LabeledText
                value={letter.biayaKebersihan ?? ''}
                placeholder="900.901"
                id="letter-biaya-kebersihan-input"
                disabled={disabled}
                onChange={set('biayaKebersihan')}
              />
            )}
            {!vaTerisi && (
              <LabeledText
                value={letter.vaBank ?? ''}
                placeholder="8808 1234 5678"
                id="letter-va-bank-input"
                disabled={disabled}
                onChange={set('vaBank')}
              />
            )}
          </div>

          {/* A9 — penutup resmi tunggal */}
          <div className="mt-4 shrink-0 text-justify">
            <p>Demikian kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.</p>
          </div>

          {/* A10/A11 — dua kolom tanda tangan: mall kiri, EO kanan */}
          <div className="mt-10 flex grow justify-between">
            <div className="w-1/2 pr-4">
              <p>Hormat kami,</p>
              <div className="h-14" />
              <LabeledText
                value={letter.penandatanganNama}
                placeholder="Nama penanda tangan mall"
                id="letter-penandatangan-nama"
                disabled={disabled}
                errors={errors.penandatanganNama}
                bold
                onChange={set('penandatanganNama')}
              />
              <LabeledText
                value={letter.penandatanganJabatan}
                placeholder="Pimpinan Unit"
                id="letter-penandatangan-jabatan"
                disabled={disabled}
                onChange={set('penandatanganJabatan')}
              />
            </div>
            <div className="w-1/2 pl-4">
              <p>Menyetujui,</p>
              <div className="h-14" />
              <LabeledText
                value={letter.menyetujuiNama}
                placeholder="Nama penyetuju EO"
                id="letter-menyetujui-nama"
                disabled={disabled}
                errors={errors.menyetujuiNama}
                bold
                onChange={set('menyetujuiNama')}
              />
              <LabeledText
                value={letter.menyetujuiOrg}
                placeholder="Nama organisasi EO"
                id="letter-menyetujui-org"
                disabled={disabled}
                onChange={set('menyetujuiOrg')}
              />
            </div>
          </div>

          {/* A2 — footer blok identitas PT (logo mall + ISO/UNAS + alamat).
              Pita hijau (green band) pada scan belum bisa direproduksi — TODO:
              ekstrak pita sebagai aset gambar dan tambahkan di sini + di PDF. */}
          <footer className="mt-8 shrink-0 border-t border-[var(--wf-rule)] pt-2">
            <div className="flex items-start gap-3 text-[8px] leading-snug text-[var(--wf-ink-muted)]">
              <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-10 w-auto shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-[var(--wf-ink)]">PT. Metropolitan Land Tbk.</p>
                <p>
                  M Gold Tower Office Wing suite ABCGH Lt. 12 &amp; A-H lt. 15, Jl. Letkol M.
                  Moeffreni Moe&apos;min, Kel. Pekayon Jaya, Kec. Bekasi Selatan, Kota Bekasi 17148
                </p>
                <p>Tel : +6221 2808 7777 Fax : +6221 2808 5555</p>
                <p>Website : www.metropolitanland.com</p>
              </div>
              <div className="min-w-0 shrink-0">
                <p className="font-bold text-[var(--wf-ink)]">Kantor Operasional</p>
                <p>Metropolitan Mall Bekasi Lt.3</p>
                <p>Jl. Letkol M. Moeffreni Moe&apos;min, Kel. Pekayon Jaya</p>
                <p>Kec. Bekasi Selatan, Kota Bekasi 17148</p>
                <p>Tel : +6221 885 5555 Fax : +6221 884 0283</p>
                <p>Website : www.malmetropolitan.com</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
