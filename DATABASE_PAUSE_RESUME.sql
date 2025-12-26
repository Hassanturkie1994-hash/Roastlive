-- ============================================================================
-- ADDITIONAL FEATURES: Pause/Resume, Queue Improvements
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- Add pause/resume fields to streams table
ALTER TABLE streams 
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_reason VARCHAR(50);

-- Create index for paused streams
CREATE INDEX IF NOT EXISTS idx_streams_paused ON streams(is_paused, paused_at) WHERE is_paused = TRUE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Stream pause/resume fields added!';
  RAISE NOTICE '📋 Added to streams table:';
  RAISE NOTICE '  - is_paused (BOOLEAN)';
  RAISE NOTICE '  - paused_at (TIMESTAMPTZ)';
  RAISE NOTICE '  - resumed_at (TIMESTAMPTZ)';
  RAISE NOTICE '  - end_reason (VARCHAR)';
END $$;
