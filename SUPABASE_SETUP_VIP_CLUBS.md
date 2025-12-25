# VIP Clubs System - Database Setup

**IMPORTANT**: VIP clubs can only be created by users who have streamed for at least 1 hour total.

Run this SQL in your Supabase SQL Editor to enable VIP clubs.

```sql
-- ============================================================================
-- VIP CLUBS SYSTEM
-- ============================================================================

-- VIP clubs table (one per creator)
CREATE TABLE IF NOT EXISTS public.vip_clubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  badge_text TEXT NOT NULL CHECK (LENGTH(badge_text) <= 5),
  badge_color TEXT NOT NULL,
  price_monthly INTEGER NOT NULL CHECK (price_monthly >= 50),
  member_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id)
);

CREATE INDEX idx_vip_clubs_creator ON public.vip_clubs(creator_id);

-- Club subscriptions table
CREATE TABLE IF NOT EXISTS public.club_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.vip_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  UNIQUE(club_id, user_id)
);

CREATE INDEX idx_club_subscriptions_club ON public.club_subscriptions(club_id);
CREATE INDEX idx_club_subscriptions_user ON public.club_subscriptions(user_id);
CREATE INDEX idx_club_subscriptions_active ON public.club_subscriptions(is_active) WHERE is_active = true;

-- Club announcements table
CREATE TABLE IF NOT EXISTS public.club_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.vip_clubs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_club_announcements_club ON public.club_announcements(club_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.vip_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "VIP clubs are viewable by all"
  ON public.vip_clubs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Creators can create VIP clubs"
  ON public.vip_clubs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id AND
    -- Must have streamed for at least 1 hour (3600 seconds)
    EXISTS (
      SELECT 1 FROM public.streams
      WHERE host_id = auth.uid()
      AND started_at IS NOT NULL
      AND ended_at IS NOT NULL
      GROUP BY host_id
      HAVING SUM(EXTRACT(EPOCH FROM (ended_at - started_at))) >= 3600
    )
  );

CREATE POLICY "Creators can update own club"
  ON public.vip_clubs FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can view subscriptions"
  ON public.club_subscriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can subscribe to clubs"
  ON public.club_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Announcements viewable by members"
  ON public.club_announcements FOR SELECT
  TO authenticated
  USING (
    club_id IN (
      SELECT club_id FROM public.club_subscriptions
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Creators can send announcements"
  ON public.club_announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    club_id IN (
      SELECT id FROM public.vip_clubs WHERE creator_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.vip_clubs TO authenticated;
GRANT SELECT, INSERT ON public.club_subscriptions TO authenticated;
GRANT SELECT, INSERT ON public.club_announcements TO authenticated;
```

## VIP Club Requirements

- **Minimum streaming time**: 1 hour total (across all streams)
- **Badge text limit**: 5 characters maximum
- **Minimum price**: 50 SEK per month
- **One club per creator**: Enforced via UNIQUE constraint

## Badge Display Rules

- VIP badges ONLY show in the creator's streams
- Badge text is uppercase (enforced in app)
- Badge color is customizable (5 preset colors)
