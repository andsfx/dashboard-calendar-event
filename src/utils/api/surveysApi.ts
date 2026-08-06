/**
 * Surveys, Community, & Letters domain API — re-exports from supabaseApi barrel.
 * Import from here for tenant survey, community registration, and generated letter operations.
 */
export {
  fetchCommunityRegistrations,
  updateRegistrationStatus,
  submitCommunityRegistration,
  fetchGeneratedLetters,
  createGeneratedLetter,
  updateGeneratedLetter,
  deleteGeneratedLetter,
  fetchTenantSurveys,
  fetchPublicTenantSurveyResults,
  fetchTenantSurveyById,
  checkTenantSurveyDuplicate,
  createTenantSurvey,
  updateTenantSurvey,
  submitTenantSurvey,
  reviewTenantSurvey,
  deleteTenantSurvey,
  fetchTenantSurveyAnalytics,
  fetchTenantSurveyEventAnalytics,
  fetchTenantSurveyMonthlyTrend,
  fetchPublicTenantSurveyMonthlyTrend,
  fetchTenantSurveyEventSummary,
  fetchPublicTenantSurveyEvent,
  fetchPublicTenantSurveyEvents,
  fetchTenantDetail,
  fetchActiveTenants,
  fetchTenantRoster,
  fetchPublicTenantRoster,
  checkPublicTenantSurveyDuplicate,
  submitPublicTenantSurvey,
} from '../supabaseApi';

// Re-export types that consumers import from supabaseApi
export type {
  PublicTenantSurveyEventInfo,
  TenantDropdownOption,
  TenantRosterItem,
  PublicTenantSurveySubmission,
} from '../supabaseApi';
