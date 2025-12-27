-- ============================================
-- USER SETTINGS & PREFERENCES SCHEMA
-- Complete settings system for Roast Live
-- ============================================

-- Main user settings table (privacy, account, preferences)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Privacy Settings
  is_private_account BOOLEAN DEFAULT false,
  show_followers_list BOOLEAN DEFAULT true,
  show_following_list BOOLEAN DEFAULT true,
  show_liked_content BOOLEAN DEFAULT true,
  appear_in_search BOOLEAN DEFAULT true,
  show_activity_status BOOLEAN DEFAULT true,
  dm_permissions TEXT DEFAULT 'everyone', -- 'everyone', 'followers', 'none'
  comment_permissions TEXT DEFAULT 'everyone', -- 'everyone', 'followers', 'none'
  mention_permissions TEXT DEFAULT 'everyone', -- 'everyone', 'followers', 'none'
  allow_duets BOOLEAN DEFAULT true,
  allow_stitches BOOLEAN DEFAULT true,
  allow_downloads BOOLEAN DEFAULT true,
  allow_audio_reuse BOOLEAN DEFAULT true,
  show_in_suggestions BOOLEAN DEFAULT true,
  
  -- Account Management
  language TEXT DEFAULT 'en',
  region TEXT DEFAULT 'US',
  theme TEXT DEFAULT 'dark', -- 'light', 'dark', 'system'
  timezone TEXT DEFAULT 'UTC',
  two_factor_enabled BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  
  -- Notification Preferences
  notifications_enabled BOOLEAN DEFAULT true,
  push_likes BOOLEAN DEFAULT true,
  push_comments BOOLEAN DEFAULT true,
  push_followers BOOLEAN DEFAULT true,
  push_mentions BOOLEAN DEFAULT true,
  push_dms BOOLEAN DEFAULT true,
  push_live_alerts BOOLEAN DEFAULT true,
  push_gifts BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  email_newsletter BOOLEAN DEFAULT false,
  notification_sound BOOLEAN DEFAULT true,
  notification_vibration BOOLEAN DEFAULT true,
  do_not_disturb BOOLEAN DEFAULT false,
  dnd_start_time TIME,
  dnd_end_time TIME,
  
  -- Live Streaming Controls
  default_stream_visibility TEXT DEFAULT 'public', -- 'public', 'followers', 'private'
  enable_live_chat BOOLEAN DEFAULT true,
  live_chat_mode TEXT DEFAULT 'everyone', -- 'everyone', 'followers'
  enable_slow_mode BOOLEAN DEFAULT false,
  slow_mode_seconds INTEGER DEFAULT 3,
  allow_guest_requests BOOLEAN DEFAULT true,
  max_guests INTEGER DEFAULT 9,
  enable_gifts_in_live BOOLEAN DEFAULT true,
  save_live_replays BOOLEAN DEFAULT true,
  stream_quality TEXT DEFAULT 'auto', -- 'auto', 'high', 'medium', 'low'
  
  -- Content Visibility
  default_post_audience TEXT DEFAULT 'public', -- 'public', 'followers', 'private'
  allow_shares BOOLEAN DEFAULT true,
  show_profile_video BOOLEAN DEFAULT true,
  
  -- Monetization
  monetization_enabled BOOLEAN DEFAULT false,
  accept_gifts BOOLEAN DEFAULT true,
  accept_tips BOOLEAN DEFAULT true,
  payout_method TEXT, -- 'paypal', 'bank', 'stripe'
  payout_email TEXT,
  
  -- Accessibility
  caption_always_on BOOLEAN DEFAULT false,
  text_size TEXT DEFAULT 'medium', -- 'small', 'medium', 'large', 'xlarge'
  high_contrast BOOLEAN DEFAULT false,
  color_blind_mode BOOLEAN DEFAULT false,
  reduce_motion BOOLEAN DEFAULT false,
  haptic_feedback BOOLEAN DEFAULT true,
  
  -- Safety
  screen_time_limit_minutes INTEGER DEFAULT 0, -- 0 = no limit
  screen_time_enabled BOOLEAN DEFAULT false,
  restricted_mode BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment filters (blocked words/phrases per user)
CREATE TABLE IF NOT EXISTS comment_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  filter_type TEXT DEFAULT 'block', -- 'block', 'hold_for_review'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_filters_user ON comment_filters(user_id);

-- Blocked users
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_user ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_user_id);

-- Muted users (hide content without blocking)
CREATE TABLE IF NOT EXISTS muted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, muted_user_id)
);

CREATE INDEX IF NOT EXISTS idx_muted_users_user ON muted_users(user_id);

-- Active sessions (for security)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT,
  device_type TEXT, -- 'mobile', 'web', 'tablet'
  ip_address TEXT,
  user_agent TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(last_active);

-- Connected accounts (social login)
CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google', 'apple', 'facebook'
  provider_user_id TEXT NOT NULL,
  email TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);

-- Notification schedule (DND periods)
CREATE TABLE IF NOT EXISTS notification_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday), NULL for all days
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_schedules_user ON notification_schedules(user_id);

-- Data export requests
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'expired'
  download_url TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_exports_user ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_export_requests(status);

-- Screen time tracking
CREATE TABLE IF NOT EXISTS screen_time_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  duration_minutes INTEGER,
  date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_screen_time_user_date ON screen_time_sessions(user_id, date);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to initialize default settings for new users
CREATE OR REPLACE FUNCTION initialize_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create settings when user signs up
DROP TRIGGER IF EXISTS on_user_created_settings ON auth.users;
CREATE TRIGGER on_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_settings();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_settings_updated_at ON user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE muted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_sessions ENABLE ROW LEVEL SECURITY;

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comment filters policies
CREATE POLICY "Users can manage own filters" ON comment_filters FOR ALL USING (auth.uid() = user_id);

-- Blocked users policies
CREATE POLICY "Users can manage own blocks" ON blocked_users FOR ALL USING (auth.uid() = user_id);

-- Muted users policies
CREATE POLICY "Users can manage own mutes" ON muted_users FOR ALL USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users can view own sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON user_sessions FOR DELETE USING (auth.uid() = user_id);

-- Connected accounts policies
CREATE POLICY "Users can manage own connections" ON connected_accounts FOR ALL USING (auth.uid() = user_id);

-- Notification schedules policies
CREATE POLICY "Users can manage own schedules" ON notification_schedules FOR ALL USING (auth.uid() = user_id);

-- Data export policies
CREATE POLICY "Users can view own exports" ON data_export_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create export requests" ON data_export_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Screen time policies
CREATE POLICY "Users can view own screen time" ON screen_time_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own screen time" ON screen_time_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View for checking if user can interact with another user
CREATE OR REPLACE VIEW user_interaction_permissions AS
SELECT 
  u.id as user_id,
  u.username,
  s.is_private_account,
  s.dm_permissions,
  s.comment_permissions,
  s.mention_permissions,
  s.allow_duets,
  s.allow_stitches,
  s.show_activity_status
FROM auth.users u
LEFT JOIN user_settings s ON u.id = s.user_id;

COMMENT ON TABLE user_settings IS 'Comprehensive user preferences and privacy settings';
COMMENT ON TABLE comment_filters IS 'User-defined comment filters and blocked keywords';
COMMENT ON TABLE blocked_users IS 'Users blocked by other users';
COMMENT ON TABLE muted_users IS 'Users muted by other users (hide content only)';
COMMENT ON TABLE user_sessions IS 'Active login sessions for security management';
COMMENT ON TABLE connected_accounts IS 'Social login connections (Google, Apple, etc)';
