# Battle Matchmaking System - Database Setup

Run this SQL in your Supabase SQL Editor to enable the battle matchmaking system.

```sql
-- ============================================================================
-- BATTLE MATCHMAKING QUEUE
-- ============================================================================

-- Create enum types
CREATE TYPE IF NOT EXISTS team_size AS ENUM ('1v1', '2v2', '3v3', '4v4', '5v5');
CREATE TYPE IF NOT EXISTS queue_status AS ENUM ('waiting', 'matched', 'cancelled', 'timeout');
CREATE TYPE IF NOT EXISTS match_status AS ENUM ('forming', 'ready', 'in_progress', 'completed', 'cancelled');
CREATE TYPE IF NOT EXISTS team_side AS ENUM ('team_a', 'team_b');

-- Matchmaking queue table
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_size team_size NOT NULL,
  status queue_status DEFAULT 'waiting',
  joined_at TIMESTAMPTZ DEFAULT now(),
  matched_at TIMESTAMPTZ,
  match_id UUID,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_matchmaking_queue_user ON public.matchmaking_queue(user_id);
CREATE INDEX idx_matchmaking_queue_team_size ON public.matchmaking_queue(team_size, status);
CREATE INDEX idx_matchmaking_queue_waiting ON public.matchmaking_queue(status, joined_at) WHERE status = 'waiting';

-- Battle matches table
CREATE TABLE IF NOT EXISTS public.battle_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_size team_size NOT NULL,
  status match_status DEFAULT 'forming',
  stream_id UUID REFERENCES public.streams(id) ON DELETE SET NULL,
  duration_seconds INTEGER NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_battle_matches_status ON public.battle_matches(status);
CREATE INDEX idx_battle_matches_created ON public.battle_matches(created_at DESC);

-- Battle participants table
CREATE TABLE IF NOT EXISTS public.battle_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.battle_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team team_side NOT NULL,
  is_ready BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  UNIQUE(match_id, user_id)
);

CREATE INDEX idx_battle_participants_match ON public.battle_participants(match_id);
CREATE INDEX idx_battle_participants_user ON public.battle_participants(user_id);

-- Enable RLS
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view matchmaking queue"
  ON public.matchmaking_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join queue"
  ON public.matchmaking_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue entry"
  ON public.matchmaking_queue FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Battle matches are viewable by all"
  ON public.battle_matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Battle participants can view"
  ON public.battle_participants FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.matchmaking_queue TO authenticated;
GRANT SELECT ON public.battle_matches TO authenticated;
GRANT SELECT ON public.battle_participants TO authenticated;
```

## Match Durations Reference

- **1v1**: 180 seconds (3 minutes)
- **2v2**: 300 seconds (5 minutes)
- **3v3**: 480 seconds (8 minutes)
- **4v4**: 720 seconds (12 minutes)
- **5v5**: 900 seconds (15 minutes)
