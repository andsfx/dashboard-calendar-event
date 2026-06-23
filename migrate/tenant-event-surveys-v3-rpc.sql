-- ============================================================================
-- TENANT EVENT SURVEYS V3 — RPC Function Updates
-- Metropolitan Mall Bekasi
-- ============================================================================
--
-- PURPOSE: Update get_tenant_survey_analytics and get_tenant_survey_event_summary
--          RPC functions to expose v3 field aggregates (kenaikan_traffic,
--          kenaikan_sales) and v3 per-survey fields (nama_gerai, lokasi_zona,
--          kategori, feedback_teks).
--
-- v3 schema changes (from tenant-event-surveys-v3.sql):
--   - All rating columns are now NULLABLE (so AVG FILTER still works gracefully)
--   - New columns: nama_gerai, lokasi_zona, kategori, kenaikan_traffic,
--     kenaikan_sales, feedback_teks, tenant_id
--   - Rating columns are now DEPRECATED for new surveys (v3 tenants do not
--     submit ratings, only v2 and earlier did)
--
-- Behavior:
--   - Existing AVG(rating) columns kept — they use FILTER (WHERE rating IS NOT
--     NULL) so they return NULL when no ratings exist (v3-only events).
--   - New COUNT(*) FILTER aggregates added for kenaikan_traffic and
--     kenaikan_sales category buckets.
--   - Per-survey v3 fields exposed in the event summary RPC.
--
-- IDEMPOTENCY: CREATE OR REPLACE FUNCTION — safe to run multiple times.
-- Original migration file (migrate/tenant-event-surveys.sql) is NOT modified.
--
-- ============================================================================


-- ============================================================================
-- 1. get_tenant_survey_analytics — add v3 field aggregates
-- ============================================================================
-- Two SELECT branches (admin/superadmin AND scoped by tenant_user_id) both
-- get the new traffic/sales bucket columns. Existing rating AVG columns
-- are kept (with deprecation comment) since v2 surveys still use them.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_survey_analytics(p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result JSON;
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE public.users.id = auth.uid()
  LIMIT 1;

  IF user_role IN ('superadmin', 'admin') THEN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO result
    FROM (
      SELECT
        tenant_user_id,
        tenant_organization,
        COUNT(*) AS total_surveys,
        COUNT(*) FILTER (WHERE status = 'submitted') AS submitted_surveys,
        -- DEPRECATED: new v3 surveys do not have ratings. These columns will return NULL for events with only v3 surveys.
        ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2) AS avg_venue_rating,
        -- DEPRECATED: new v3 surveys do not have ratings. These columns will return NULL for events with only v3 surveys.
        ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2) AS avg_management_rating,
        -- DEPRECATED: new v3 surveys do not have ratings. These columns will return NULL for events with only v3 surveys.
        ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2) AS avg_event_organization_rating,
        -- DEPRECATED: new v3 surveys do not have ratings. These columns will return NULL for events with only v3 surveys.
        ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2) AS avg_booth_facility_rating,
        -- DEPRECATED: new v3 surveys do not have ratings. These columns will return NULL for events with only v3 surveys.
        ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2) AS avg_overall_rating,
        MAX(created_at) AS last_survey_at,
        -- New v3 field aggregates
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Signifikan') AS traffic_signifikan,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Sedikit Naik') AS traffic_sedikit_naik,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Tidak Ada') AS traffic_tidak_ada,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Menurun') AS traffic_menurun,
        COUNT(*) FILTER (WHERE kenaikan_sales = 'Tidak ada kenaikan / Sama saja') AS sales_no_change,
        COUNT(*) FILTER (WHERE kenaikan_sales = '< 10%') AS sales_lt_10,
        COUNT(*) FILTER (WHERE kenaikan_sales = '10% - 30%') AS sales_10_30,
        COUNT(*) FILTER (WHERE kenaikan_sales = '30% - 50%') AS sales_30_50,
        COUNT(*) FILTER (WHERE kenaikan_sales = '> 50%') AS sales_gt_50
      FROM tenant_event_surveys
      WHERE status IN ('submitted', 'reviewed')
      GROUP BY tenant_user_id, tenant_organization
    ) t;
  ELSE
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO result
    FROM (
      SELECT
        tenant_user_id,
        tenant_organization,
        COUNT(*) AS total_surveys,
        COUNT(*) FILTER (WHERE status = 'submitted') AS submitted_surveys,
        -- DEPRECATED: new v3 surveys do not have ratings. These columns will return NULL for events with only v3 surveys.
        ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2) AS avg_venue_rating,
        -- DEPRECATED: new v3 surveys do not have ratings. These columns will return NULL for events with only v3 surveys.
        ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2) AS avg_management_rating,
        -- DEPRECATED: new v3 surveys do not have ratings. These columns will return NULL for events with only v3 surveys.
        ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2) AS avg_event_organization_rating,
        -- DEPRECATED: new v3 surveys do not have ratings. These columns will return NULL for events with only v3 surveys.
        ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2) AS avg_booth_facility_rating,
        -- DEPRECATED: new v3 surveys do not have ratings. These columns will return NULL for events with only v3 surveys.
        ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2) AS avg_overall_rating,
        MAX(created_at) AS last_survey_at,
        -- New v3 field aggregates
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Signifikan') AS traffic_signifikan,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Sedikit Naik') AS traffic_sedikit_naik,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Tidak Ada') AS traffic_tidak_ada,
        COUNT(*) FILTER (WHERE kenaikan_traffic = 'Menurun') AS traffic_menurun,
        COUNT(*) FILTER (WHERE kenaikan_sales = 'Tidak ada kenaikan / Sama saja') AS sales_no_change,
        COUNT(*) FILTER (WHERE kenaikan_sales = '< 10%') AS sales_lt_10,
        COUNT(*) FILTER (WHERE kenaikan_sales = '10% - 30%') AS sales_10_30,
        COUNT(*) FILTER (WHERE kenaikan_sales = '30% - 50%') AS sales_30_50,
        COUNT(*) FILTER (WHERE kenaikan_sales = '> 50%') AS sales_gt_50
      FROM tenant_event_surveys
      WHERE status IN ('submitted', 'reviewed')
        AND tenant_user_id = COALESCE(p_user_id, auth.uid())
      GROUP BY tenant_user_id, tenant_organization
    ) t;
  END IF;

  RETURN result;
