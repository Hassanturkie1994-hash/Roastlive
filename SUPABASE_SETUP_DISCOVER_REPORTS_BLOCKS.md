# Supabase Setup: Discover, Leaderboards, Reports & Blocking

## Overview
This file contains the SQL schema for:
- Stream Discovery & Search
- Leaderboards System
- Reporting System
- User Blocking System

Run these SQL statements in your Supabase SQL Editor.

---

## 1. Stream Tags & Categories

```sql
-- Stream tags for discovery
CREATE TABLE IF NOT EXISTS stream_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stream_tags_tag ON stream_tags(tag);
CREATE INDEX idx_stream_tags_stream_id ON stream_tags(stream_id);

-- Stream categories
CREATE TABLE IF NOT EXISTS stream_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  icon VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO stream_categories (name, icon, display_order) VALUES
  ('all', 'grid', 0),
  ('battle', 'flame', 1),
  ('freestyle', 'mic', 2),
  ('comedy', 'happy', 3),
  ('trending', 'trending-up', 4)
ON CONFLICT (name) DO NOTHING;

-- Add category to streams table
ALTER TABLE streams 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'all',
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
```

---

## 2. Leaderboards System

```sql
-- Leaderboard statistics (aggregated periodically)
CREATE TABLE IF NOT EXISTS leaderboard_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
  category VARCHAR(50) NOT NULL, -- 'battles_won', 'gifts_received', 'gifts_sent', 'followers'
  value INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  previous_rank INTEGER,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period, category, period_start)
);

CREATE INDEX idx_leaderboard_period_category ON leaderboard_stats(period, category, rank);
CREATE INDEX idx_leaderboard_user ON leaderboard_stats(user_id);

-- Function to calculate leaderboard rankings
CREATE OR REPLACE FUNCTION update_leaderboard_rankings(
  p_period VARCHAR(20),
  p_category VARCHAR(50)
)
RETURNS void AS $$
BEGIN
  WITH ranked_users AS (
    SELECT 
      id,
      user_id,
      value,
      rank,
      ROW_NUMBER() OVER (ORDER BY value DESC) as new_rank
    FROM leaderboard_stats
    WHERE period = p_period 
    AND category = p_category
    AND period_end >= CURRENT_DATE
  )
  UPDATE leaderboard_stats ls
  SET 
    previous_rank = ls.rank,
    rank = ru.new_rank,
    updated_at = NOW()
  FROM ranked_users ru
  WHERE ls.id = ru.id;
END;
$$ LANGUAGE plpgsql;

-- View for current leaderboards
CREATE OR REPLACE VIEW current_leaderboards AS
SELECT 
  ls.*,
  u.username,
  u.avatar_url,
  (ls.previous_rank - ls.rank) as position_change
FROM leaderboard_stats ls
JOIN auth.users u ON ls.user_id = u.id
WHERE ls.period_end >= CURRENT_DATE
ORDER BY ls.period, ls.category, ls.rank;
```

---

## 3. Reporting System

