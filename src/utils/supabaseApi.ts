// ─── Domain API barrel re-exports ─────────────────────────────────
// All implementations moved to src/utils/api/ (eventsApi, draftsApi, albumsApi, surveysApi).
// This file re-exports for backward compatibility.

export {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  batchCreateEvents,
  deleteRecurringSeries,
  createAnnualTheme,
  updateAnnualTheme,
  deleteAnnualTheme,
  fetchAnnualThemesPublic,
  fetchSiteSettings,
  updateSiteSettings,
  fetchDraftEvents,
} from './api/eventsApi';

export {
  createDraftEvent,
  updateDraftEvent,
  deleteDraftEvent,
  publishDraftEvent,
  restoreDraftEvent,
} from './api/draftsApi';

export {
  fetchEventPhotos,
  uploadEventPhoto,
  deleteEventPhoto,
  createEventPhotoRecord,
  linkAlbumToEvent,
  updateEventPhotoOrder,
  fetchAlbums,
  fetchAlbumBySlug,
  createAlbum,
  deleteAlbum,
  setAlbumCover,
  uploadToR2,
  deleteFromR2,
  uploadAlbumPhoto,
  deleteAlbumPhoto,
} from './api/albumsApi';

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
} from './api/surveysApi';

export {
  fetchNewsArticles,
  fetchNewsArticleBySlug,
  fetchAllNewsArticles,
  createNewsArticle,
  updateNewsArticle,
  deleteNewsArticle,
} from './api/newsApi';

export {
  fetchSponsorEventsWithProposals,
  submitSponsorLead,
  fetchAllSponsorLeads,
  updateSponsorLeadStatus,
  deleteSponsorLead,
  setEventProposal,
  deleteEventProposal,
} from './api/sponsorshipApi';

export type {
  PublicTenantSurveyEventInfo,
  TenantDropdownOption,
  TenantRosterItem,
  PublicTenantSurveySubmission,
} from './api/surveysApi';