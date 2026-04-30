export type EventStatus = 'draft' | 'upcoming' | 'ongoing' | 'past';
export type EventModel = '' | 'free' | 'bayar' | 'support';
export type DraftProgress = 'draft' | 'confirm' | 'cancel';
export type HolidayType = 'libur_nasional' | 'cuti_bersama';
export type EventType = 'single' | 'multi_day' | 'recurring';
export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export type ViewMode = 'table' | 'calendar' | 'kanban' | 'timeline';
export type Theme = 'light' | 'dark';

export interface DayTimeSlot {
  date: string;      // "2025-06-12"
  jam: string;       // "10:00 - 12:00" (bisa kosong)
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  daysOfWeek?: number[];    // [0]=Minggu, [1]=Senin, ..., [6]=Sabtu
  dayOfMonth?: number;      // 1-31 (untuk monthly)
  interval?: number;        // untuk custom: setiap N hari
  endDate: string;          // "2026-06-30"
}

export interface EventItem {
  id: string;
  sheetRow?: number;
  rowIndex: number;
  tanggal: string;   // "12 Juni 2025"
  dateStr: string;   // "2025-06-12"
  dateEnd?: string;  // "2025-06-15" (untuk multi-day)
  day: string;       // "Kamis"
  jam: string;       // "10:00 - 12:00"
  acara: string;
  lokasi: string;
  eo: string;
  pic: string;
  phone: string;
  keterangan: string;
  month: string;     // "Juni"
  status: EventStatus;
  category: string;
  categories: string[];
  priority: 'high' | 'medium' | 'low';
  eventModel: EventModel;
  eventNominal: string;
  eventModelNotes: string;
  sourceDraftId?: string;
  isMultiDay?: boolean;           // true jika multi-day
  dayTimeSlots?: DayTimeSlot[];   // jam untuk setiap hari
  eventType?: EventType;          // 'single' | 'multi_day' | 'recurring'
  recurrenceGroupId?: string;     // shared ID untuk semua event dalam 1 series
  isRecurring?: boolean;          // true jika bagian dari recurring series
}

export interface DraftEventItem {
  id: string;
  sheetRow?: number;
  rowIndex: number;
  tanggal: string;
  dateStr: string;
  dateEnd?: string;  // "2025-06-15" (untuk multi-day)
  day: string;
  jam: string;
  acara: string;
  lokasi: string;
  eo: string;
  pic: string;
  phone: string;
  keterangan: string;
  internalNote: string;
  month: string;
  category: string;
  categories: string[];
  priority: 'high' | 'medium' | 'low';
  eventModel: EventModel;
  eventNominal: string;
  eventModelNotes: string;
  progress: DraftProgress;
  published: boolean;
  publishedAt?: string;
  deleted: boolean;
  deletedAt?: string;
  isMultiDay?: boolean;           // true jika multi-day
  dayTimeSlots?: DayTimeSlot[];   // jam untuk setiap hari
  eventType?: EventType;          // 'single' | 'multi_day' | 'recurring'
  recurrenceGroupId?: string;     // shared ID untuk semua event dalam 1 series
  isRecurring?: boolean;          // true jika bagian dari recurring series
}

export interface AnnualTheme {
  id: string;
  sheetRow?: number;
  name: string;
  dateStart: string;
  dateEnd: string;
  color: string;
}

export interface HolidayItem {
  id: string;
  sheetRow?: number;
  tanggal: string;
  dateStr: string;
  day: string;
  month: string;
  name: string;
  type: HolidayType;
  description: string;
}

export type OrganizationType = 'community' | 'school' | 'company' | 'eo' | 'campus' | 'government' | 'ngo' | 'other';

export type RegistrationStatus = 'pending' | 'reviewed' | 'approved' | 'rejected';

export interface CommunityRegistration {
  id: string;
  communityName: string;
  communityType: string;
  pic: string;
  phone: string;
  email: string;
  instagram: string;
  description: string;
  preferredDate: string;
  status: RegistrationStatus;
  adminNote: string;
  createdAt: string;
  organizationType: OrganizationType;
  organizationName: string;
  typeSpecificData: Record<string, string | number>;
}

export interface EventPhoto {
  id: string;
  url: string;
  caption: string;
  eventDate: string;
  sortOrder: number;
  albumId?: string;
}

export interface PhotoAlbum {
  id: string;
  name: string;
  slug: string;
  description: string;
  eventDate: string;
  coverPhotoUrl: string;
  sortOrder: number;
  photoCount?: number;
  eventId?: string;
  lokasi?: string;
  themeId?: string;
}

export interface LetterRequestItem {
  tanggalSurat: string;
  nomorSurat: string;
  namaEO: string;
  penanggungJawab: string;
  alamatEO: string;
  namaEvent: string;
  lokasi: string;
  hariTanggalPelaksanaan: string;
  waktuPelaksanaan: string;
  nomorTelepon: string;
  hariTanggalLoading: string;
  waktuLoading: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

// ─── Survey Kepuasan Pelanggan ────────────────────────────────────

export type SurveyType = 'organizer' | 'public';

export interface SurveyResponse {
  id: string;
  event_id: string;
  survey_type: SurveyType;
  respondent_name: string;
  respondent_email: string;
  respondent_phone: string;
  respondent_organization: string;
  // Mall ratings (1-10)
  mall_cleanliness: number;
  mall_staff_service: number;
  mall_coordination: number;
  mall_security: number;
  mall_comment: string;
  // EO ratings (1-10, null for organizer survey)
  eo_event_quality: number | null;
  eo_organization: number | null;
  eo_committee_service: number | null;
  eo_promotion_accuracy: number | null;
  eo_recommendation: number | null;
  eo_comment: string;
  general_comment: string;
  device_fingerprint: string;
  created_at: string;
}

export interface SurveySummary {
  event_id: string;
  total_responses: number;
  organizer_responses: number;
  public_responses: number;
  mall_avg: {
    cleanliness: number;
    staff_service: number;
    coordination: number;
    security: number;
    overall: number;
  } | null;
  eo_avg: {
    event_quality: number;
    organization: number;
    committee_service: number;
    promotion_accuracy: number;
    recommendation: number;
    overall: number;
  } | null;
}

export interface SurveyConfig {
  id: string;
  event_id: string;
  is_active: boolean;
  auto_activate_after_event: boolean;
  activated_at: string | null;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}
