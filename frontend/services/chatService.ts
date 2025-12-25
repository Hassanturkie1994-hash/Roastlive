import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  stream_id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  user?: {
    username: string;
    avatar_url?: string;
  };
}

export const chatService = {
  // Send a message
  async sendMessage(streamId: string, userId: string, content: string): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        stream_id: streamId,
        user_id: userId,
        content,
      })
      .select(`
        *,
        user:profiles!user_id(username, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Send message error:', error);
      return null;
    }
    return data;
  },

  // Get recent messages
  async getMessages(streamId: string, limit = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        user:profiles!user_id(username, avatar_url)
      `)
      .eq('stream_id', streamId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get messages error:', error);
      return [];
    }
    return (data || []).reverse();
  },

  // Pin a message (host only)
  async pinMessage(messageId: string, durationMinutes = 5): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({
        is_pinned: true,
        pinned_until: new Date(Date.now() + durationMinutes * 60000).toISOString(),
      })
      .eq('id', messageId);

    return !error;
  },

  // Delete a message (soft delete)
  async deleteMessage(messageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId);

    return !error;
  },

  // Subscribe to new messages
  subscribeToMessages(streamId: string, callback: (message: ChatMessage) => void) {
    return supabase
      .channel(`chat:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `stream_id=eq.${streamId}`,
        },
        async (payload) => {
          // Fetch user info
          const { data: user } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', (payload.new as ChatMessage).user_id)
            .single();

          callback({ ...(payload.new as ChatMessage), user });
        }
      )
      .subscribe();
  },

  // Subscribe to message deletions
  subscribeToDeletedMessages(streamId: string, callback: (messageId: string) => void) {
    return supabase
      .channel(`chat-delete:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          if ((payload.new as ChatMessage).is_deleted) {
            callback((payload.new as ChatMessage).id);
          }
        }
      )
      .subscribe();
  },
};
