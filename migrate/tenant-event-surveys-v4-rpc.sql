-- ============================================================================
-- TENANT EVENT SURVEYS V4 — RPC Function with Explicit Auth Params
-- Metropolitan Mall Bekasi
-- ============================================================================
--
-- PURPOSE: Replace get_tenant_survey_analytics with v4 that:
--   1. Uses explicit params (p_is_admin, p_tenant_user_id) instead of auth.uid()
--      → Works correctly when called via service-role key from API handler
--   2. Supports 3 grouping modes: tenant (default), event, month
--   3. Fixes submitted_surveys=0 edge case (includes 'reviewed' status)
--   4. Includes v3 bucket counts (traffic_signifikan, etc.)
--   5. Adds unique_tenants count for event grouping
--
-- REPLACES: get_tenant_survey_analytics (v3) — old function kept for fallback
--
-- IDEMPOTENCY: CREATE OR REPLACE FUNCTION — safe to run multiple times.
--
-- ============================================================================


CREATE OR REPLACE FUNCTION get_tenant_survey_analytics_v4(
  p_is_admin BOOLEAN DEFAULT false,
  p_tenant_user_id UUID DEFAULT NULL,
  p_event_id TEXT DEFAULT NULL,
  p_group_by TEXT DEFAULT 'tenant'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result JSON;
  v_tenant_filter TEXT;
BEGIN
  -- Build tenant filter condition
  IF NOT p_is_admin AND p_tenant_user_id IS NOT NULL THEN
    v_tenant_filter := format(' AND tenant_user_id = %L', p_tenant_user_id::text);
  ELSIF NOT p_is_admin THEN
    -- Non-admin without user_id → return empty
    RETURN '[]'::json;
  ELSE
    v_tenant_filter := '';
  END IF;

  -- Build event filter condition
  IF p_event_id IS NOT NULL AND p_event_id <> '' THEN
    v_tenant_filter := v_tenant_filter || format(' AND event_id = %L', p_event_id);
  END IF;

  IF p_group_by = 'month' THEN
    -- ─── Monthly trend (12 months) ───────────────────────────────
    EXECUTE format($f$
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          to_char(DATE_TRUNC('month', COALESCE(submitted_at, created_at)), 'YYYY-MM') AS period,
          COUNT(*) AS total_submissions,
          COUNT(*) FILTER (WHERE venue_rating IS NOT NULL) AS v2_count,
          COUNT(*) FILTER (WHERE venue_rating IS NULL AND nama_gerai IS NOT NULL) AS v3_count,
          ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2) AS avg_venue_rating,
          ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2) AS avg_management_rating,
          ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2) AS avg_event_organization_rating,
          ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2) AS avg_booth_facility_rating,
          ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2) AS avg_overall_rating,
          COUNT(*) FILTER (WHERE kenaikan_traffic = 'Signifikan') AS traffic_signifikan,
          COUNT(*) FILTER (WHERE kenaikan_traffic = 'Sedikit Naik') AS traffic_sedikit_naik,
          COUNT(*) FILTER (WHERE kenaikan_traffic = 'Tidak Ada') AS traffic_tidak_ada,
          COUNT(*) FILTER (WHERE kenaikan_traffic = 'Menurun') AS traffic_menurun,
          COUNT(*) FILTER (WHERE kenaikan_sales = 'Tidak ada kenaikan / Sama saja') AS sales_no_change,
          COUNT(*) FILTER (WHERE kenaikan_sales = '< 10%%') AS sales_lt_10,
          COUNT(*) FILTER (WHERE kenaikan_sales = '10%% - 30%%') AS sales_10_30,
          COUNT(*) FILTER (WHERE kenaikan_sales = '30%% - 50%%') AS sales_30_50,
          COUNT(*) FILTER (WHERE kenaikan_sales = '> 50%%') AS sales_gt_50
        FROM tenant_event_surveys
        WHERE status IN ('submitted', 'reviewed')%s
        GROUP BY period
        ORDER BY period DESC
        LIMIT 12
      ) t
    $f$, v_tenant_filter)
    INTO result;

  ELSIF p_group_by = 'event' THEN
    -- ─── Per-event aggregation ───────────────────────────────────
    EXECUTE format($f$
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          event_id,
          COUNT(*) AS total_surveys,
          COUNT(*) FILTER (WHERE status IN ('submitted', 'reviewed')) AS submitted_surveys,
          COUNT(DISTINCT nama_gerai) FILTER (WHERE nama_gerai IS NOT NULL AND nama_gerai <> '') AS unique_tenants,
          COUNT(DISTINCT kategori) FILTER (WHERE kategori IS NOT NULL AND kategori <> '') AS unique_categories,
          ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2) AS avg_venue_rating,
          ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2) AS avg_management_rating,
          ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2) AS avg_event_organization_rating,
          ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2) AS avg_booth_facility_rating,
          ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2) AS avg_overall_rating,
          MAX(created_at) AS last_survey_at,
          COUNT(*) FILTER (WHERE kenaikan_traffic = 'Signifikan') AS traffic_signifikan,
          COUNT(*) FILTER (WHERE kenaikan_traffic = 'Sedikit Naik') AS traffic_sedikit_naik,
          COUNT(*) FILTER (WHERE kenaikan_traffic = 'Tidak Ada') AS traffic_tidak_ada,
          COUNT(*) FILTER (WHERE kenaikan_traffic = 'Menurun') AS traffic_menurun,
          COUNT(*) FILTER (WHERE kenaikan_sales = 'Tidak ada kenaikan / Sama saja') AS sales_no_change,
          COUNT(*) FILTER (WHERE kenaikan_sales = '< 10%%') AS sales_lt_10,
          COUNT(*) FILTER (WHERE kenaikan_sales = '10%% - 30%%') AS sales_10_30,
          COUNT(*) FILTER (WHERE kenaikan_sales = '30%% - 50%%') AS sales_30_50,
          COUNT(*) FILTER (WHERE kenaikan_sales = '> 50%%') AS sales_gt_50
        FROM tenant_event_surveys
        WHERE status IN ('submitted', 'reviewed')%s
        GROUP BY event_id
        ORDER BY submitted_surveys DESC
      ) t
    $f$, v_tenant_filter)
    INTO result;

  ELSE
    -- ─── Per-tenant aggregation (default) ────────────────────────
    EXECUTE format($f$
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          tenant_user_id,
          tenant_organization,
          COUNT(*) AS total_surveys,
          COUNT(*) FILTER (WHERE status IN ('submitted', 'reviewed')) AS submitted_surveys,
          ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2) AS avg_venue_rating,
          ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2) AS avg_management_rating,
          ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2) AS avg_event_organization_rating,
          ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2) AS avg_booth_facility_rating,
          ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2) AS avg_overall_rating,
          MAX(created_at) AS last_survey_at,
          COUNT(*) FILTER (WHERE kenaikan_traffic = 'Signifikan') AS traffic_signifikan,
          COUNT(*) FILTER (WHERE kenaikan_traffic = 'Sedikit Naik') AS traffic_sedikit_naik,
          COUNT(*) FILTER (WHERE kenaikan_traffic = 'Tidak Ada') AS traffic_tidak_ada,
          COUNT(*) FILTER (WHERE kenaikan_traffic = 'Menurun') AS traffic_menurun,
          COUNT(*) FILTER (WHERE kenaikan_sales = 'Tidak ada kenaikan / Sama saja') AS sales_no_change,
          COUNT(*) FILTER (WHERE kenaikan_sales = '< 10%%') AS sales_lt_10,
          COUNT(*) FILTER (WHERE kenaikan_sales = '10%% - 30%%') AS sales_10_30,
          COUNT(*) FILTER (WHERE kenaikan_sales = '30%% - 50%%') AS sales_30_50,
          COUNT(*) FILTER (WHERE kenaikan_sales = '> 50%%') AS sales_gt_50
        FROM tenant_event_surveys
        WHERE status IN ('submitted', 'reviewed')%s
        GROUP BY tenant_user_id, tenant_organization
        ORDER BY submitted_surveys DESC
      ) t
    $f$, v_tenant_filter)
    INTO result;

  END IF;

  RETURN result;
END;
$$;


-- ============================================================================
-- REVOKE anonymous access to both old and new RPC functions
-- ============================================================================
-- Prevents anonymous (unauthenticated) callers from probing tenant UUIDs
-- via the RPC. Only authenticated users or service-role can execute.

REVOKE EXECUTE ON FUNCTION get_tenant_survey_analytics FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_tenant_survey_analytics_v4 FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_tenant_survey_analytics TO authenticated;
-- v4 is intended for service-role use only (via API handler)
-- No grant needed for authenticated since API uses service-role key
