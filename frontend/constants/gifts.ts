// Gift system constants

export type GiftTier = 'low' | 'mid' | 'high' | 'ultra' | 'nuclear';
export type GiftFormat = 'lottie' | 'mp4';

export interface Gift {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  tier: GiftTier;
  format: GiftFormat;
  blocksOthers?: boolean;
  cinematic?: boolean;
}

// All 48 gifts organized by tier
export const GIFTS: Gift[] = [
  // LOW TIER (12 gifts) - 1-10 coins - All Lottie
  { id: 'boo', name: 'Boo', emoji: '👻', cost: 1, tier: 'low', format: 'lottie' },
  { id: 'flying_tomato', name: 'Flying Tomato', emoji: '🍅', cost: 2, tier: 'low', format: 'lottie' },
  { id: 'laugh_track', name: 'Laugh Track', emoji: '😂', cost: 3, tier: 'low', format: 'lottie' },
  { id: 'facepalm', name: 'Facepalm', emoji: '🤦', cost: 3, tier: 'low', format: 'lottie' },
  { id: 'crickets', name: 'Crickets', emoji: '🦗', cost: 4, tier: 'low', format: 'lottie' },
  { id: 'yawn', name: 'Yawn', emoji: '🥱', cost: 5, tier: 'low', format: 'lottie' },
  { id: 'clown', name: 'Clown', emoji: '🤡', cost: 5, tier: 'low', format: 'lottie' },
  { id: 'trash', name: 'Trash', emoji: '🗑️', cost: 6, tier: 'low', format: 'lottie' },
  { id: 'skull', name: 'Skull', emoji: '💀', cost: 7, tier: 'low', format: 'lottie' },
  { id: 'poop', name: 'Poop', emoji: '💩', cost: 8, tier: 'low', format: 'lottie' },
  { id: 'eye_roll', name: 'Eye Roll', emoji: '🙄', cost: 9, tier: 'low', format: 'lottie' },
  { id: 'snore', name: 'Snore', emoji: '😴', cost: 10, tier: 'low', format: 'lottie' },

  // MID TIER (11 gifts) - 20-100 coins - All Lottie
  { id: 'mic_drop', name: 'Mic Drop', emoji: '🎙️', cost: 20, tier: 'mid', format: 'lottie' },
  { id: 'airhorn', name: 'Airhorn', emoji: '📢', cost: 25, tier: 'mid', format: 'lottie' },
  { id: 'laugh_explosion', name: 'Laugh Explosion', emoji: '💥', cost: 30, tier: 'mid', format: 'lottie' },
  { id: 'roast_bell', name: 'Roast Bell', emoji: '🔔', cost: 35, tier: 'mid', format: 'lottie' },
  { id: 'fire', name: 'Fire', emoji: '🔥', cost: 39, tier: 'mid', format: 'lottie' },
  { id: 'explosion', name: 'Explosion', emoji: '💣', cost: 50, tier: 'mid', format: 'lottie' },
  { id: 'shocked', name: 'Shocked', emoji: '😱', cost: 60, tier: 'mid', format: 'lottie' },
  { id: 'roast_slap', name: 'Roast Slap', emoji: '👋', cost: 70, tier: 'mid', format: 'lottie' },
  { id: 'laugh_cry', name: 'Laugh Cry', emoji: '😭', cost: 80, tier: 'mid', format: 'lottie' },
  { id: 'double_burn', name: 'Double Burn', emoji: '🔥🔥', cost: 90, tier: 'mid', format: 'lottie' },
  { id: 'roast_award', name: 'Roast Award', emoji: '🏅', cost: 100, tier: 'mid', format: 'lottie' },

  // HIGH TIER (11 gifts) - 150-500 coins - All Lottie
  { id: 'flame_thrower', name: 'Flame Thrower', emoji: '🔥', cost: 150, tier: 'high', format: 'lottie' },
  { id: 'diss_stamp', name: 'Diss Stamp', emoji: '📝', cost: 175, tier: 'high', format: 'lottie' },
  { id: 'judge_gavel', name: 'Judge Gavel', emoji: '🧑‍⚖️', cost: 200, tier: 'high', format: 'lottie' },
  { id: 'roast_crown', name: 'Roast Crown', emoji: '👑', cost: 250, tier: 'high', format: 'lottie' },
  { id: 'knockout_punch', name: 'Knockout Punch', emoji: '🥊', cost: 300, tier: 'high', format: 'lottie' },
  { id: 'bomb', name: 'Bomb', emoji: '💣', cost: 350, tier: 'high', format: 'lottie' },
  { id: 'lightning_strike', name: 'Lightning Strike', emoji: '⚡', cost: 400, tier: 'high', format: 'lottie' },
  { id: 'roast_trophy', name: 'Roast Trophy', emoji: '🏆', cost: 450, tier: 'high', format: 'lottie' },
  { id: 'roast_hammer', name: 'Roast Hammer', emoji: '🔨', cost: 475, tier: 'high', format: 'lottie' },
  { id: 'roast_sword', name: 'Roast Sword', emoji: '⚔️', cost: 490, tier: 'high', format: 'lottie' },
  { id: 'roast_shield', name: 'Roast Shield', emoji: '🛡️', cost: 500, tier: 'high', format: 'lottie' },

  // ULTRA TIER (8 gifts) - 700-1500 coins - All MP4
  { id: 'screen_shake', name: 'Screen Shake', emoji: '📱', cost: 700, tier: 'ultra', format: 'mp4', blocksOthers: true },
  { id: 'slow_motion', name: 'Slow Motion', emoji: '🎬', cost: 850, tier: 'ultra', format: 'mp4', blocksOthers: true },
  { id: 'spotlight', name: 'Spotlight', emoji: '🔦', cost: 1000, tier: 'ultra', format: 'mp4', blocksOthers: true },
  { id: 'silence', name: 'Silence', emoji: '🤐', cost: 1100, tier: 'ultra', format: 'mp4', blocksOthers: true },
  { id: 'time_freeze', name: 'Time Freeze', emoji: '⏱️', cost: 1200, tier: 'ultra', format: 'mp4', blocksOthers: true },
  { id: 'nuke', name: 'Nuke', emoji: '☢️', cost: 1300, tier: 'ultra', format: 'mp4', blocksOthers: true },
  { id: 'shame_bell', name: 'Shame Bell', emoji: '🔔', cost: 1400, tier: 'ultra', format: 'mp4', blocksOthers: true },
  { id: 'meteor', name: 'Meteor', emoji: '☄️', cost: 1500, tier: 'ultra', format: 'mp4', blocksOthers: true },

  // NUCLEAR TIER (6 gifts) - 2000-4500 coins - All MP4 Cinematic
  { id: 'funeral', name: 'Funeral', emoji: '⚰️', cost: 2000, tier: 'nuclear', format: 'mp4', cinematic: true },
  { id: 'riot', name: 'Riot', emoji: '🚨', cost: 2500, tier: 'nuclear', format: 'mp4', cinematic: true },
  { id: 'execution', name: 'Execution', emoji: '👀', cost: 3000, tier: 'nuclear', format: 'mp4', cinematic: true },
  { id: 'you_are_done', name: \"You're Done\", emoji: '👋', cost: 3500, tier: 'nuclear', format: 'mp4', cinematic: true },
  { id: 'apocalypse', name: 'Apocalypse', emoji: '🌋', cost: 4000, tier: 'nuclear', format: 'mp4', cinematic: true },
  { id: 'dragon', name: 'Dragon', emoji: '🐉', cost: 4500, tier: 'nuclear', format: 'mp4', cinematic: true },
];

// Get gifts by tier
export function getGiftsByTier(tier: GiftTier): Gift[] {
  return GIFTS.filter(g => g.tier === tier);
}

// Get gift by ID
export function getGiftById(id: string): Gift | undefined {
  return GIFTS.find(g => g.id === id);
}

// Tier metadata
export const TIER_INFO = {
  low: { name: 'Low Tiers', color: '#4CAF50', range: '1-10' },
  mid: { name: 'Mid Tiers', color: '#2196F3', range: '20-100' },
  high: { name: 'High Tiers', color: '#9C27B0', range: '150-500' },
  ultra: { name: 'Ultra Tiers', color: '#FF5722', range: '700-1500' },
  nuclear: { name: 'Nuclear Tiers', color: '#F44336', range: '2000-4500' },
};
