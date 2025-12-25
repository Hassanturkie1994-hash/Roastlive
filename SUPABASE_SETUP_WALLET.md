# Wallet & Payout System - Database Setup

Run this SQL in your Supabase SQL Editor to enable wallet and payout features.

```sql
-- ============================================================================
-- WALLET SYSTEM
-- ============================================================================

CREATE TYPE IF NOT EXISTS transaction_type AS ENUM ('deposit', 'withdrawal', 'gift_sent', 'gift_received', 'payout');
CREATE TYPE IF NOT EXISTS payout_status AS ENUM ('pending', 'approved', 'rejected', 'paid');

-- Wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wallets_user ON public.wallets(user_id);

-- Wallet transactions table (ledger)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_type ON public.wallet_transactions(type);

-- Payout requests table
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 100),
  status payout_status DEFAULT 'pending',
  payment_method TEXT,
  payment_details JSONB,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payout_requests_user ON public.payout_requests(user_id);
CREATE INDEX idx_payout_requests_status ON public.payout_requests(status);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (
    wallet_id IN (
      SELECT id FROM public.wallets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create payout requests"
  ON public.payout_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own payout requests"
  ON public.payout_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON public.wallets TO authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT SELECT, INSERT ON public.payout_requests TO authenticated;
```

## Minimum Payout

Payout requests require a minimum of **100 SEK**. This is enforced at the database level with a CHECK constraint.
