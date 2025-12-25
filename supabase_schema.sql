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

-- Posts table (Phase 4: Social Features)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  caption TEXT,
  image_url TEXT,
  video_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Post likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post likes"
  ON post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Post comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON post_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can comment"
  ON post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')) DEFAULT 'image',
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active stories"
  ON stories FOR SELECT
  USING (expires_at > NOW());

CREATE POLICY "Users can create stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- VIP Clubs table (Phase 3: VIP System)
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

-- VIP Club subscriptions (updated)
ALTER TABLE vip_subscriptions DROP CONSTRAINT IF EXISTS vip_subscriptions_creator_id_fkey;
ALTER TABLE vip_subscriptions ADD CONSTRAINT vip_subscriptions_creator_id_fkey
  FOREIGN KEY (creator_id) REFERENCES vip_clubs(creator_id) ON DELETE CASCADE;

-- Admin roles table (Phase 5: Moderation)
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('head_admin', 'admin', 'moderator', 'support')) NOT NULL,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view admin roles"
  ON admin_roles FOR SELECT
  USING (true);

-- User reports table (Phase 5)
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type TEXT CHECK (report_type IN ('stream', 'profile', 'message', 'post', 'story')) NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('open', 'in_review', 'resolved', 'closed')) DEFAULT 'open',
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY \"Users can create reports\"
  ON user_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY \"Admins can view all reports\"
  ON user_reports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())
  );

CREATE POLICY \"Admins can update reports\"
  ON user_reports FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())
  );

-- User penalties table (Phase 5)
CREATE TABLE IF NOT EXISTS user_penalties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  penalty_type TEXT CHECK (penalty_type IN ('warning', 'timeout', 'ban', 'suspend')) NOT NULL,
  reason TEXT NOT NULL,
  duration_minutes INTEGER,
  issued_by UUID NOT NULL REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY \"Users can view own penalties\"
  ON user_penalties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY \"Admins can manage penalties\"
  ON user_penalties FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())
  );

-- Admin action log (Phase 5)
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id),
  target_content_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY \"Admins can view action logs\"
  ON admin_actions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())
  );

CREATE POLICY \"Admins can create action logs\"
  ON admin_actions FOR INSERT
  WITH CHECK (
    auth.uid() = admin_id AND
    EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())
  );

-- AI Violations table (Phase 6: AI Moderation)
CREATE TABLE IF NOT EXISTS ai_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('message', 'username', 'bio', 'post', 'story')) NOT NULL,
  toxicity_score DECIMAL,
  harassment_score DECIMAL,
  hate_speech_score DECIMAL,
  sexual_score DECIMAL,
  threats_score DECIMAL,
  spam_score DECIMAL,
  overall_score DECIMAL NOT NULL,
  action_taken TEXT CHECK (action_taken IN ('allow', 'flag', 'hide', 'timeout', 'block')) NOT NULL,
  stream_id UUID REFERENCES streams(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY \"Admins can view violations\"
  ON ai_violations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())
  );

-- AI Strikes table (Phase 6)
CREATE TABLE IF NOT EXISTS ai_strikes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  strike_level INTEGER CHECK (strike_level BETWEEN 1 AND 4) NOT NULL,
  violation_id UUID REFERENCES ai_violations(id),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, creator_id, strike_level)
);

ALTER TABLE ai_strikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY \"Users can view own strikes\"
  ON ai_strikes FOR SELECT
  USING (auth.uid() = user_id);

-- Stream ranking metrics (Phase 7: Discovery)
CREATE TABLE IF NOT EXISTS stream_ranking_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID UNIQUE NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  viewer_count INTEGER DEFAULT 0,
  avg_watch_time_seconds INTEGER DEFAULT 0,
  gift_volume_10min INTEGER DEFAULT 0,
  comment_rate DECIMAL DEFAULT 0,
  follower_conversion_rate DECIMAL DEFAULT 0,
  rank_score DECIMAL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator ranking metrics (Phase 7)
