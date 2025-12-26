-- ============================================================================
-- DATABASE FIXES FOR PHASE 1 & 2
-- Run this SQL in your Supabase SQL Editor to fix all schema issues
-- ============================================================================

-- Fix 1: Ensure stream_messages table has all required columns
-- This fixes the "avatar_url not found" error (9496.png)
ALTER TABLE stream_messages 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_moderator BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_host BOOLEAN DEFAULT FALSE;

-- Fix 2: Add indexes if missing
CREATE INDEX IF NOT EXISTS idx_stream_messages_stream ON stream_messages(stream_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stream_messages_pinned ON stream_messages(stream_id, is_pinned) WHERE is_pinned = TRUE;

-- Fix 3: Ensure streams table exists and has viewer_count
CREATE TABLE IF NOT EXISTS streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  channel_name VARCHAR(100) NOT NULL,
  is_live BOOLEAN DEFAULT TRUE,
  viewer_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_streams_host ON streams(host_id);
CREATE INDEX IF NOT EXISTS idx_streams_live ON streams(is_live, started_at DESC);

-- Fix 4: Enable RLS and add policies for streams
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Streams are viewable by everyone" ON streams;
CREATE POLICY "Streams are viewable by everyone"
  ON streams FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create their own streams" ON streams;
CREATE POLICY "Users can create their own streams"
  ON streams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Users can update their own streams" ON streams;
CREATE POLICY "Users can update their own streams"
  ON streams FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id);

-- Fix 5: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON streams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stream_messages TO authenticated;

-- Fix 6: Enable realtime for streams table
ALTER PUBLICATION supabase_realtime ADD TABLE streams;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database fixes applied successfully!';
  RAISE NOTICE '📋 Fixed:';
  RAISE NOTICE '  - Added missing columns to stream_messages';
  RAISE NOTICE '  - Ensured streams table exists';
  RAISE NOTICE '  - Added proper indexes and RLS policies';
  RAISE NOTICE '  - Enabled realtime subscriptions';
END $$;
