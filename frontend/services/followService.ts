import { supabase } from '../lib/supabase';

export const followService = {
  async followUser(followerId: string, followingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('follows').insert({
        follower_id: followerId,
        following_id: followingId,
      });

      if (error) throw error;

      // Update follower counts
      await Promise.all([
        supabase.rpc('increment_follower_count', { user_id: followingId }),
        supabase.rpc('increment_following_count', { user_id: followerId }),
      ]);

      // Create notification
      await supabase.from('notifications').insert({
        user_id: followingId,
        type: 'follow',
        title: 'New Follower',
        body: `Someone started following you!`,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async unfollowUser(followerId: string, followingId: string): Promise<{ success: boolean }> {
    try {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      // Update follower counts
      await Promise.all([
        supabase.rpc('decrement_follower_count', { user_id: followingId }),
        supabase.rpc('decrement_following_count', { user_id: followerId }),
      ]);

      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    return !!data;
  },

  async isMutual(userId1: string, userId2: string): Promise<boolean> {
    const [following, followedBy] = await Promise.all([
      this.isFollowing(userId1, userId2),
      this.isFollowing(userId2, userId1),
    ]);

    return following && followedBy;
  },
};
