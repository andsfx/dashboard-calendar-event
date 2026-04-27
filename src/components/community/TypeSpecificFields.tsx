import { type OrganizationType } from '../../types';

interface Props {
  orgType: OrganizationType;
  typeSpecificData: Record<string, string | number>;
  onChange: (data: Record<string, string | number>) => void;
  inputClass: string;
  labelClass: string;
}

const COMMUNITY_TYPES = [
  'Musik', 'Dance', 'Seni & Kreatif', 'Gaming', 'Olahraga', 'Pendidikan',
  'Fotografi', 'Kuliner', 'Teknologi', 'Sosial', 'Lainnya',
];

const EDUCATION_LEVELS = ['SD', 'SMP', 'SMA/SMK', 'D3', 'S1/D4', 'S2', 'S3'];
const INSTITUTION_TYPES = ['Negeri', 'Swasta'];
const INDUSTRIES = ['Retail', 'F&B', 'Teknologi', 'Properti', 'Keuangan', 'Kesehatan', 'Pendidikan', 'Manufaktur', 'Media', 'Lainnya'];
const EVENT_PURPOSES = ['CSR', 'Team Building', 'Product Launch', 'Gathering', 'Seminar', 'Exhibition', 'Lainnya'];
const EO_SPECIALIZATIONS = ['Music & Concert', 'Sports', 'Exhibition', 'Wedding', 'Corporate', 'Festival', 'Lainnya'];
const CAMPUS_ORG_TYPES = ['BEM', 'UKM', 'Himpunan', 'Komunitas Kampus', 'Lainnya'];
const NGO_FOCUS_AREAS = ['Pendidikan', 'Kesehatan', 'Lingkungan', 'Kemanusiaan', 'Pemberdayaan', 'Seni & Budaya', 'Lainnya'];

function SelectField({ id, label, value, options, onChange, inputClass, labelClass, required }: {
  id: string; label: string; value: string; options: string[];
  onChange: (v: string) => void; inputClass: string; labelClass: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label} {required && <span className="text-rose-500">*</span>}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)} required={required} className={inputClass}>
        <option value="">Pilih...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextField({ id, label, value, onChange, inputClass, labelClass, placeholder, required, type = 'text' }: {
  id: string; label: string; value: string; placeholder?: string;
  onChange: (v: string) => void; inputClass: string; labelClass: string; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label} {required && <span className="text-rose-500">*</span>}</label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} className={inputClass} />
    </div>
  );
}

function NumberField({ id, label, value, onChange, inputClass, labelClass, placeholder }: {
  id: string; label: string; value: number | string; placeholder?: string;
  onChange: (v: number) => void; inputClass: string; labelClass: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input id={id} type="number" min={0} value={value} onChange={e => onChange(Number(e.target.value) || 0)} placeholder={placeholder} className={inputClass} />
    </div>
  );
}

