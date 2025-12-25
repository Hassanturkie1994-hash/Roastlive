import { supabase } from '../lib/supabase';

export interface VIPClub {
  id: string;
  creator_id: string;
  badge_text: string;
  badge_color: string;
  monthly_price: number;
  member_count: number;
  monthly_revenue: number;
  total_revenue: number;
  created_at: string;
}

export interface VIPSubscription {
  id: string;
  subscriber_id: string;
  creator_id: string;
  status: 'active' | 'canceled' | 'expired';
  started_at: string;
  expires_at?: string;
}

export const vipService = {
  // Create VIP club
  async createClub(creatorId: string, badgeText: string = 'VIP'): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('vip_clubs')
        .insert({
          creator_id: creatorId,
          badge_text: badgeText,
        });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Create club error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get club by creator
  async getClubByCreator(creatorId: string): Promise<VIPClub | null> {
    const { data, error } = await supabase
      .from('vip_clubs')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    if (error) {
      console.error('Get club error:', error);
      return null;
    }
    return data;
  },

  // Join VIP club
  async joinClub(subscriberId: string, creatorId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('vip_subscriptions')
        .insert({
          subscriber_id: subscriberId,
          creator_id: creatorId,
          status: 'active',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        });

      if (error) throw error;

      // Increment member count
      await supabase.rpc('increment_vip_members', { creator_id: creatorId });

      return { success: true };
    } catch (error: any) {
      console.error('Join club error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user's subscriptions
  async getUserSubscriptions(userId: string): Promise<VIPSubscription[]> {
    const { data, error } = await supabase
      .from('vip_subscriptions')
      .select('*')
      .eq('subscriber_id', userId)
      .eq('status', 'active');

    if (error) {
      console.error('Get subscriptions error:', error);
      return [];
    }
    return data || [];
  },

  // Update badge
  async updateBadge(creatorId: string, badgeText: string, badgeColor?: string): Promise<boolean> {
    try {
      const updateData: any = { badge_text: badgeText };
      if (badgeColor) updateData.badge_color = badgeColor;

      const { error } = await supabase
        .from('vip_clubs')
        .update(updateData)
        .eq('creator_id', creatorId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update badge error:', error);
      return false;
    }
  },
};