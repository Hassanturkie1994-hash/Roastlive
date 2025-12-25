# Roast Live - Database Setup Guide: VIP Club System

## Overview  
This guide covers setting up VIP clubs and subscriptions in Supabase.

## Step 1: Create VIP Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- VIP Clubs table
CREATE TABLE IF NOT EXISTS vip_clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_text TEXT DEFAULT 'VIP',
  badge_color TEXT DEFAULT '#9C27B0',
  monthly_price DECIMAL DEFAULT 2.55,
  member_count INTEGER DEFAULT 0,
  monthly_revenue DECIMAL DEFAULT 0,
  total_revenue DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vip_clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view VIP clubs"
  ON vip_clubs FOR SELECT
  USING (true);

CREATE POLICY "Creators can manage own club"
  ON vip_clubs FOR ALL
  USING (auth.uid() = creator_id);

-- VIP subscriptions
ALTER TABLE vip_subscriptions ADD CONSTRAINT vip_subscriptions_creator_id_fkey
  FOREIGN KEY (creator_id) REFERENCES vip_clubs(creator_id) ON DELETE CASCADE;

-- RPC functions for member count
CREATE OR REPLACE FUNCTION increment_vip_members(creator_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE vip_clubs SET member_count = member_count + 1 WHERE creator_id = creator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_vip_members(creator_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE vip_clubs SET member_count = GREATEST(0, member_count - 1) WHERE creator_id = creator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Step 2: Create Triggers

```sql
CREATE TRIGGER update_vip_clubs_updated_at
  BEFORE UPDATE ON vip_clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Done!
Your VIP club system is ready.
