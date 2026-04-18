-- Atomic fund movement with rollback on failure
-- This ensures all-or-nothing fund transfers

CREATE OR REPLACE FUNCTION process_fund_movement(
  p_sale_id TEXT,
  p_source_account_id TEXT,
  p_dest_account_id TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_is_buy BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_balance NUMERIC;
  v_dest_balance NUMERIC;
BEGIN
  -- Check source has sufficient funds
  SELECT total_balance INTO v_source_balance 
  FROM accounts 
  WHERE id = p_source_account_id;

  IF v_source_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds: % < %', v_source_balance, p_amount;
  END IF;

  -- Start transaction
  BEGIN
    -- Deduct from source
    UPDATE accounts 
    SET total_balance = total_balance - p_amount,
        updated_at = NOW()
    WHERE id = p_source_account_id;

    -- Add to destination
    UPDATE accounts 
    SET total_balance = total_balance + p_amount,
        updated_at = NOW()
    WHERE id = p_dest_account_id;

    -- Record transaction
    INSERT INTO account_transactions (
      id, account_id, type, amount, currency, 
      reference_type, reference_id, created_at
    ) VALUES (
      'TXN-' || gen_random_uuid(),
      p_source_account_id,
      COALESCE(p_is_buy, false)::BOOLEAN,
      -p_amount,
      p_currency,
      'sale',
      p_sale_id,
      NOW()
    ), (
      'TXN-' || gen_random_uuid(),
      p_dest_account_id,
      COALESCE(p_is_buy, false)::BOOLEAN,
      p_amount,
      p_currency,
      'sale',
      p_sale_id,
      NOW()
    );

    RETURN TRUE;
  EXCEPTION WHEN OTHERS THEN
    -- Rollback happens automatically on error
    RAISE;
  END;
END;
$$;