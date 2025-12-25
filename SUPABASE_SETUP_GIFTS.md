# Roast Live - Database Setup Guide: Gift System

## Overview
This guide covers setting up the gift system tables in Supabase, including all 45 tiered gifts.

## Step 1: Create Gifts Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Gifts table with all tiers
CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  icon TEXT NOT NULL,
  tier TEXT CHECK (tier IN ('LOW', 'MID', 'HIGH', 'ULTRA', 'NUCLEAR')) NOT NULL,
  format TEXT CHECK (format IN ('lottie', 'mp4')) DEFAULT 'lottie',
  blocks_others BOOLEAN DEFAULT false,
  is_cinematic BOOLEAN DEFAULT false,
  animation_url TEXT,
  duration_ms INTEGER DEFAULT 3000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gift transactions
CREATE TABLE IF NOT EXISTS gift_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gift_id TEXT NOT NULL REFERENCES gifts(id),
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gift_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gift transactions"
  ON gift_transactions FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send gifts"
  ON gift_transactions FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS idx_gift_transactions_stream_id ON gift_transactions(stream_id);
```

## Step 2: Insert All 45 Gifts

See the main `supabase_schema.sql` file for the complete INSERT statement with all gifts.

## Verification

After running the SQL:

```sql
-- Check total gifts
SELECT tier, COUNT(*) as count FROM gifts GROUP BY tier ORDER BY tier;

-- Should show:
-- HIGH: 11
-- LOW: 12  
-- MID: 11
-- NUCLEAR: 6
-- ULTRA: 8

-- View all gifts
SELECT id, name, price, tier, format FROM gifts ORDER BY price;
```

## Done!
Your gift system is now set up in Supabase.