CREATE TABLE IF NOT EXISTS creator_ranking_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_age_days INTEGER DEFAULT 0,
  profile_completeness INTEGER DEFAULT 0,
  stream_frequency_30d INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_gifts_received INTEGER DEFAULT 0,
  avg_viewer_count DECIMAL DEFAULT 0,
  follower_growth_rate DECIMAL DEFAULT 0,
  rank_score DECIMAL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_penalties_user_id ON user_penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_user_penalties_is_active ON user_penalties(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_violations_user_id ON ai_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_strikes_user_id ON ai_strikes(user_id);

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

-- Post counter functions
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_post_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_post_comments(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET comments_count = comments_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- VIP club counter functions
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

-- Insert all 45 gifts organized by tier
-- LOW TIER (1-10 SEK) - All Lottie
INSERT INTO gifts (id, name, price, icon, tier, format, duration_ms) VALUES
  ('boo', 'Boo', 1, '👻', 'LOW', 'lottie', 2000),
  ('flying_tomato', 'Flying Tomato', 2, '🍅', 'LOW', 'lottie', 2500),
  ('laugh_track', 'Laugh Track', 3, '😂', 'LOW', 'lottie', 3000),
  ('facepalm', 'Facepalm', 3, '🤦', 'LOW', 'lottie', 2000),
  ('crickets', 'Crickets', 4, '🦗', 'LOW', 'lottie', 3000),
  ('yawn', 'Yawn', 5, '🥱', 'LOW', 'lottie', 2500),
  ('clown', 'Clown', 5, '🤡', 'LOW', 'lottie', 2000),
  ('trash', 'Trash', 6, '🗑️', 'LOW', 'lottie', 2000),
  ('skull', 'Skull', 7, '💀', 'LOW', 'lottie', 2500),
  ('poop', 'Poop', 8, '💩', 'LOW', 'lottie', 2000),
  ('eye_roll', 'Eye Roll', 9, '🙄', 'LOW', 'lottie', 2500),
  ('snore', 'Snore', 10, '😴', 'LOW', 'lottie', 3000),

-- MID TIER (20-100 SEK) - All Lottie  
  ('mic_drop', 'Mic Drop', 20, '🎙️', 'MID', 'lottie', 3000),
  ('airhorn', 'Airhorn', 25, '📢', 'MID', 'lottie', 2500),
  ('laugh_explosion', 'Laugh Explosion', 30, '💥', 'MID', 'lottie', 3000),
  ('roast_bell', 'Roast Bell', 35, '🔔', 'MID', 'lottie', 3000),
  ('fire', 'Fire', 39, '🔥', 'MID', 'lottie', 4000),
  ('explosion', 'Explosion', 50, '💣', 'MID', 'lottie', 3000),
  ('shocked', 'Shocked', 60, '😱', 'MID', 'lottie', 2500),
  ('savage', 'Savage', 70, '😈', 'MID', 'lottie', 3500),
  ('salt_shaker', 'Salt Shaker', 80, '🧂', 'MID', 'lottie', 3000),
  ('tea_spill', 'Tea Spill', 90, '☕', 'MID', 'lottie', 3500),
  ('cringe', 'Cringe', 100, '😬', 'MID', 'lottie', 3000),

-- HIGH TIER (150-500 SEK) - ALL Lottie
  ('flame_thrower', 'Flame Thrower', 150, '🔥', 'HIGH', 'lottie', 4000),
  ('diss_stamp', 'Diss Stamp', 175, '📝', 'HIGH', 'lottie', 3000),
  ('judge_gavel', 'Judge Gavel', 200, '🧑‍⚖️', 'HIGH', 'lottie', 3500),
  ('roast_crown', 'Roast Crown', 250, '👑', 'HIGH', 'lottie', 4000),
  ('knockout_punch', 'Knockout Punch', 300, '🥊', 'HIGH', 'lottie', 3500),
  ('bomb', 'Bomb', 350, '💣', 'HIGH', 'lottie', 4000),
  ('lightning_strike', 'Lightning Strike', 400, '⚡', 'HIGH', 'lottie', 3500),
  ('roast_trophy', 'Roast Trophy', 450, '🏆', 'HIGH', 'lottie', 4000),
  ('roast_hammer', 'Roast Hammer', 475, '🔨', 'HIGH', 'lottie', 3500),
  ('roast_sword', 'Roast Sword', 490, '⚔️', 'HIGH', 'lottie', 4000),
  ('roast_shield', 'Roast Shield', 500, '🛡️', 'HIGH', 'lottie', 4000),

-- ULTRA TIER (700-1500 SEK) - All MP4 with blocking
  ('screen_shake', 'Screen Shake', 700, '📱', 'ULTRA', 'mp4', 5000),
  ('slow_motion_roast', 'Slow Motion Roast', 850, '🎬', 'ULTRA', 'mp4', 6000),
  ('spotlight_shame', 'Spotlight Shame', 1000, '🔦', 'ULTRA', 'mp4', 5500),
  ('silence_button', 'Silence Button', 1100, '🤐', 'ULTRA', 'mp4', 5000),
  ('time_freeze', 'Time Freeze', 1200, '⏱️', 'ULTRA', 'mp4', 6000),
  ('roast_nuke', 'Roast Nuke', 1300, '☢️', 'ULTRA', 'mp4', 7000),
  ('shame_bell', 'Shame Bell', 1400, '🔔', 'ULTRA', 'mp4', 5500),
  ('roast_meteor', 'Roast Meteor', 1500, '☄️', 'ULTRA', 'mp4', 6500),

-- NUCLEAR TIER (2000-4500 SEK) - Cinematic MP4
  ('funeral_music', 'Funeral Music', 2000, '⚰️', 'NUCLEAR', 'mp4', 10000),
  ('crowd_riot', 'Crowd Riot', 2500, '🚨', 'NUCLEAR', 'mp4', 12000),
  ('roast_execution', 'Roast Execution', 3000, '👀', 'NUCLEAR', 'mp4', 15000),
  ('you_are_done', "You're Done", 3500, '👋', 'NUCLEAR', 'mp4', 13000),
  ('roast_apocalypse', 'Roast Apocalypse', 4000, '🌋', 'NUCLEAR', 'mp4', 18000),
  ('roast_dragon', 'Roast Dragon', 4500, '🐉', 'NUCLEAR', 'mp4', 20000)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  icon = EXCLUDED.icon,
  tier = EXCLUDED.tier,
  format = EXCLUDED.format,
  duration_ms = EXCLUDED.duration_ms;

-- Update blocking flags for ULTRA and NUCLEAR tiers
UPDATE gifts SET blocks_others = true WHERE tier IN ('ULTRA', 'NUCLEAR');
UPDATE gifts SET is_cinematic = true WHERE tier = 'NUCLEAR';
