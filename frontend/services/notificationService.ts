import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  // Get notifications
  async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get notifications error:', error);
      return [];
    }
    return data || [];
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    return !error;
  },

  // Mark all as read
  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return !error;
  },

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) return 0;
    return count || 0;
  },

  // Create notification
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message?: string,
    data?: any
  ): Promise<boolean> {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      data,
    });

    return !error;
  },

  // Subscribe to new notifications
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();
  },
};
