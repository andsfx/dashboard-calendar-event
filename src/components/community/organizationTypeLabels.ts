import type { OrganizationType } from '../../types';

/** Label bahasa Indonesia untuk 8 tipe organisasi (canonical enum). */
export const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  community: 'Komunitas',
  school: 'Institusi pendidikan',
  company: 'Perusahaan',
  eo: 'Event organizer',
  campus: 'Organisasi siswa / kampus',
  government: 'Instansi pemerintah',
  ngo: 'NGO / yayasan',
  other: 'Lainnya',
};