# Supabase Setup: Battle Matchmaking & Stream Moderators

Run this SQL in your Supabase SQL Editor to set up the matchmaking and moderator tables.

```sql
-- =============================================================
-- MATCHMAKING QUEUE TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_size VARCHAR(10) NOT NULL CHECK (team_size IN ('1v1', '2v2', '3v3', '4v4', '5v5')),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled', 'timeout')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  matched_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  match_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queue queries
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_status ON matchmaking_queue(status, team_size);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_user ON matchmaking_queue(user_id, status);

-- =============================================================
-- BATTLE MATCHES TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS battle_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_size VARCHAR(10) NOT NULL CHECK (team_size IN ('1v1', '2v2', '3v3', '4v4', '5v5')),
  status VARCHAR(20) NOT NULL DEFAULT 'forming' CHECK (status IN ('forming', 'ready', 'in_progress', 'completed', 'cancelled')),
  duration_seconds INTEGER NOT NULL DEFAULT 180,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner_team VARCHAR(10) CHECK (winner_team IN ('team_a', 'team_b')),
  team_a_score INTEGER DEFAULT 0,
  team_b_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- BATTLE PARTICIPANTS TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS battle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES battle_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team VARCHAR(10) NOT NULL CHECK (team IN ('team_a', 'team_b')),
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

-- Index for match participant queries
CREATE INDEX IF NOT EXISTS idx_battle_participants_match ON battle_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_user ON battle_participants(user_id);

-- =============================================================
-- REMATCH REQUESTS TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS rematch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_match_id UUID NOT NULL REFERENCES battle_matches(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- REMATCH ACCEPTANCES TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS rematch_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rematch_request_id UUID NOT NULL REFERENCES rematch_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rematch_request_id, user_id)
);

-- =============================================================
-- STREAM PRESENCE TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS stream_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(stream_id, user_id)
);

-- Index for presence queries
CREATE INDEX IF NOT EXISTS idx_stream_presence_stream ON stream_presence(stream_id, is_active);

-- =============================================================
-- STREAM MODERATORS TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS stream_moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  UNIQUE(stream_id, user_id)
);

-- Index for moderator queries
CREATE INDEX IF NOT EXISTS idx_stream_moderators_stream ON stream_moderators(stream_id, is_active);
CREATE INDEX IF NOT EXISTS idx_stream_moderators_user ON stream_moderators(user_id, is_active);

-- =============================================================
-- BATTLE VOTES TABLE (for audience voting)
-- =============================================================

CREATE TABLE IF NOT EXISTS battle_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES battle_matches(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team VARCHAR(10) NOT NULL CHECK (team IN ('team_a', 'team_b')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, voter_id)
);

-- Index for vote counting
CREATE INDEX IF NOT EXISTS idx_battle_votes_match ON battle_votes(match_id, team);

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rematch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rematch_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_votes ENABLE ROW LEVEL SECURITY;

-- Matchmaking Queue Policies
CREATE POLICY "Users can view their own queue entries" ON matchmaking_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue entries" ON matchmaking_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue entries" ON matchmaking_queue
  FOR UPDATE USING (auth.uid() = user_id);

-- Battle Matches Policies (anyone can view matches)
CREATE POLICY "Anyone can view battle matches" ON battle_matches
  FOR SELECT USING (true);

-- Battle Participants Policies
CREATE POLICY "Anyone can view battle participants" ON battle_participants
  FOR SELECT USING (true);

CREATE POLICY "Participants can update their own status" ON battle_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Stream Presence Policies
CREATE POLICY "Anyone can view stream presence" ON stream_presence
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own presence" ON stream_presence
  FOR ALL USING (auth.uid() = user_id);

-- Stream Moderators Policies
CREATE POLICY "Anyone can view stream moderators" ON stream_moderators
  FOR SELECT USING (true);

-- Only stream host can manage moderators (implement via Edge Function or check stream ownership)
CREATE POLICY "Users can manage moderators" ON stream_moderators
  FOR ALL USING (true);

-- Battle Votes Policies
CREATE POLICY "Users can insert their own vote" ON battle_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Anyone can view votes" ON battle_votes
  FOR SELECT USING (true);

-- =============================================================
-- ENABLE REALTIME
-- =============================================================

-- Enable realtime for matchmaking updates
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE stream_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE stream_moderators;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_votes;
```

## How It Works

### Matchmaking Flow:
1. User joins queue → insert into `matchmaking_queue` with status 'waiting'
2. Server matches users with same `team_size` → creates `battle_matches` entry
3. Server assigns users to teams → inserts into `battle_participants`
4. Updates queue entries to status 'matched' with match_id
5. Users mark themselves ready via `battle_participants.is_ready`
6. When all ready, match status → 'in_progress'

### Moderator Assignment Flow:
1. Stream host opens moderator modal
2. Queries `stream_presence` to get active viewers
3. Host taps "Make Mod" → upsert into `stream_moderators`
4. Moderator badge appears for that user in chat
5. Host can remove mod → update `is_active = false`

### Battle Voting:
1. During battle, viewers vote for team_a or team_b
2. Each viewer can vote once per match (UNIQUE constraint)
3. At battle end, count votes by team to determine winner
