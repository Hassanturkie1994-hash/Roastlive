import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export const followService = {
  // Follow a user
  async followUser(followerId: string, followingId: string): Promise<boolean> {
    const { error } = await supabase.from('follows').insert({
      follower_id: followerId,
      following_id: followingId,
    });

    if (!error) {
      // Update follower counts
      await Promise.all([
        supabase.rpc('increment_following_count', { user_id: followerId }),
        supabase.rpc('increment_followers_count', { user_id: followingId }),
      ]);

      // Send notification
      const { data: follower } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', followerId)
        .single();

      if (follower) {
        await notificationService.createNotification(
          followingId,
          'new_follower',
          'New Follower',
          `@${follower.username} started following you`,
          { follower_id: followerId }
        );
      }
    }

    return !error;
  },

  // Unfollow a user
  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (!error) {
      // Update follower counts
      await Promise.all([
        supabase.rpc('decrement_following_count', { user_id: followerId }),
        supabase.rpc('decrement_followers_count', { user_id: followingId }),
      ]);
    }

    return !error;
  },

  // Check if following
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    return !error && !!data;
  },

  // Get followers
  async getFollowers(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        follower:profiles!follower_id(id, username, avatar_url, bio)
      `)
      .eq('following_id', userId);

    if (error) return [];
    return (data || []).map((f: any) => f.follower);
  },

  // Get following
  async getFollowing(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        following:profiles!following_id(id, username, avatar_url, bio)
      `)
      .eq('follower_id', userId);

    if (error) return [];
    return (data || []).map((f: any) => f.following);
  },
};
