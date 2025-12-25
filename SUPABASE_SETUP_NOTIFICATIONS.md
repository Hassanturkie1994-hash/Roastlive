# Notifications & Replays - Database Setup

Run this SQL in your Supabase SQL Editor to enable notifications and replay features.

```sql
-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TYPE IF NOT EXISTS notification_type AS ENUM (
  'follow',
  'gift',
  'comment',
  'like',
  'invite',
  'announcement',
  'safety',
  'wallet',
  'admin'
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replays ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Replays are viewable by all"
  ON public.replays FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.replays TO authenticated;
```

## Notification Types

- **follow**: New follower
- **gift**: Gift received
- **comment**: New comment on post
- **like**: Post liked
- **invite**: Stream guest invitation
- **announcement**: VIP club announcement
- **safety**: Moderation warnings
- **wallet**: Balance changes
- **admin**: Admin messages
