# Rematch System - Database Setup

Run this SQL in your Supabase SQL Editor to enable the rematch system.

```sql
-- ============================================================================
-- REMATCH SYSTEM
-- ============================================================================

CREATE TYPE IF NOT EXISTS rematch_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Rematch requests table
CREATE TABLE IF NOT EXISTS public.rematch_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  previous_match_id UUID NOT NULL REFERENCES public.battle_matches(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_match_id UUID REFERENCES public.battle_matches(id) ON DELETE SET NULL,
  status rematch_status DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rematch_requests_match ON public.rematch_requests(previous_match_id);
CREATE INDEX idx_rematch_requests_status ON public.rematch_requests(status);

-- Rematch acceptances table (tracks who accepted/declined)
CREATE TABLE IF NOT EXISTS public.rematch_acceptances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rematch_request_id UUID NOT NULL REFERENCES public.rematch_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted BOOLEAN NOT NULL,
  responded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rematch_request_id, user_id)
);

CREATE INDEX idx_rematch_acceptances_request ON public.rematch_acceptances(rematch_request_id);

-- Enable RLS
ALTER TABLE public.rematch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rematch_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view rematch requests"
  ON public.rematch_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Match participants can create rematch"
  ON public.rematch_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view acceptances"
  ON public.rematch_acceptances FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can respond to rematch"
  ON public.rematch_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON public.rematch_requests TO authenticated;
GRANT SELECT, INSERT ON public.rematch_acceptances TO authenticated;
```

## How It Works

1. After a battle ends, any participant can request a rematch
2. Rematch request expires in 20 seconds
3. All participants must accept within the window
4. If all accept → new match created with same participants
5. If anyone declines/timeout → fallback to queue-based rematch
