import { supabase } from '../lib/supabase';

export interface UserSettings {
  user_id: string;
  // Privacy
  is_private_account: boolean;
  show_followers_list: boolean;
  show_following_list: boolean;
  show_liked_content: boolean;
  appear_in_search: boolean;
  show_activity_status: boolean;
  dm_permissions: 'everyone' | 'followers' | 'none';
  comment_permissions: 'everyone' | 'followers' | 'none';
  mention_permissions: 'everyone' | 'followers' | 'none';
  allow_duets: boolean;
  allow_stitches: boolean;
  allow_downloads: boolean;
  allow_audio_reuse: boolean;
  show_in_suggestions: boolean;
  // Account
  language: string;
  region: string;
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  two_factor_enabled: boolean;
  // Notifications
  notifications_enabled: boolean;
  push_likes: boolean;
  push_comments: boolean;
  push_followers: boolean;
  push_mentions: boolean;
  push_dms: boolean;
  push_live_alerts: boolean;
  push_gifts: boolean;
  email_notifications: boolean;
  email_newsletter: boolean;
  notification_sound: boolean;
  notification_vibration: boolean;
  do_not_disturb: boolean;
  // Live Streaming
  default_stream_visibility: 'public' | 'followers' | 'private';
  enable_live_chat: boolean;
  live_chat_mode: 'everyone' | 'followers';
  enable_slow_mode: boolean;
  slow_mode_seconds: number;
  allow_guest_requests: boolean;
  max_guests: number;
  enable_gifts_in_live: boolean;
  save_live_replays: boolean;
  stream_quality: 'auto' | 'high' | 'medium' | 'low';
  // Content
  default_post_audience: 'public' | 'followers' | 'private';
  allow_shares: boolean;
  // Monetization
  monetization_enabled: boolean;
  accept_gifts: boolean;
  accept_tips: boolean;
  // Accessibility
  caption_always_on: boolean;
  text_size: 'small' | 'medium' | 'large' | 'xlarge';
  high_contrast: boolean;
  color_blind_mode: boolean;
  reduce_motion: boolean;
  haptic_feedback: boolean;
  // Safety
  screen_time_limit_minutes: number;
  screen_time_enabled: boolean;
  restricted_mode: boolean;
}

export const settingsService = {
  // Get user settings
  async getSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      return null;
    }

    return data;
  },

  // Update settings
  async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<boolean> {
    const { error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating settings:', error);
      return false;
    }

    return true;
  },

  // Initialize settings for new user
  async initializeSettings(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_settings')
      .insert({ user_id: userId });

    if (error && !error.message.includes('duplicate')) {
      console.error('Error initializing settings:', error);
      return false;
    }

    return true;
  },

  // Block user
  async blockUser(userId: string, blockedUserId: string, reason?: string): Promise<boolean> {
    const { error } = await supabase
      .from('blocked_users')
      .insert({ user_id: userId, blocked_user_id: blockedUserId, reason });

    if (error) {
      console.error('Error blocking user:', error);
      return false;
    }

    return true;
  },

  // Unblock user
  async unblockUser(userId: string, blockedUserId: string): Promise<boolean> {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('user_id', userId)
      .eq('blocked_user_id', blockedUserId);

    if (error) {
      console.error('Error unblocking user:', error);
      return false;
    }

    return true;
  },

  // Get blocked users
  async getBlockedUsers(userId: string) {
    const { data, error } = await supabase
      .from('blocked_users')
      .select(`
        id,
        blocked_user_id,
        reason,
        created_at,
        blocked_user:blocked_user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }

    return data || [];
  },

  // Mute user
  async muteUser(userId: string, mutedUserId: string): Promise<boolean> {
    const { error } = await supabase
      .from('muted_users')
      .insert({ user_id: userId, muted_user_id: mutedUserId });

    if (error) {
      console.error('Error muting user:', error);
      return false;
    }

    return true;
  },

  // Unmute user
  async unmuteUser(userId: string, mutedUserId: string): Promise<boolean> {
    const { error } = await supabase
      .from('muted_users')
      .delete()
      .eq('user_id', userId)
      .eq('muted_user_id', mutedUserId);

    if (error) {
      console.error('Error unmuting user:', error);
      return false;
    }

    return true;
  },

  // Add comment filter
  async addCommentFilter(userId: string, keyword: string, filterType: 'block' | 'hold_for_review' = 'block'): Promise<boolean> {
    const { error } = await supabase
      .from('comment_filters')
      .insert({ user_id: userId, keyword: keyword.toLowerCase(), filter_type: filterType });

    if (error) {
      console.error('Error adding filter:', error);
      return false;
    }

    return true;
  },

  // Remove comment filter
  async removeCommentFilter(filterId: string): Promise<boolean> {
    const { error } = await supabase
      .from('comment_filters')
      .delete()
      .eq('id', filterId);

    if (error) {
      console.error('Error removing filter:', error);
      return false;
    }

    return true;
  },

  // Get comment filters
  async getCommentFilters(userId: string) {
    const { data, error } = await supabase
      .from('comment_filters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching filters:', error);
      return [];
    }

    return data || [];
  },

  // Request data export
  async requestDataExport(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('data_export_requests')
      .insert({ 
        user_id: userId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single();

    if (error) {
      console.error('Error requesting export:', error);
      return null;
    }

    return data.id;
  },

  // Log screen time session
  async logScreenTimeSession(userId: string, durationMinutes: number): Promise<boolean> {
    const { error } = await supabase
      .from('screen_time_sessions')
      .insert({
        user_id: userId,
        session_end: new Date().toISOString(),
        duration_minutes: durationMinutes,
        date: new Date().toISOString().split('T')[0]
      });

    if (error) {
      console.error('Error logging screen time:', error);
      return false;
    }

    return true;
  },

  // Get daily screen time
  async getDailyScreenTime(userId: string, date: string): Promise<number> {
    const { data, error } = await supabase
      .from('screen_time_sessions')
      .select('duration_minutes')
      .eq('user_id', userId)
      .eq('date', date);

    if (error) {
      console.error('Error fetching screen time:', error);
      return 0;
    }

    return data?.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) || 0;
  },
};
