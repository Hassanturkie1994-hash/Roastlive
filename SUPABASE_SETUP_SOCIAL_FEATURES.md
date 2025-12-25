# Supabase Setup: VIP Clubs, Social, Replays, Analytics & Payouts

Run this SQL in your Supabase SQL Editor.

```sql
-- =============================================================
-- VIP CLUBS
-- =============================================================

CREATE TABLE IF NOT EXISTS vip_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL DEFAULT 50,
  price_yearly INTEGER NOT NULL DEFAULT 500,
  perks TEXT[] DEFAULT '{}',
  badge_emoji VARCHAR(10) DEFAULT '⭐',
  member_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vip_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES vip_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('monthly', 'yearly')),
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(club_id, user_id)
);

-- =============================================================
-- SOCIAL: FOLLOWS
-- =============================================================

CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- =============================================================
-- SOCIAL: DM CONVERSATIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation ON dm_messages(conversation_id, created_at);

-- =============================================================
-- NOTIFICATIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('follow', 'gift', 'vip', 'battle', 'stream', 'mention', 'system')),
  title VARCHAR(200) NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- =============================================================
-- STREAM REPLAYS
-- =============================================================

CREATE TABLE IF NOT EXISTS stream_replays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stream_replays_creator ON stream_replays(creator_id, created_at DESC);

-- =============================================================
-- PAYOUT REQUESTS
-- =============================================================

CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payout_method VARCHAR(20) NOT NULL CHECK (payout_method IN ('bank', 'swish', 'paypal')),
  account_details TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_user ON payout_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE vip_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- VIP Clubs
CREATE POLICY "Anyone can view clubs" ON vip_clubs FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Creators can manage their clubs" ON vip_clubs FOR ALL USING (auth.uid() = creator_id);

-- VIP Memberships
CREATE POLICY "Users can view their memberships" ON vip_memberships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can join clubs" ON vip_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave clubs" ON vip_memberships FOR UPDATE USING (auth.uid() = user_id);

-- Follows
CREATE POLICY "Anyone can view follows" ON follows FOR SELECT USING (TRUE);
CREATE POLICY "Users can follow" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- DM Conversations
CREATE POLICY "Users can view their conversations" ON dm_conversations 
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can create conversations" ON dm_conversations FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can update their conversations" ON dm_conversations FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- DM Messages
CREATE POLICY "Users can view conversation messages" ON dm_messages
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM dm_conversations WHERE user1_id = auth.uid() OR user2_id = auth.uid())
  );
CREATE POLICY "Users can send messages" ON dm_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Notifications
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Stream Replays
CREATE POLICY "Anyone can view public replays" ON stream_replays FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Creators can manage their replays" ON stream_replays FOR ALL USING (auth.uid() = creator_id);

-- Payout Requests
CREATE POLICY "Users can view their payouts" ON payout_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can request payouts" ON payout_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- ENABLE REALTIME
-- =============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE dm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE follows;

-- =============================================================
-- TRIGGERS
-- =============================================================

-- Update VIP club member count on membership change
CREATE OR REPLACE FUNCTION update_club_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = TRUE THEN
    UPDATE vip_clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    UPDATE vip_clubs SET member_count = member_count - 1 WHERE id = NEW.club_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
    UPDATE vip_clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_club_member_count
AFTER INSERT OR UPDATE ON vip_memberships
FOR EACH ROW EXECUTE FUNCTION update_club_member_count();

-- Create notification on follow
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  follower_name TEXT;
BEGIN
  SELECT username INTO follower_name FROM profiles WHERE id = NEW.follower_id;
  
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.following_id,
    'follow',
    'New Follower',
    follower_name || ' started following you',
    jsonb_build_object('follower_id', NEW.follower_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_follow
AFTER INSERT ON follows
FOR EACH ROW EXECUTE FUNCTION notify_on_follow();
```

## Feature Summary

### 1. VIP Clubs
- Creators can create VIP clubs with monthly/yearly pricing
- Members get exclusive perks and badges
- Automatic member count tracking

### 2. Social Layer (DMs & Followers)
- Follow/unfollow system
- Direct messaging with real-time updates
- Conversation threads

### 3. Notifications
- Types: follow, gift, vip, battle, stream, mention, system
- Deep-linking support via `data` field
- Mark as read functionality

### 4. Replays
- Stream recordings saved automatically
- View counts tracked
- Public/private visibility

### 5. Payouts
- Multiple methods: Bank, Swish, PayPal
- Request tracking with status updates
- Admin review system
