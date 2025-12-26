// XP and Ranking System

export interface UserXP {
  user_id: string;
  total_xp: number;
  level: number;
  current_level_xp: number;
  next_level_xp: number;
  rank_title: string;
  badges: string[];
}

// XP required for each level (exponential growth)
const XP_PER_LEVEL: number[] = [];
for (let level = 1; level <= 50; level++) {
  // Formula: level * 100 + (level - 1) * 50
  // Level 1: 100, Level 2: 250, Level 3: 450, etc.
  const xp = level * 100 + (level - 1) * 50;
  XP_PER_LEVEL.push(xp);
}

// Cumulative XP required to reach each level
const CUMULATIVE_XP: number[] = [0];
for (let i = 0; i < XP_PER_LEVEL.length; i++) {
  CUMULATIVE_XP.push(CUMULATIVE_XP[i] + XP_PER_LEVEL[i]);
}

// XP Rewards
export const XP_REWARDS = {
  BATTLE_WIN: 100,
  BATTLE_LOSS: 50,
  BATTLE_TIE: 75,
  STREAM_COMPLETE: 30,
  STREAM_30_MIN: 50,
  STREAM_60_MIN: 100,
  GIFT_RECEIVED: 5,
  FOLLOWER_GAINED: 10,
  FIRST_STREAM: 50,
  FIRST_BATTLE: 50,
};

// Rank Titles
const RANK_TITLES: Record<number, string> = {
  1: 'Novice Roaster',
  5: 'Amateur Comedian',
  10: 'Rising Star',
  15: 'Witty Performer',
  20: 'Sharp Tongue',
  25: 'Comedy Veteran',
  30: 'Roast Master',
  35: 'Elite Roaster',
  40: 'Legendary Comic',
  45: 'Supreme Roaster',
  50: 'Grand Roast Champion',
};

// Badges
export const BADGES = {
  FIRST_STREAM: { id: 'first_stream', name: 'First Stream', emoji: '🎥', requirement: 'Complete your first stream' },
  FIRST_BATTLE: { id: 'first_battle', name: 'First Battle', emoji: '⚔️', requirement: 'Complete your first battle' },
  WIN_STREAK_5: { id: 'win_streak_5', name: '5 Win Streak', emoji: '🔥', requirement: 'Win 5 battles in a row' },
  WIN_STREAK_10: { id: 'win_streak_10', name: '10 Win Streak', emoji: '🔥🔥', requirement: 'Win 10 battles in a row' },
  LEVEL_10: { id: 'level_10', name: 'Level 10', emoji: '⭐', requirement: 'Reach level 10' },
  LEVEL_25: { id: 'level_25', name: 'Level 25', emoji: '⭐⭐', requirement: 'Reach level 25' },
  LEVEL_50: { id: 'level_50', name: 'Max Level', emoji: '👑', requirement: 'Reach level 50' },
  TOP_20: { id: 'top_20', name: 'Top 20', emoji: '🏆', requirement: 'Reach top 20 on leaderboard' },
  GENEROUS: { id: 'generous', name: 'Generous', emoji: '💝', requirement: 'Send 100 gifts' },
  POPULAR: { id: 'popular', name: 'Popular', emoji: '🌟', requirement: 'Gain 1000 followers' },
};

/**
 * Calculate level and progress from total XP
 */
export function calculateLevel(totalXP: number): {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
} {
  // Find the level
  let level = 1;
  for (let i = 1; i < CUMULATIVE_XP.length; i++) {
    if (totalXP >= CUMULATIVE_XP[i]) {
      level = i;
    } else {
      break;
    }
  }

  // Cap at level 50
  if (level > 50) level = 50;

  const currentLevelStart = CUMULATIVE_XP[level - 1];
  const nextLevelStart = level < 50 ? CUMULATIVE_XP[level] : CUMULATIVE_XP[50];
  const currentLevelXP = totalXP - currentLevelStart;
  const nextLevelXP = nextLevelStart - currentLevelStart;
  const progress = level < 50 ? (currentLevelXP / nextLevelXP) * 100 : 100;

  return {
    level,
    currentLevelXP,
    nextLevelXP,
    progress,
  };
}

/**
 * Get rank title for a level
 */
export function getRankTitle(level: number): string {
  // Find the highest rank title <= current level
  const levels = Object.keys(RANK_TITLES).map(Number).sort((a, b) => b - a);
  for (const titleLevel of levels) {
    if (level >= titleLevel) {
      return RANK_TITLES[titleLevel];
    }
  }
  return RANK_TITLES[1]; // Default to first rank
}

/**
 * Check which badges a user should have based on their stats
 */
export function checkBadges(stats: {
  total_streams?: number;
  total_battles?: number;
  current_win_streak?: number;
  level: number;
  leaderboard_rank?: number;
  gifts_sent?: number;
  follower_count?: number;
}): string[] {
  const badges: string[] = [];

  if (stats.total_streams && stats.total_streams >= 1) badges.push(BADGES.FIRST_STREAM.id);
  if (stats.total_battles && stats.total_battles >= 1) badges.push(BADGES.FIRST_BATTLE.id);
  if (stats.current_win_streak && stats.current_win_streak >= 5) badges.push(BADGES.WIN_STREAK_5.id);
  if (stats.current_win_streak && stats.current_win_streak >= 10) badges.push(BADGES.WIN_STREAK_10.id);
  if (stats.level >= 10) badges.push(BADGES.LEVEL_10.id);
  if (stats.level >= 25) badges.push(BADGES.LEVEL_25.id);
  if (stats.level >= 50) badges.push(BADGES.LEVEL_50.id);
  if (stats.leaderboard_rank && stats.leaderboard_rank <= 20) badges.push(BADGES.TOP_20.id);
  if (stats.gifts_sent && stats.gifts_sent >= 100) badges.push(BADGES.GENEROUS.id);
  if (stats.follower_count && stats.follower_count >= 1000) badges.push(BADGES.POPULAR.id);

  return badges;
}

/**
 * Format XP number with commas
 */
export function formatXP(xp: number): string {
  return xp.toLocaleString();
}
