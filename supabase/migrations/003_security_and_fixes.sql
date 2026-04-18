-- =====================================================
-- SECURITY PATCH: RLS & AUTHENTICATION
-- =====================================================

-- 1. ENABLE RLS ON ALL TABLES
ALTER TABLE team ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE usdt_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE usdt_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES

-- REQUESTS: Public can INSERT (submit request), Admin can Select/Update
-- Allow public insert
CREATE POLICY "Allow public insert requests" ON requests
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow authenticated read/write (Admins)
CREATE POLICY "Admin full access requests" ON requests
  FOR ALL TO authenticated
  USING (true);

-- SALES: Admin only
CREATE POLICY "Admin full access sales" ON sales
  FOR ALL TO authenticated
  USING (true);

-- SETTINGS: Public Read, Admin Write
CREATE POLICY "Public read settings" ON settings
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Admin update settings" ON settings
  FOR UPDATE TO authenticated
  USING (true);

-- TEAM: ANON CANNOT READ. Use RPC for login.
-- First, drop any existing dangerous policies if they exist (cleanup)
DROP POLICY IF EXISTS "Allow public read team" ON team;
DROP POLICY IF EXISTS "Allow public insert team" ON team;

-- Secure Team Access: Only authenticated users can see team list.
-- Since we don't have full auth yet, we use a function for login.
CREATE POLICY "Admin read team" ON team
  FOR SELECT TO authenticated
  USING (true);

-- 3. SECURE LOGIN FUNCTION (RPC)
-- This prevents client-side plain text password scanning
CREATE OR REPLACE FUNCTION login_team_user(p_username TEXT, p_password TEXT)
RETURNS TABLE(id TEXT, username TEXT, email TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY (
    SELECT t.id, t.username, t.email, t.role
    FROM team t
    WHERE t.username = p_username AND t.password = p_password
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ADD UUID EXTENSION IF MISSING (Often pre-installed, but good to check)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 5. FIX ID GENERATION IN REQUESTS (Use UUID instead of custom string)
-- We can't retroactively change existing IDs easily, but new ones will be UUIDs if we change the code.
-- For now, let's leave IDs as is.