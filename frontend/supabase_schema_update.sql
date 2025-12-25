-- Update HIGH tier gifts to be ALL Lottie format
-- This corrects Bomb and Lightning Strike to be Lottie instead of MP4

UPDATE gifts SET format = 'lottie' WHERE id IN ('bomb', 'lightning_strike');

-- Verify all tiers have correct formats:
-- LOW tier: All Lottie
-- MID tier: All Lottie  
-- HIGH tier: All Lottie
-- ULTRA tier: All MP4
-- NUCLEAR tier: All MP4
