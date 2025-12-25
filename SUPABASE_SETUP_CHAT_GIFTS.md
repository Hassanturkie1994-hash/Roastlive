# Supabase Setup: Live Chat & Gift Economy

Run this SQL in your Supabase SQL Editor to set up chat, moderation, wallet, and gift tables.

```sql
-- =============================================================
-- STREAM MESSAGES TABLE (Chat)
-- =============================================================

CREATE TABLE IF NOT EXISTS stream_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'message' CHECK (type IN ('message', 'gift', 'system', 'pinned')),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  is_moderator BOOLEAN DEFAULT FALSE,
  is_host BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chat queries
CREATE INDEX IF NOT EXISTS idx_stream_messages_stream ON stream_messages(stream_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stream_messages_pinned ON stream_messages(stream_id, is_pinned) WHERE is_pinned = TRUE;

-- =============================================================
-- STREAM TIMEOUTS TABLE (Moderation)
-- =============================================================

CREATE TABLE IF NOT EXISTS stream_timeouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moderator_id UUID REFERENCES auth.users(id),
  reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for checking timeouts
CREATE INDEX IF NOT EXISTS idx_stream_timeouts_user ON stream_timeouts(stream_id, user_id, expires_at);

-- =============================================================
-- WALLETS TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for wallet lookups
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- =============================================================
-- GIFT TRANSACTIONS TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_id VARCHAR(50) NOT NULL,
  gift_name VARCHAR(100) NOT NULL,
  gift_emoji VARCHAR(10) NOT NULL,
  cost INTEGER NOT NULL,
  battle_points INTEGER,
  battle_team VARCHAR(10) CHECK (battle_team IN ('team_a', 'team_b')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for gift queries
CREATE INDEX IF NOT EXISTS idx_gift_transactions_stream ON gift_transactions(stream_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_sender ON gift_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_recipient ON gift_transactions(recipient_id);

-- =============================================================
-- WALLET TRANSACTIONS TABLE (History)
-- =============================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'gift_sent', 'gift_received', 'payout', 'refund')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_id UUID, -- gift_transaction_id or payout_id
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for transaction history
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id, created_at DESC);

-- =============================================================
-- FUNCTIONS
-- =============================================================

-- Function to deduct wallet balance
CREATE OR REPLACE FUNCTION deduct_wallet_balance(p_user_id UUID, p_amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_wallet_id UUID;
BEGIN
  -- Get or create wallet
  INSERT INTO wallets (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current balance with lock
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Deduct balance
  UPDATE wallets
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description)
  VALUES (v_wallet_id, 'gift_sent', -p_amount, v_current_balance - p_amount, 'Gift sent');

  RETURN TRUE;
END;
$$;

-- Function to add wallet balance (for recipient)
CREATE OR REPLACE FUNCTION add_wallet_balance(p_user_id UUID, p_amount INTEGER, p_type VARCHAR(20) DEFAULT 'gift_received')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance INTEGER;
BEGIN
  -- Get or create wallet
  INSERT INTO wallets (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = wallets.balance + p_amount,
      total_earned = wallets.total_earned + p_amount,
      updated_at = NOW()
  RETURNING id, balance INTO v_wallet_id, v_new_balance;

  -- Record transaction
  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description)
  VALUES (v_wallet_id, p_type, p_amount, v_new_balance, 'Balance added');

  RETURN TRUE;
END;
$$;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE stream_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_timeouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Stream Messages Policies
CREATE POLICY "Anyone can view stream messages" ON stream_messages
  FOR SELECT USING (NOT is_deleted);

CREATE POLICY "Users can insert messages" ON stream_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Moderators can update messages" ON stream_messages
  FOR UPDATE USING (true);

-- Stream Timeouts Policies
CREATE POLICY "Anyone can view timeouts" ON stream_timeouts
  FOR SELECT USING (true);

CREATE POLICY "Moderators can create timeouts" ON stream_timeouts
  FOR INSERT WITH CHECK (true);

-- Wallets Policies
CREATE POLICY "Users can view own wallet" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage wallets" ON wallets
  FOR ALL USING (true);

-- Gift Transactions Policies
CREATE POLICY "Anyone can view gift transactions" ON gift_transactions
  FOR SELECT USING (true);

CREATE POLICY "Users can create gift transactions" ON gift_transactions
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Wallet Transactions Policies
CREATE POLICY "Users can view own transactions" ON wallet_transactions
  FOR SELECT USING (
    wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
  );

-- =============================================================
-- ENABLE REALTIME
-- =============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE stream_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE gift_transactions;

-- =============================================================
-- TRIGGER: Credit recipient on gift
-- =============================================================

CREATE OR REPLACE FUNCTION credit_gift_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Credit 70% of gift value to recipient (platform takes 30%)
  PERFORM add_wallet_balance(
    NEW.recipient_id,
    (NEW.cost * 0.7)::INTEGER,
    'gift_received'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_credit_gift_recipient
AFTER INSERT ON gift_transactions
FOR EACH ROW
EXECUTE FUNCTION credit_gift_recipient();
```

## How It Works

### Chat System:
1. Messages stored in `stream_messages` with real-time subscription
2. Host/moderator badges shown based on `is_host` and `is_moderator` flags
3. Messages can be pinned (one at a time per stream)
4. Deleted messages hidden via `is_deleted` flag
5. System messages for announcements (timeouts, etc.)

### Moderation:
1. Moderators can delete messages
2. Moderators can pin messages
3. Moderators can timeout users (1m, 5m, 10m, 1h)
4. Timeouts stored with expiry time
5. All mod actions logged

### Gift Economy:
1. **5 Gift Tiers**: Basic → Mid → High → Ultra → Nuclear
2. **Animation Types**: Simple, Burst, Shower, Screen Takeover
3. **Battle Mode**: Gifts convert to battle points
4. **Revenue Split**: 70% to creator, 30% platform fee
5. **Wallet System**: Balance tracking with transaction history

### Gift Tier Examples:
| Tier | Cost Range | Animation | Example |
|------|-----------|-----------|---------|
| Basic | 5-50 | Simple | 👏 Clap, 😂 Laugh, 🔥 Fire |
| Mid | 100-500 | Burst | 🎤 Mic Drop, 👑 Crown |
| High | 1000-2000 | Shower | 💎 Diamond, 💣 Bomb |
| Ultra | 5000-10000 | Takeover | ☢️ Nuke, 🌟 Supernova |
| Nuclear | 25000+ | Full Takeover | 🕳️ Black Hole, 💥 Big Bang |
