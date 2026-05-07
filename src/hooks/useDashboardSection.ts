import { useLocation } from 'react-router-dom';

export function useDashboardSection() {
  const location = useLocation();
  const path = location.pathname;

  // Determine which section should be visible based on route
  const sections = {
    overview: path === '/dashboard',
    analytics: path === '/dashboard/analytics',
    events: path === '/dashboard/events',
    drafts: path === '/dashboard/drafts',
    themes: path === '/dashboard/themes',
    registrations: path === '/dashboard/registrations',
    survey: path === '/dashboard/survey',
    users: path === '/dashboard/users',
    activityLog: path === '/dashboard/activity-log',
  };

  return sections;
}