END;
$$;


-- ============================================================================
-- 2. get_tenant_survey_event_summary — expose v3 per-survey fields
-- ============================================================================
-- Keeps existing rating columns (will be NULL for v3 surveys).
-- Adds v3 per-survey columns: nama_gerai, lokasi_zona, kategori,
-- kenaikan_traffic, kenaikan_sales, feedback_teks.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_survey_event_summary(p_event_id TEXT)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    row_to_json(t),
    json_build_object('event_id', p_event_id, 'tenant_survey_status', 'none')
  )
  FROM (
    SELECT
      tes.event_id,
      tes.tenant_name,
      tes.tenant_organization,
      tes.status AS tenant_survey_status,
      tes.venue_rating,
      tes.management_rating,
      tes.event_organization_rating,
      tes.booth_facility_rating,
      tes.overall_rating,
      tes.nama_gerai,
      tes.lokasi_zona,
      tes.kategori,
      tes.kenaikan_traffic,
      tes.kenaikan_sales,
      tes.feedback_teks,
      tes.feedback_comment,
      tes.improvement_suggestion,
      tes.created_at AS tenant_survey_created_at,
      COALESCE(sr.total_visitor_responses, 0) AS total_visitor_responses,
      sr.visitor_mall_overall,
      sr.visitor_eo_overall
    FROM tenant_event_surveys tes
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS total_visitor_responses,
        ROUND(AVG((mall_cleanliness + mall_staff_service + mall_coordination + mall_security)::numeric / 4), 1) AS visitor_mall_overall,
        ROUND(AVG(
          (COALESCE(eo_event_quality, 0) + COALESCE(eo_organization, 0) +
           COALESCE(eo_committee_service, 0) + COALESCE(eo_promotion_accuracy, 0) +
           COALESCE(eo_recommendation, 0))::numeric / 5
        ) FILTER (WHERE survey_type = 'public'), 1) AS visitor_eo_overall
      FROM survey_responses
      WHERE survey_responses.event_id = tes.event_id
    ) sr ON true
    WHERE tes.event_id = p_event_id
    ORDER BY tes.created_at DESC
    LIMIT 1
  ) t;
$$;
