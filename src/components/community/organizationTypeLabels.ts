import type { OrganizationType } from '../../types';

/** Label bahasa Indonesia untuk 8 tipe organisasi (canonical enum). */
export const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  community: 'Komunitas',
  school: 'Sekolah / Universitas',
  company: 'Perusahaan',
  eo: 'Event Organizer',
  campus: 'Organisasi Kampus',
  government: 'Instansi Pemerintah',
  ngo: 'NGO / Yayasan',
  other: 'Lainnya',
};