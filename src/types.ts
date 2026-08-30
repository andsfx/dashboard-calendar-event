/** Operational Event status — derived from dates (SPEC §3.3 / ADR 002). */
export type EventOperationalStatus = 'upcoming' | 'ongoing' | 'past';
/**
 * Event row status including legacy internal `draft` flag.
 * `draft` here is NOT the Draft antrian entity (see DraftEventItem / CONTEXT.md).
 * Public surfaces must hide `draft`. Prefer EventOperationalStatus for new code.
 *
 * TECH DEBT (#7 design-thinking): remove `| 'draft'` and use `isDraft?: boolean`
 * once FilterBar / StatusBadge / KanbanView / eventUtils no longer key on
 * status==='draft'. Blast radius high — do as dedicated migration.
 */
export type EventStatus = EventOperationalStatus | 'draft';
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

// ─── Shared base ────────────────────────────────────────────────
// ponytail: shared base for Event/Draft — add fields here, both inherit.
// When adding new event fields, extend EventBase instead of both interfaces.

export interface EventBase {
  dateStr: string;
  dateEnd?: string;
  day: string;
  jam: string;
  acara: string;
  lokasi: string;
  eo: string;
  organizationId?: string;
  pic: string;
  phone: string;
  keterangan: string;
  month: string;
  category: string;
  categories: string[];
  priority: 'high' | 'medium' | 'low';
  eventModel: EventModel;
  eventNominal: string;
  eventModelNotes: string;
  isMultiDay?: boolean;
  dayTimeSlots?: DayTimeSlot[];
  eventType?: EventType;
  recurrenceGroupId?: string;
  isRecurring?: boolean;
}

export interface EventItem extends EventBase {
  id: string;
  sheetRow?: number;
  rowIndex: number;
  tanggal: string;
  status: EventStatus;
  sourceDraftId?: string;
  posterUrl?: string;
}

export interface DraftEventItem extends EventBase {
  id: string;
  sheetRow?: number;
  rowIndex: number;
  tanggal: string;
  internalNote: string;
  progress: DraftProgress;
  published: boolean;
  publishedAt?: string;
  deleted: boolean;
  deletedAt?: string;
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
  proposalFileUrl: string;
  proposalFileName: string;
  proposalFileSize: number;
}

/** Organisasi publik di halaman direktori community (tanpa PII). */
export interface CommunityDirectoryOrganization {
  id: string;
  name: string;
  type: OrganizationType;
  description?: string;
  link?: string;
  eventCount: number;
  upcomingEventCount: number;
  source?: 'registered' | 'event-history';
}

export interface EventPhoto {
  id: string;
  url: string;
  caption: string;
  eventDate: string;
  sortOrder: number;
  albumId?: string;
}

export interface EventArea {
  id: string;
  name: string;
  description: string;
  coverPhotoUrl: string;
  sortOrder: number;
  isActive: boolean;
  photoCount?: number;
}

