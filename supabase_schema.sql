-- Roast Live Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  streams_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Streams table
CREATE TABLE IF NOT EXISTS streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  channel_name TEXT UNIQUE NOT NULL,
  is_live BOOLEAN DEFAULT false,
  viewer_count INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 10,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active streams"
  ON streams FOR SELECT
  USING (is_live = true OR auth.uid() = host_id);

CREATE POLICY "Users can create streams"
  ON streams FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update own streams"
  ON streams FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete own streams"
  ON streams FOR DELETE
  USING (auth.uid() = host_id);

-- Stream invitations
CREATE TABLE IF NOT EXISTS stream_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stream_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations for them"
  ON stream_invitations FOR SELECT
  USING (auth.uid() = guest_id OR auth.uid() = host_id);

CREATE POLICY "Hosts can create invitations"
  ON stream_invitations FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Guests can update own invitations"
  ON stream_invitations FOR UPDATE
  USING (auth.uid() = guest_id);

-- Stream Guests table
CREATE TABLE IF NOT EXISTS stream_guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('host', 'guest')) DEFAULT 'guest',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(stream_id, user_id)
);

ALTER TABLE stream_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stream guests"
  ON stream_guests FOR SELECT
  USING (true);

CREATE POLICY "Host can manage guests"
  ON stream_guests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM streams
      WHERE id = stream_id AND host_id = auth.uid()
    )
  );

-- Messages table (for live chat)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  pinned_until TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view messages in active streams"
  ON messages FOR SELECT
  USING (
    NOT is_deleted AND
    EXISTS (SELECT 1 FROM streams WHERE id = stream_id AND is_live = true)
  );

CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Gifts table (updated with all tiers)
CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY, -- Use gift ID as primary key for easy reference
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

-- Wallet table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- VIP subscriptions
CREATE TABLE IF NOT EXISTS vip_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier TEXT DEFAULT 'basic',
  status TEXT CHECK (status IN ('active', 'canceled', 'expired')) DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  renewed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscriber_id, creator_id)
);

ALTER TABLE vip_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON vip_subscriptions FOR SELECT
  USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Messages table (for direct messaging)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own received messages"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their blocks"
  ON blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others"
  ON blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock"
  ON blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_streams_host_id ON streams(host_id);
CREATE INDEX IF NOT EXISTS idx_streams_is_live ON streams(is_live);
CREATE INDEX IF NOT EXISTS idx_messages_stream_id ON messages(stream_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_stream_id ON gift_transactions(stream_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- RPC Functions for counter operations
CREATE OR REPLACE FUNCTION increment_viewer_count(stream_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE streams SET viewer_count = viewer_count + 1 WHERE id = stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_viewer_count(stream_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE streams SET viewer_count = GREATEST(0, viewer_count - 1) WHERE id = stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_followers_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET followers_count = followers_count + 1 WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_followers_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_following_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET following_count = following_count + 1 WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_following_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streams_updated_at
  BEFORE UPDATE ON streams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default gifts
INSERT INTO gifts (name, price, icon, tier) VALUES
  ('Rose', 1, '🌹', 'fun'),
  ('Fire', 5, '🔥', 'fun'),
  ('Roast', 10, '🍗', 'fun'),
  ('Crown', 50, '👑', 'mid'),
  ('Diamond', 100, '💎', 'mid'),
  ('Rocket', 500, '🚀', 'premium'),
  ('Trophy', 1000, '🏆', 'premium'),
  ('God Mode', 3500, '⚡', 'god')
ON CONFLICT DO NOTHING;
