import type { TenantEventSurvey } from '../types';

/**
 * Detect whether a survey is v3 (public, categorical) or v2 (authenticated, rating-based).
 *
 * v3 surveys always have `kenaikan_traffic` set (required field in public form).
 * v2 surveys never touch `kenaikan_traffic` — the column stays NULL.
 *
 * This invariant is guaranteed by:
 * - v2 form (TenantSurveyForm.tsx) has no traffic/sales fields
 * - v2 API handler (handleCreate/handleUpdate) does not process kenaikan_traffic
 * - v3 public submit requires kenaikan_traffic (validated by validatePublicSubmission)
 */
export function isV3Survey(survey: TenantEventSurvey): boolean {
  return survey.kenaikan_traffic !== null && survey.kenaikan_traffic !== undefined;
}