export function TypeSpecificFields({ orgType, typeSpecificData, onChange, inputClass, labelClass }: Props) {
  const d = typeSpecificData;
  const set = (key: string, value: string | number) => onChange({ ...d, [key]: value });

  switch (orgType) {
    case 'community':
      return (
        <>
          <SelectField id="ts-community-type" label="Tipe Komunitas" value={String(d.communitySubType || '')} options={COMMUNITY_TYPES} onChange={v => set('communitySubType', v)} inputClass={inputClass} labelClass={labelClass} required />
          <NumberField id="ts-member-count" label="Jumlah Anggota" value={d.memberCount || ''} onChange={v => set('memberCount', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Estimasi jumlah anggota" />
          <TextField id="ts-social" label="Link Media Sosial" value={String(d.socialLinks || '')} onChange={v => set('socialLinks', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Link Instagram, TikTok, dll" />
        </>
      );

    case 'school':
      return (
        <>
          <SelectField id="ts-edu-level" label="Jenjang Pendidikan" value={String(d.educationLevel || '')} options={EDUCATION_LEVELS} onChange={v => set('educationLevel', v)} inputClass={inputClass} labelClass={labelClass} required />
          <SelectField id="ts-inst-type" label="Tipe Institusi" value={String(d.institutionType || '')} options={INSTITUTION_TYPES} onChange={v => set('institutionType', v)} inputClass={inputClass} labelClass={labelClass} />
          <NumberField id="ts-student-count" label="Jumlah Siswa/Mahasiswa" value={d.studentCount || ''} onChange={v => set('studentCount', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Estimasi jumlah" />
          <TextField id="ts-advisor" label="Nama Guru/Dosen Pembimbing" value={String(d.advisorName || '')} onChange={v => set('advisorName', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Nama pembimbing" />
        </>
      );

    case 'company':
      return (
        <>
          <SelectField id="ts-industry" label="Industri" value={String(d.industry || '')} options={INDUSTRIES} onChange={v => set('industry', v)} inputClass={inputClass} labelClass={labelClass} required />
          <NumberField id="ts-employee-count" label="Jumlah Karyawan" value={d.employeeCount || ''} onChange={v => set('employeeCount', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Estimasi jumlah" />
          <SelectField id="ts-purpose" label="Tujuan Event" value={String(d.eventPurpose || '')} options={EVENT_PURPOSES} onChange={v => set('eventPurpose', v)} inputClass={inputClass} labelClass={labelClass} />
        </>
      );

    case 'eo':
      return (
        <>
          <SelectField id="ts-specialization" label="Spesialisasi" value={String(d.specialization || '')} options={EO_SPECIALIZATIONS} onChange={v => set('specialization', v)} inputClass={inputClass} labelClass={labelClass} required />
          <TextField id="ts-portfolio" label="Portfolio / Event Sebelumnya" value={String(d.portfolio || '')} onChange={v => set('portfolio', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Sebutkan event yang pernah dihandle" />
          <NumberField id="ts-team-size" label="Jumlah Tim" value={d.teamSize || ''} onChange={v => set('teamSize', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Jumlah anggota tim" />
        </>
      );

    case 'campus':
      return (
        <>
          <TextField id="ts-university" label="Nama Universitas/Kampus" value={String(d.universityName || '')} onChange={v => set('universityName', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Nama kampus" required />
          <TextField id="ts-faculty" label="Fakultas / Jurusan" value={String(d.faculty || '')} onChange={v => set('faculty', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Fakultas atau jurusan" />
          <SelectField id="ts-campus-org-type" label="Tipe Organisasi" value={String(d.campusOrgType || '')} options={CAMPUS_ORG_TYPES} onChange={v => set('campusOrgType', v)} inputClass={inputClass} labelClass={labelClass} required />
          <NumberField id="ts-member-count" label="Jumlah Anggota" value={d.memberCount || ''} onChange={v => set('memberCount', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Estimasi jumlah" />
        </>
      );

    case 'government':
      return (
        <>
          <TextField id="ts-department" label="Departemen / Dinas" value={String(d.department || '')} onChange={v => set('department', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Nama departemen" required />
          <TextField id="ts-program" label="Nama Program" value={String(d.programName || '')} onChange={v => set('programName', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Program yang akan dijalankan" />
        </>
      );

    case 'ngo':
      return (
        <>
          <SelectField id="ts-focus" label="Bidang Fokus" value={String(d.focusArea || '')} options={NGO_FOCUS_AREAS} onChange={v => set('focusArea', v)} inputClass={inputClass} labelClass={labelClass} required />
          <TextField id="ts-reg-number" label="Nomor Registrasi (opsional)" value={String(d.registrationNumber || '')} onChange={v => set('registrationNumber', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Nomor akta/registrasi" />
          <TextField id="ts-program" label="Deskripsi Program" value={String(d.programDescription || '')} onChange={v => set('programDescription', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Program yang akan dijalankan" />
        </>
      );

    case 'other':
      return (
        <>
          <TextField id="ts-org-type-custom" label="Tipe Organisasi" value={String(d.customOrgType || '')} onChange={v => set('customOrgType', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Jelaskan tipe organisasi kamu" required />
          <TextField id="ts-additional" label="Informasi Tambahan" value={String(d.additionalInfo || '')} onChange={v => set('additionalInfo', v)} inputClass={inputClass} labelClass={labelClass} placeholder="Info tambahan yang relevan" />
        </>
      );

    default:
      return null;
  }
}