export interface AreaPhoto {
  id: string;
  url: string;
  caption: string;
  areaId: string;
  sortOrder: number;
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

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  author: string;
  status: 'draft' | 'published';
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type SponsorLeadStatus = 'pending' | 'contacted' | 'agreed' | 'declined';

export interface EventProposal {
  id: string;
  eventId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
}

export interface SponsorEventLight {
  id: string;
  dateStr: string;
  acara: string;
  lokasi: string;
  jam: string;
  eo: string;
}

export interface EventProposalEvent {
  event: SponsorEventLight;
  proposal: EventProposal;
}

export interface SponsorLead {
  id: string;
  eventId: string;
  eventAcara?: string;
  eventDate?: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  message: string;
  status: SponsorLeadStatus;
  internalNotes: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SponsorLeadInput {
  eventId: string;
  companyName: string;
  contactName: string;
  phone: string;
  email?: string;
  message?: string;
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

export interface GeneratedLetter {
  id: string;
  eventId?: string;
  draftEventId?: string;
  letterData: LetterRequestItem;
  pdfUrl?: string;
  pdfBase64?: string;
  createdAt: string;
  createdBy?: string;
  status: 'active' | 'archived' | 'deleted';
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

// ─── Tenant Event Surveys (EO Self-Assessment) ──────────────────

export type TenantSurveyStatus = 'draft' | 'submitted' | 'reviewed';

/**
 * Tenant-facing survey ratings (1-5 scale).
 * Maps directly to columns in tenant_event_surveys table.
 */
export interface TenantSurveyRatings {
  venue_rating?: number | null;
  management_rating?: number | null;
  event_organization_rating?: number | null;
  booth_facility_rating?: number | null;
  overall_rating?: number | null;
}

/** Full survey record as stored in Supabase */
export interface TenantEventSurvey extends TenantSurveyRatings {
  id: string;
  event_id: string;
  tenant_user_id: string | null;
  tenant_name: string;
  tenant_organization: string;
  tenant_email: string;
  tenant_phone: string;
  business_category: 'fnb' | 'retail' | 'jasa' | 'other';
  business_subcategory: string;
  sales_lift_pct?: number | null;
  traffic_lift_pct?: number | null;
  feedback_comment: string;
  improvement_suggestion: string;
  status: TenantSurveyStatus;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string;
  created_at: string;
  updated_at: string;
  nama_gerai?: string | null;
  lokasi_zona?: string | null;
  kategori?: string | null;
  kenaikan_traffic?: string | null;
  kenaikan_sales?: string | null;
  feedback_teks?: string | null;
  tenant_id?: string | null;
  pic_name?: string | null;
  pic_phone?: string | null;
}

/**
 * Form data for creating/editing a tenant survey.
 * The four rating fields are required for submission; comments are optional.
 */
export interface TenantSurveyFormData {
  event_id: string;
  tenant_name: string;
  tenant_organization?: string;
  tenant_email?: string;
  tenant_phone?: string;
  business_category: 'fnb' | 'retail' | 'jasa' | 'other';
  business_subcategory: string;
  sales_lift_pct?: number | null;
  traffic_lift_pct?: number | null;
  venue_rating?: number | null;
  management_rating?: number | null;
  event_organization_rating?: number | null;
  booth_facility_rating?: number | null;
  overall_rating?: number | null;
  feedback_comment?: string;
  improvement_suggestion?: string;
  nama_gerai?: string | null;
  lokasi_zona?: string | null;
  kategori?: string | null;
  kenaikan_traffic?: string | null;
  kenaikan_sales?: string | null;
  feedback_teks?: string | null;
  tenant_id?: string | null;
  pic_name?: string | null;
  pic_phone?: string | null;
}

/** Analytics row (per tenant) — includes v3 bucket counts from RPC v4 */
export interface TenantSurveyAnalytics {
  tenant_user_id: string | null;
  tenant_organization: string;
  total_surveys: number;
  submitted_surveys: number;
  avg_venue_rating: number | null;
  avg_management_rating: number | null;
  avg_event_organization_rating: number | null;
  avg_booth_facility_rating: number | null;
  avg_overall_rating: number | null;
  last_survey_at: string | null;
  traffic_signifikan: number;
  traffic_sedikit_naik: number;
  traffic_tidak_ada: number;
  traffic_menurun: number;
  sales_no_change: number;
  sales_lt_10: number;
  sales_10_30: number;
  sales_30_50: number;
  sales_gt_50: number;
}

/** Per-event analytics row (group=event from RPC v4) */
export interface TenantSurveyEventAnalytics {
  event_id: string;
  total_surveys: number;
  submitted_surveys: number;
  unique_tenants: number;
  unique_categories: number;
  avg_venue_rating: number | null;
  avg_management_rating: number | null;
  avg_event_organization_rating: number | null;
  avg_booth_facility_rating: number | null;
  avg_overall_rating: number | null;
  last_survey_at: string | null;
  traffic_signifikan: number;
  traffic_sedikit_naik: number;
  traffic_tidak_ada: number;
  traffic_menurun: number;
  sales_no_change: number;
  sales_lt_10: number;
  sales_10_30: number;
  sales_30_50: number;
  sales_gt_50: number;
}

/** Monthly trend row (group=month from RPC v4, last 12 months) */
export interface TenantSurveyMonthlyTrend {
  period: string;
  total_submissions: number;
  v2_count: number;
  v3_count: number;
  avg_venue_rating: number | null;
  avg_management_rating: number | null;
  avg_event_organization_rating: number | null;
  avg_booth_facility_rating: number | null;
  avg_overall_rating: number | null;
  traffic_signifikan: number;
  traffic_sedikit_naik: number;
  traffic_tidak_ada: number;
  traffic_menurun: number;
  sales_no_change: number;
  sales_lt_10: number;
  sales_10_30: number;
  sales_30_50: number;
  sales_gt_50: number;
}

/** Per-event combined summary (tenant self-assessment + visitor ratings) */
export interface TenantSurveyEventSummary {
  event_id: string;
  tenant_name: string;
  tenant_organization: string;
  tenant_survey_status: TenantSurveyStatus | 'none';
  venue_rating: number | null;
  management_rating: number | null;
  event_organization_rating: number | null;
  booth_facility_rating: number | null;
  overall_rating: number | null;
  feedback_comment: string;
  improvement_suggestion: string;
  tenant_survey_created_at: string | null;
  total_visitor_responses: number;
  visitor_mall_overall: number | null;
  visitor_eo_overall: number | null;
}

/** Result of checking if a tenant already submitted for an event */
export interface DuplicateCheckResult {
  alreadySubmitted: boolean;
  existingSurveyId?: string;
}

/** Per-event tenant survey config */
export interface TenantSurveyConfig {
  id?: string;
  event_id: string;
  is_active: boolean;
  activated_at?: string | null;
  deactivated_at?: string | null;
}
