/**
 * Events domain API — re-exports from supabaseApi barrel.
 * Import from here for event-specific operations.
 * Full backward compat: `import { fetchEvents } from '../utils/supabaseApi'` still works.
 */
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
} from '../supabaseApi';
