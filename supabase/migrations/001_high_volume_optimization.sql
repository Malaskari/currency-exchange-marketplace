-- =====================================================
-- HIGH VOLUME OPTIMIZATION: Database Indexes
-- Run this in Supabase SQL Editor
-- =====================================================

-- Requests table indexes
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status_created ON requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_full_name ON requests(full_name);
CREATE INDEX IF NOT EXISTS idx_requests_whatsapp ON requests(whatsapp);

-- Sales table indexes
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_usd_amount ON sales(usd_amount);

-- Team table indexes
CREATE INDEX IF NOT EXISTS idx_team_username ON team(username);

-- Settings table indexes
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- =====================================================
-- HIGH VOLUME OPTIMIZATION: Materialized View for Stats
-- This pre-computes aggregations for fast dashboard loads
-- =====================================================

CREATE OR REPLACE FUNCTION get_request_stats()
RETURNS TABLE (
  total_count BIGINT,
  completed_count BIGINT,
  pending_count BIGINT,
  total_usd NUMERIC,
  completed_usd NUMERIC,
  pending_usd NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_count,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_count,
    COALESCE(SUM(effective_usd), 0) as total_usd,
    COALESCE(SUM(effective_usd) FILTER (WHERE status = 'completed'), 0) as completed_usd,
    COALESCE(SUM(effective_usd) FILTER (WHERE status = 'pending'), 0) as pending_usd
  FROM requests;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_daily_stats(days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  requests_count BIGINT,
  completed_count BIGINT,
  total_usd NUMERIC,
  completed_usd NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d::DATE as date,
    COUNT(r.id)::BIGINT as requests_count,
    COUNT(r.id) FILTER (WHERE r.status = 'completed')::BIGINT as completed_count,
    COALESCE(SUM(r.effective_usd), 0) as total_usd,
    COALESCE(SUM(r.effective_usd) FILTER (WHERE r.status = 'completed'), 0) as completed_usd
  FROM generate_series(
    CURRENT_DATE - (days - 1)::INTEGER,
    CURRENT_DATE,
    '1 day'::INTERVAL
  ) d(d)
  LEFT JOIN requests r ON DATE(r.created_at) = d::DATE
  GROUP BY d::DATE
  ORDER BY d::DATE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_sales_stats()
RETURNS TABLE (
  total_usd NUMERIC,
  total_lyd NUMERIC,
  avg_rate NUMERIC,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(usd_amount), 0) as total_usd,
    COALESCE(SUM(received_lyd), 0) as total_lyd,
    CASE WHEN SUM(usd_amount) > 0 
      THEN COALESCE(SUM(received_lyd), 0) / SUM(usd_amount) 
      ELSE 0 
    END as avg_rate,
    COUNT(*)::BIGINT as count
  FROM sales;
END;
$$ LANGUAGE plpgsql;
