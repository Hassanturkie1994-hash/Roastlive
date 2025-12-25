# Complete Database Schema for Roast Live App
# Phase 1, Prompt 2: Data Model Baseline + Battle System

## Run this in your Supabase SQL Editor

```sql
-- ============================================================================
-- CORE USER & PROFILE TABLES
-- ============================================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_followers ON public.profiles(followers_count DESC);

-- ============================================================================
-- FOLLOW GRAPH
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);

-- ============================================================================
-- STREAMS & LIVE SESSION
-- ============================================================================

-- Stream types: 'solo' or 'battle'
CREATE TYPE stream_type AS ENUM ('solo', 'battle');
CREATE TYPE stream_status AS ENUM ('scheduled', 'live', 'ended', 'cancelled');

CREATE TABLE IF NOT EXISTS public.streams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  stream_type stream_type NOT NULL DEFAULT 'solo',
  status stream_status NOT NULL DEFAULT 'scheduled',
  is_live BOOLEAN DEFAULT false,
  viewer_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  replay_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_streams_host ON public.streams(host_id);
CREATE INDEX idx_streams_status ON public.streams(status);
CREATE INDEX idx_streams_live ON public.streams(is_live) WHERE is_live = true;
CREATE INDEX idx_streams_started_at ON public.streams(started_at DESC);

-- Stream participants (host + guests, up to 10 total)
CREATE TYPE participant_role AS ENUM ('host', 'guest');

CREATE TABLE IF NOT EXISTS public.stream_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role participant_role NOT NULL,
  seat_number INTEGER, -- 0 = host, 1-9 = guest seats
  is_mic_on BOOLEAN DEFAULT true,
  is_camera_on BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(stream_id, user_id),
  UNIQUE(stream_id, seat_number)
);

CREATE INDEX idx_stream_participants_stream ON public.stream_participants(stream_id);
CREATE INDEX idx_stream_participants_user ON public.stream_participants(user_id);

-- Guest invitations with expiry (20 seconds)
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

CREATE TABLE IF NOT EXISTS public.guest_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seat_number INTEGER,
  status invitation_status DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL, -- 20 seconds from creation
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_guest_invitations_invitee ON public.guest_invitations(invitee_id, status);
CREATE INDEX idx_guest_invitations_stream ON public.guest_invitations(stream_id);

-- ============================================================================
-- BATTLE MATCHMAKING SYSTEM (NEW)
-- ============================================================================

CREATE TYPE team_size AS ENUM ('1v1', '2v2', '3v3', '4v4', '5v5');
CREATE TYPE queue_status AS ENUM ('waiting', 'matched', 'cancelled', 'timeout');

-- Matchmaking queue
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_size team_size NOT NULL,
  status queue_status DEFAULT 'waiting',
  joined_at TIMESTAMPTZ DEFAULT now(),
  matched_at TIMESTAMPTZ,
  match_id UUID, -- References battle_matches.id
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_matchmaking_queue_user ON public.matchmaking_queue(user_id);
CREATE INDEX idx_matchmaking_queue_team_size ON public.matchmaking_queue(team_size, status);
CREATE INDEX idx_matchmaking_queue_waiting ON public.matchmaking_queue(status, joined_at) WHERE status = 'waiting';

-- Battle matches
CREATE TYPE match_status AS ENUM ('forming', 'ready', 'in_progress', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.battle_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_size team_size NOT NULL,
  status match_status DEFAULT 'forming',
  stream_id UUID REFERENCES public.streams(id) ON DELETE SET NULL,
  duration_seconds INTEGER NOT NULL, -- Based on team size
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_battle_matches_status ON public.battle_matches(status);
CREATE INDEX idx_battle_matches_created ON public.battle_matches(created_at DESC);

-- Battle match participants (team assignments)
CREATE TYPE team_side AS ENUM ('team_a', 'team_b');

CREATE TABLE IF NOT EXISTS public.battle_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.battle_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team team_side NOT NULL,
  is_ready BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  UNIQUE(match_id, user_id)
);

CREATE INDEX idx_battle_participants_match ON public.battle_participants(match_id);
CREATE INDEX idx_battle_participants_user ON public.battle_participants(user_id);

-- Rematch system (NEW)
CREATE TYPE rematch_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

CREATE TABLE IF NOT EXISTS public.rematch_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  previous_match_id UUID NOT NULL REFERENCES public.battle_matches(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  new_match_id UUID REFERENCES public.battle_matches(id) ON DELETE SET NULL,
  status rematch_status DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL, -- 20 seconds window
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rematch_requests_match ON public.rematch_requests(previous_match_id);
CREATE INDEX idx_rematch_requests_status ON public.rematch_requests(status);

CREATE TABLE IF NOT EXISTS public.rematch_acceptances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rematch_request_id UUID NOT NULL REFERENCES public.rematch_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accepted BOOLEAN NOT NULL,
  responded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rematch_request_id, user_id)
);

CREATE INDEX idx_rematch_acceptances_request ON public.rematch_acceptances(rematch_request_id);

-- ============================================================================
-- CHAT & MESSAGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  deleted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_messages_stream ON public.chat_messages(stream_id, created_at DESC);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);

-- Pinned messages (one per stream, timed)
CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL, -- 1-5 minutes configurable
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stream_id) -- Only one pinned message per stream
);

CREATE INDEX idx_pinned_messages_stream ON public.pinned_messages(stream_id);

-- Stream moderators (temporary, per-stream)
CREATE TABLE IF NOT EXISTS public.stream_moderators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stream_id, user_id)
);

CREATE INDEX idx_stream_moderators_stream ON public.stream_moderators(stream_id);
CREATE INDEX idx_stream_moderators_user ON public.stream_moderators(user_id);

-- Direct messages
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_direct_messages_receiver ON public.direct_messages(receiver_id, is_read);
CREATE INDEX idx_direct_messages_conversation ON public.direct_messages(sender_id, receiver_id, created_at DESC);

-- ============================================================================
-- GIFTS & ECONOMY
-- ============================================================================

CREATE TYPE gift_tier AS ENUM ('LOW', 'MID', 'HIGH', 'ULTRA', 'NUCLEAR');
CREATE TYPE gift_format AS ENUM ('lottie', 'mp4');

CREATE TABLE IF NOT EXISTS public.gifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  tier gift_tier NOT NULL,
  format gift_format NOT NULL,
  duration_ms INTEGER NOT NULL,
  blocks_others BOOLEAN DEFAULT false,
  is_cinematic BOOLEAN DEFAULT false,
  animation_url TEXT,
  sound_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gifts_tier ON public.gifts(tier);
CREATE INDEX idx_gifts_price ON public.gifts(price);

-- Gift transactions
CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gift_id TEXT NOT NULL REFERENCES public.gifts(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gift_transactions_stream ON public.gift_transactions(stream_id, created_at DESC);
CREATE INDEX idx_gift_transactions_sender ON public.gift_transactions(sender_id);
CREATE INDEX idx_gift_transactions_receiver ON public.gift_transactions(receiver_id);

-- ============================================================================
-- WALLET & TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wallets_user ON public.wallets(user_id);

CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'gift_sent', 'gift_received', 'payout');

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id UUID, -- Can reference gift_transaction, payout_request, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_type ON public.wallet_transactions(type);

-- Payout requests (NEW)
CREATE TYPE payout_status AS ENUM ('pending', 'approved', 'rejected', 'paid');

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status payout_status DEFAULT 'pending',
  payment_method TEXT,
  payment_details JSONB,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payout_requests_user ON public.payout_requests(user_id);
CREATE INDEX idx_payout_requests_status ON public.payout_requests(status);

-- ============================================================================
-- VIP CLUBS & SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vip_clubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  badge_text TEXT NOT NULL CHECK (LENGTH(badge_text) <= 5),
  badge_color TEXT NOT NULL,
  price_monthly INTEGER NOT NULL CHECK (price_monthly > 0),
  member_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id) -- One club per creator
);

CREATE INDEX idx_vip_clubs_creator ON public.vip_clubs(creator_id);

CREATE TABLE IF NOT EXISTS public.club_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.vip_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  UNIQUE(club_id, user_id)
);

CREATE INDEX idx_club_subscriptions_club ON public.club_subscriptions(club_id);
CREATE INDEX idx_club_subscriptions_user ON public.club_subscriptions(user_id);
CREATE INDEX idx_club_subscriptions_active ON public.club_subscriptions(is_active) WHERE is_active = true;

-- VIP announcements
CREATE TABLE IF NOT EXISTS public.club_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.vip_clubs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_club_announcements_club ON public.club_announcements(club_id, created_at DESC);

-- ============================================================================
-- SOCIAL FEATURES (POSTS, STORIES, ETC.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption TEXT,
  image_url TEXT,
  video_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  is_flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_user ON public.posts(user_id, created_at DESC);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);

CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX idx_post_likes_user ON public.post_likes(user_id);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_post_comments_post ON public.post_comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS public.stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_stories_user ON public.stories(user_id);
CREATE INDEX idx_stories_expires ON public.stories(expires_at);

CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

CREATE INDEX idx_story_views_story ON public.story_views(story_id);

-- ============================================================================
-- MODERATION & SAFETY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.banned_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  banned_by UUID NOT NULL REFERENCES public.profiles(id),
  banned_until TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_banned_users_user ON public.banned_users(user_id);
CREATE INDEX idx_banned_users_active ON public.banned_users(is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_reports_reported ON public.user_reports(reported_user_id);
CREATE INDEX idx_user_reports_status ON public.user_reports(status);

-- Audit trail (NEW)
CREATE TYPE audit_action AS ENUM ('ban', 'unban', 'timeout', 'delete_content', 'resolve_report', 'assign_role', 'approve_payout', 'reject_payout');

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action audit_action NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_admin ON public.admin_audit_log(admin_id, created_at DESC);
CREATE INDEX idx_admin_audit_log_target ON public.admin_audit_log(target_user_id);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log(action);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TYPE notification_type AS ENUM ('follow', 'gift', 'comment', 'like', 'invite', 'announcement', 'safety', 'wallet', 'admin');

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- ============================================================================
-- REPLAYS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.replays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_replays_stream ON public.replays(stream_id);
CREATE INDEX idx_replays_created ON public.replays(created_at DESC);

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rematch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rematch_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replays ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BASIC RLS POLICIES (Expand as needed)
-- ============================================================================

-- Profiles: Everyone can view, users can update their own
CREATE POLICY \"Profiles are viewable by everyone\"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY \"Users can update own profile\"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Streams: Everyone can view, hosts can manage their own
CREATE POLICY \"Streams are viewable by everyone\"
  ON public.streams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY \"Users can create streams\"
  ON public.streams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY \"Hosts can update own streams\"
  ON public.streams FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id);

-- Wallet: Users can view own wallet
CREATE POLICY \"Users can view own wallet\"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Notifications: Users can view own notifications
CREATE POLICY \"Users can view own notifications\"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- (Add more RLS policies as needed for each table)

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a match should start based on queue
CREATE OR REPLACE FUNCTION check_matchmaking_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- Logic to form matches when enough players are in queue
  -- This would be called by a cron job or trigger
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE public.guest_invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Function to expire old stories (24 hours)
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM public.stories WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Service role gets full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
```