```sql
-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_type VARCHAR(20) NOT NULL, -- 'user', 'stream', 'chat', 'other'
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  reported_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- Report reasons enum (for validation)
CREATE TABLE IF NOT EXISTS report_reasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type VARCHAR(20) NOT NULL,
  reason_id VARCHAR(50) NOT NULL,
  label TEXT NOT NULL,
  UNIQUE(report_type, reason_id)
);

-- Insert default report reasons
INSERT INTO report_reasons (report_type, reason_id, label) VALUES
  -- User reports
  ('user', 'harassment', 'Harassment or bullying'),
  ('user', 'hate_speech', 'Hate speech'),
  ('user', 'spam', 'Spam or scam'),
  ('user', 'impersonation', 'Impersonation'),
  ('user', 'inappropriate', 'Inappropriate behavior'),
  ('user', 'other', 'Other'),
  -- Stream reports
  ('stream', 'inappropriate_content', 'Inappropriate content'),
  ('stream', 'violence', 'Violence or dangerous behavior'),
  ('stream', 'nudity', 'Nudity or sexual content'),
  ('stream', 'copyright', 'Copyright violation'),
  ('stream', 'misleading', 'Misleading or fake content'),
  ('stream', 'other', 'Other'),
  -- Chat reports
  ('chat', 'spam', 'Spam'),
  ('chat', 'harassment', 'Harassment'),
  ('chat', 'hate_speech', 'Hate speech'),
  ('chat', 'threats', 'Threats or violence'),
  ('chat', 'inappropriate', 'Inappropriate content'),
  ('chat', 'other', 'Other'),
  -- Other reports
  ('other', 'bug', 'Technical issue or bug'),
  ('other', 'feature', 'Feature request'),
  ('other', 'abuse', 'Terms of service violation'),
  ('other', 'safety', 'Safety concern'),
  ('other', 'other', 'Other')
ON CONFLICT (report_type, reason_id) DO NOTHING;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();
```

---

## 4. User Blocking System

```sql
-- Blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(
  p_blocker_id UUID,
  p_blocked_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = p_blocker_id
    AND blocked_id = p_blocked_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get blocked users list
CREATE OR REPLACE FUNCTION get_blocked_users(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.avatar_url,
    bu.created_at as blocked_at
  FROM blocked_users bu
  JOIN auth.users u ON bu.blocked_id = u.id
  WHERE bu.blocker_id = p_user_id
  ORDER BY bu.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE stream_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Stream tags policies
CREATE POLICY "Anyone can view stream tags"
  ON stream_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Streamers can manage their stream tags"
  ON stream_tags FOR ALL
  TO authenticated
  USING (
    stream_id IN (
      SELECT id FROM streams WHERE streamer_id = auth.uid()
    )
  );

-- Stream categories policies
CREATE POLICY "Anyone can view categories"
  ON stream_categories FOR SELECT
  TO authenticated
  USING (true);

-- Leaderboard policies
CREATE POLICY "Anyone can view leaderboards"
  ON leaderboard_stats FOR SELECT
  TO authenticated
  USING (true);

-- Reports policies
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('head_admin', 'admin', 'support')
    )
  );

CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('head_admin', 'admin', 'support')
    )
  );

-- Report reasons policies
CREATE POLICY "Anyone can view report reasons"
  ON report_reasons FOR SELECT
  TO authenticated
  USING (true);

-- Blocked users policies
CREATE POLICY "Users can view their blocked list"
  ON blocked_users FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can block others"
  ON blocked_users FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid() AND blocker_id != blocked_id);

CREATE POLICY "Users can unblock others"
  ON blocked_users FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());
```

---

## 6. API Endpoints to Implement

### Discovery
- `GET /api/streams/discover` - Get live streams with filters
- `GET /api/streams/search?q={query}` - Search streams and users
- `GET /api/streams/categories` - Get all categories

### Leaderboards
- `GET /api/leaderboard?category={category}&period={period}` - Get leaderboard data
- `POST /api/leaderboard/refresh` - Manually refresh rankings (admin only)

### Reports
- `GET /api/reports` - Get user's reports
- `POST /api/reports` - Create a new report
- `GET /api/reports/all` - Get all reports (admin only)
- `PUT /api/reports/:id` - Update report status (admin only)

### Blocking
- `GET /api/users/blocked` - Get blocked users list
- `POST /api/users/block/:userId` - Block a user
- `POST /api/users/unblock/:userId` - Unblock a user
- `GET /api/users/is-blocked/:userId` - Check if user is blocked

---

## Setup Complete!

After running all the SQL statements above:
1. Test the discover page to ensure streams can be filtered
2. Verify leaderboards are displaying correctly
3. Test the reporting flow end-to-end
4. Test blocking/unblocking users

Remember to implement the corresponding API endpoints in your FastAPI backend!
