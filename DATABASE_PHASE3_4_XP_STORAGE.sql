-- ============================================================================
-- PHASE 3 & 4: XP/Ranking System and Storage Setup
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- Add XP and ranking fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS rank_title VARCHAR(100) DEFAULT 'Novice Roaster',
ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS current_win_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_win_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_streams INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gifts_sent INTEGER DEFAULT 0;

-- Create XP transactions table for audit trail
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  reference_id UUID, -- battle_id, stream_id, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id, created_at DESC);

-- Create leaderboard view (top 100 users by XP)
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
  id,
  username,
  avatar_url,
  total_xp,
  level,
  rank_title,
  badges,
  battles_won,
  battles_lost,
  total_battles,
  ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank
FROM profiles
WHERE total_xp > 0
ORDER BY total_xp DESC
LIMIT 100;

-- Function to award XP and update level
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason VARCHAR,
  p_reference_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_rank_title VARCHAR;
  v_result JSON;
BEGIN
  -- Add XP
  UPDATE profiles
  SET total_xp = total_xp + p_amount
  WHERE id = p_user_id
  RETURNING total_xp INTO v_new_xp;

  -- Calculate new level (levels 1-50)
  -- Formula: XP needed = level * 100 + (level - 1) * 50
  v_new_level := 1;
  DECLARE
    cumulative_xp INTEGER := 0;
    xp_for_level INTEGER;
  BEGIN
    FOR level IN 1..50 LOOP
      xp_for_level := level * 100 + (level - 1) * 50;
      cumulative_xp := cumulative_xp + xp_for_level;
      IF v_new_xp >= cumulative_xp THEN
        v_new_level := level + 1;
      ELSE
        EXIT;
      END IF;
    END LOOP;
  END;

  -- Cap at level 50
  IF v_new_level > 50 THEN
    v_new_level := 50;
  END IF;

  -- Determine rank title
  CASE 
    WHEN v_new_level >= 50 THEN v_rank_title := 'Grand Roast Champion';
    WHEN v_new_level >= 45 THEN v_rank_title := 'Supreme Roaster';
    WHEN v_new_level >= 40 THEN v_rank_title := 'Legendary Comic';
    WHEN v_new_level >= 35 THEN v_rank_title := 'Elite Roaster';
    WHEN v_new_level >= 30 THEN v_rank_title := 'Roast Master';
    WHEN v_new_level >= 25 THEN v_rank_title := 'Comedy Veteran';
    WHEN v_new_level >= 20 THEN v_rank_title := 'Sharp Tongue';
    WHEN v_new_level >= 15 THEN v_rank_title := 'Witty Performer';
    WHEN v_new_level >= 10 THEN v_rank_title := 'Rising Star';
    WHEN v_new_level >= 5 THEN v_rank_title := 'Amateur Comedian';
    ELSE v_rank_title := 'Novice Roaster';
  END CASE;

  -- Update level and rank
  UPDATE profiles
  SET 
    level = v_new_level,
    rank_title = v_rank_title
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO xp_transactions (user_id, amount, reason, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_reference_id);

  -- Return result
  v_result := json_build_object(
    'total_xp', v_new_xp,
    'level', v_new_level,
    'rank_title', v_rank_title
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to update win streak
CREATE OR REPLACE FUNCTION update_win_streak(
  p_user_id UUID,
  p_won BOOLEAN
) RETURNS VOID AS $$
BEGIN
  IF p_won THEN
    UPDATE profiles
    SET 
      current_win_streak = current_win_streak + 1,
      longest_win_streak = GREATEST(longest_win_streak, current_win_streak + 1)
    WHERE id = p_user_id;
  ELSE
    UPDATE profiles
    SET current_win_streak = 0
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own XP transactions"
  ON xp_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Leaderboard is viewable by all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT ON xp_transactions TO authenticated;
GRANT SELECT ON leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION award_xp TO authenticated;
GRANT EXECUTE ON FUNCTION update_win_streak TO authenticated;

-- ============================================================================
-- SUPABASE STORAGE BUCKETS
-- ============================================================================

-- Note: Storage buckets must be created via Supabase Dashboard
-- Go to Storage > Create Bucket and create these buckets:
-- 1. 'avatars' - Public bucket for profile pictures
-- 2. 'stream-thumbnails' - Public bucket for stream cover images
-- 3. 'posts' - Public bucket for post images
-- 4. 'stories' - Public bucket for story videos/images (24h expiry)
-- 5. 'gifts' - Public bucket for custom gift animations

-- After creating buckets, run these policies:

-- Example policy for avatars bucket (adapt for each bucket)
-- CREATE POLICY "Avatar images are publicly accessible"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');

-- CREATE POLICY "Users can upload their own avatar"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'avatars' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can update their own avatar"
--   ON storage.objects FOR UPDATE
--   USING (
--     bucket_id = 'avatars' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can delete their own avatar"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'avatars' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ XP/Ranking system setup complete!';
  RAISE NOTICE '📋 Setup:';
  RAISE NOTICE '  - Added XP fields to profiles table';
  RAISE NOTICE '  - Created xp_transactions table';
  RAISE NOTICE '  - Created leaderboard view';
  RAISE NOTICE '  - Added award_xp() function';
  RAISE NOTICE '  - Added update_win_streak() function';
  RAISE NOTICE '';
  RAISE NOTICE '🪣 NEXT STEP: Create Storage Buckets';
  RAISE NOTICE '  1. Go to Supabase Dashboard → Storage';
  RAISE NOTICE '  2. Create these PUBLIC buckets:';
  RAISE NOTICE '     - avatars';
  RAISE NOTICE '     - stream-thumbnails';
  RAISE NOTICE '     - posts';
  RAISE NOTICE '     - stories';
  RAISE NOTICE '     - gifts';
  RAISE NOTICE '  3. Set policies for each bucket (see SQL comments above)';
END $$;
