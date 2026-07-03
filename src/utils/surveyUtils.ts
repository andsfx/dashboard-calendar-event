import type { TenantEventSurvey } from '../types';

/**
 * Detect whether a survey is v3 (categorical) or v2 (legacy rating-based).
 *
 * v3 surveys have a non-empty `kenaikan_traffic` (required enum value).
 * v2 surveys never touch `kenaikan_traffic` — the column stays NULL or ''.
 *
 * Truthy check handles null, undefined, and '' (empty draft) uniformly.
 */
export function isV3Survey(survey: TenantEventSurvey): boolean {
  return !!survey.kenaikan_traffic;
}