## Match Duration Mapping

| Team Size | Duration |
|-----------|----------|
| 5v5       | 15 minutes (900 seconds) |
| 4v4       | 12 minutes (720 seconds) |
| 3v3       | 8 minutes (480 seconds) |
| 2v2       | 5 minutes (300 seconds) |
| 1v1       | 3 minutes (180 seconds) |

## Key Schema Features

### 1. **Battle Matchmaking**
- Queue system by team size
- Match formation with team assignments
- Rematch system with 20-second acceptance window

### 2. **Stream Management**
- Solo vs Battle stream types
- Up to 10 participants (1 host + 9 guests)
- Guest invitations with 20-second expiry

### 3. **Gift Economy**
- 45 gifts across 5 tiers
- Format enforcement (Lottie vs MP4)
- Blocking system for Ultra/Nuclear tiers

### 4. **Wallet & Payouts**
- Ledger-based accounting
- Payout request workflow
- Admin approval system

### 5. **VIP Clubs**
- One club per creator
- Badge customization (max 5 chars)
- Subscription management

### 6. **Audit Trail**
- All admin actions logged
- Target user tracking
- Metadata for forensics

---

**Next Steps:**
1. Run this schema in Supabase
2. Populate gift catalog
3. Implement Pre-Live Setup UI (Phase 2)
4. Build Matchmaking Queue (Phase 3)
