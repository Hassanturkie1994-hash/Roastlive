-- ============================================================================
-- FINAL DATABASE UPDATES: Wallet Functions & Missing Tables
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- Create function to update wallet balance atomically
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS JSON AS $$
DECLARE
  v_new_balance INTEGER;
  v_result JSON;
BEGIN
  -- Update balance
  UPDATE wallets
  SET 
    balance = balance + p_amount,
    total_earned = CASE WHEN p_amount > 0 THEN total_earned + p_amount ELSE total_earned END,
    total_spent = CASE WHEN p_amount < 0 THEN total_spent + ABS(p_amount) ELSE total_spent END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- If wallet doesn't exist, create it
  IF v_new_balance IS NULL THEN
    INSERT INTO wallets (user_id, balance, total_earned, total_spent)
    VALUES (
      p_user_id,
      GREATEST(p_amount, 0),
      CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
      CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END
    )
    RETURNING balance INTO v_new_balance;
  END IF;

  v_result := json_build_object('balance', v_new_balance);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant permission
GRANT EXECUTE ON FUNCTION update_wallet_balance TO authenticated;

-- Ensure wallets table exists (from previous schema)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Wallet function created successfully!';
  RAISE NOTICE '📋 Added:';
  RAISE NOTICE '  - update_wallet_balance() function';
  RAISE NOTICE '  - Atomic balance updates';
  RAISE NOTICE '  - Auto-create wallet if missing';
END $$;
