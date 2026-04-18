-- =====================================================
-- USDT EXCHANGE SYSTEM - Database Schema
-- Run this in Supabase SQL Editor
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
-- INDEXES for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_usdt_accounts_is_active ON usdt_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_card_purchases_status ON card_purchases(status);
CREATE INDEX IF NOT EXISTS idx_card_purchases_date ON card_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_usdt_sales_status ON usdt_sales(status);
CREATE INDEX IF NOT EXISTS idx_usdt_sales_date ON usdt_sales(sale_date);

-- =====================================================
-- ADD SETTINGS
-- =====================================================

INSERT INTO settings (key, value) VALUES ('usdtSellRate', '4.85') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('sourceOptions', '[{"id":"mastercard","label":"MasterCard","icon":"💳","enabled":true},{"id":"bank_account","label":"Bank Account (FCA)","icon":"🏦","enabled":true},{"id":"cash","label":"Cash USD","icon":"💵","enabled":true}]') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('payoutOptions', '[{"id":"cash","label":"Cash","icon":"💵","enabled":true},{"id":"bank_transfer","label":"Bank Transfer","icon":"🏦","enabled":true}]') ON CONFLICT (key) DO NOTHING;
