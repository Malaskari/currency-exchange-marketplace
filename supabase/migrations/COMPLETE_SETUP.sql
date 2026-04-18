-- =====================================================
-- COMPLETE DATABASE SETUP
-- Run this entire file in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: HIGH VOLUME OPTIMIZATION - Indexes
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
-- PART 2: USDT EXCHANGE SYSTEM - Tables
-- =====================================================

-- Bank Accounts (manage your LYD accounts)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT,
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'LYD',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Binance USDT Accounts (track your USDT)
CREATE TABLE IF NOT EXISTS usdt_accounts (
  id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  binance_email TEXT,
  usdt_balance NUMERIC DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- USDT Card Purchases (record cards bought)
CREATE TABLE IF NOT EXISTS card_purchases (
  id TEXT PRIMARY KEY,
  card_number TEXT NOT NULL,
  card_provider TEXT,
  amount_usd NUMERIC NOT NULL,
  amount_usdt NUMERIC NOT NULL,
  purchase_rate NUMERIC NOT NULL,
  purchase_date DATE NOT NULL,
  binance_account_id TEXT REFERENCES usdt_accounts(id),
  bank_account_id TEXT REFERENCES bank_accounts(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'loaded', 'sold', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- USDT Sales to Customers
CREATE TABLE IF NOT EXISTS usdt_sales (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  customer_iban TEXT,
  amount_usdt NUMERIC NOT NULL,
  amount_lyd NUMERIC NOT NULL,
  rate_used NUMERIC NOT NULL,
  binance_account_id TEXT REFERENCES usdt_accounts(id),
  bank_account_id TEXT REFERENCES bank_accounts(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  sale_date TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES for USDT Tables
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_usdt_accounts_is_active ON usdt_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_card_purchases_status ON card_purchases(status);
CREATE INDEX IF NOT EXISTS idx_card_purchases_date ON card_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_usdt_sales_status ON usdt_sales(status);
CREATE INDEX IF NOT EXISTS idx_usdt_sales_date ON usdt_sales(sale_date);

-- =====================================================
-- PART 3: DEFAULT SETTINGS
-- =====================================================

INSERT INTO settings (key, value) VALUES ('usdtSellRate', '4.85') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('sourceOptions', '[{"id":"mastercard","label":"MasterCard","icon":"💳","enabled":true},{"id":"bank_account","label":"Bank Account (FCA)","icon":"🏦","enabled":true},{"id":"cash","label":"Cash USD","icon":"💵","enabled":true}]') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('payoutOptions', '[{"id":"cash","label":"Cash","icon":"💵","rate":4.85,"enabled":true},{"id":"bank_transfer","label":"Bank Transfer","icon":"🏦","rate":4.80,"enabled":true}]') ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- PART 4: PERFORMANCE FUNCTIONS
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

-- =====================================================
-- PART 5: ACCOUNT SUMMARY FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_account_summary()
RETURNS TABLE (
  total_accounts BIGINT,
  total_balance NUMERIC,
  lyd_accounts BIGINT,
  lyd_balance NUMERIC,
  usdt_accounts BIGINT,
  usdt_balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM bank_accounts WHERE is_active = true) +
    (SELECT COUNT(*) FROM usdt_accounts WHERE is_active = true) AS total_accounts,
    (SELECT COALESCE(SUM(balance), 0) FROM bank_accounts WHERE is_active = true) +
    (SELECT COALESCE(SUM(usdt_balance), 0) FROM usdt_accounts WHERE is_active = true) AS total_balance,
    (SELECT COUNT(*) FROM bank_accounts WHERE is_active = true) AS lyd_accounts,
    (SELECT COALESCE(SUM(balance), 0) FROM bank_accounts WHERE is_active = true) AS lyd_balance,
    (SELECT COUNT(*) FROM usdt_accounts WHERE is_active = true) AS usdt_accounts,
    (SELECT COALESCE(SUM(usdt_balance), 0) FROM usdt_accounts WHERE is_active = true) AS usdt_balance;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DONE! Refresh your database to see new tables.
-- =====================================================
