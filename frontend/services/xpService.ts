import { supabase } from '../lib/supabase';
import { XP_REWARDS, calculateLevel, getRankTitle, checkBadges } from './xpSystem';

export interface XPResult {
  success: boolean;
  newXP?: number;
  newLevel?: number;
  leveledUp?: boolean;
  rankTitle?: string;
  error?: string;
}

/**
 * Award XP to a user
 */
export async function awardXP(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<XPResult> {
  try {
    // Call the database function
    const { data, error } = await supabase.rpc('award_xp', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_reference_id: referenceId,
    });

    if (error) throw error;

    // Get previous level
    const { data: profile } = await supabase
      .from('profiles')
      .select('level')
      .eq('id', userId)
      .single();

    const previousLevel = profile?.level || 1;
    const leveledUp = data.level > previousLevel;

    return {
      success: true,
      newXP: data.total_xp,
      newLevel: data.level,
      leveledUp,
      rankTitle: data.rank_title,
    };
  } catch (error: any) {
    console.error('Award XP error:', error);
    return {
      success: false,
      error: error.message || 'Failed to award XP',
    };
  }
}

/**
 * Award XP for battle result
 */
export async function awardBattleXP(
  userId: string,
  won: boolean,
  tie: boolean,
  matchId: string
): Promise<XPResult> {
  const amount = tie ? XP_REWARDS.BATTLE_TIE : won ? XP_REWARDS.BATTLE_WIN : XP_REWARDS.BATTLE_LOSS;
  const reason = tie ? 'Battle Tie' : won ? 'Battle Victory' : 'Battle Participation';

  // Update win streak
  await supabase.rpc('update_win_streak', {
    p_user_id: userId,
    p_won: won && !tie,
  });

  return awardXP(userId, amount, reason, matchId);
}

/**
 * Award XP for stream completion
 */
export async function awardStreamXP(
  userId: string,
  durationMinutes: number,
  streamId: string
): Promise<XPResult> {
  let amount = XP_REWARDS.STREAM_COMPLETE;
  let reason = 'Stream Completed';

  if (durationMinutes >= 60) {
    amount = XP_REWARDS.STREAM_60_MIN;
    reason = 'Stream 60+ Minutes';
  } else if (durationMinutes >= 30) {
    amount = XP_REWARDS.STREAM_30_MIN;
    reason = 'Stream 30+ Minutes';
  }

  // Increment total streams
  await supabase
    .from('profiles')
    .update({ total_streams: supabase.sql`total_streams + 1` })
    .eq('id', userId);

  return awardXP(userId, amount, reason, streamId);
}

/**
 * Get user's XP and level info
 */
export async function getUserXPInfo(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('total_xp, level, rank_title, badges, current_win_streak, longest_win_streak')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const { level, currentLevelXP, nextLevelXP, progress } = calculateLevel(data.total_xp);

    return {
      totalXP: data.total_xp,
      level: data.level,
      rankTitle: data.rank_title,
      badges: data.badges || [],
      currentWinStreak: data.current_win_streak,
      longestWinStreak: data.longest_win_streak,
      currentLevelXP,
      nextLevelXP,
      progress,
    };
  } catch (error) {
    console.error('Get XP info error:', error);
    return null;
  }
}

/**
 * Get leaderboard (top 100)
 */
export async function getLeaderboard(limit: number = 100) {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return [];
  }
}

/**
 * Get user's leaderboard rank
 */
export async function getUserRank(userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('rank')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return data?.rank || null;
  } catch (error) {
    console.error('Get user rank error:', error);
    return null;
  }
}

/**
 * Check and award badges
 */
export async function updateBadges(userId: string) {
  try {
    // Get user stats
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        total_streams,
        total_battles,
        current_win_streak,
        level,
        gifts_sent,
        follower_count
      `)
      .eq('id', userId)
      .single();

    if (!profile) return;

    // Get user's rank
    const rank = await getUserRank(userId);

    // Check which badges they should have
    const earnedBadges = checkBadges({
      ...profile,
      leaderboard_rank: rank || undefined,
    });

    // Update badges
    await supabase
      .from('profiles')
      .update({ badges: earnedBadges })
      .eq('id', userId);
  } catch (error) {
    console.error('Update badges error:', error);
  }
}
