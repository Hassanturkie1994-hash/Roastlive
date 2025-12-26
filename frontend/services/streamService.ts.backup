import { supabase } from '../lib/supabase';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface Stream {
  id: string;
  host_id: string;
  title: string;
  description?: string;
  channel_name: string;
  is_live: boolean;
  viewer_count: number;
  max_participants: number;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  host?: {
    username: string;
    avatar_url?: string;
  };
}

export interface StreamGuest {
  id: string;
  stream_id: string;
  user_id: string;
  role: 'host' | 'guest';
  is_active: boolean;
  joined_at: string;
  user?: {
    username: string;
    avatar_url?: string;
  };
}

export const streamService = {
  // Get active streams
  async getActiveStreams(): Promise<Stream[]> {
    const { data, error } = await supabase
      .from('streams')
      .select(`
        *,
        host:profiles!host_id(username, avatar_url)
      `)
      .eq('is_live', true)
      .order('viewer_count', { ascending: false });

    if (error) {
      console.error('Get streams error:', error);
      return [];
    }
    return data || [];
  },

  // Create a new stream
  async createStream(hostId: string, title: string, description?: string): Promise<Stream | null> {
    try {
      const channelName = `stream_${hostId}_${Date.now()}`;
      
      console.log('🎥 Creating stream in DEMO mode');
      console.log('Channel:', channelName);
      console.log('Title:', title);
      
      // DEMO MODE: Skip Agora token (not available in Expo Go)
      // For dev build with Agora SDK, uncomment:
      // const tokenRes = await axios.post(`${API_URL}/api/generate-token`, {
      //   channelName,
      //   uid: 0,
      //   role: 1,
      // });

      // Create stream in Supabase
      const { data, error } = await supabase
        .from('streams')
        .insert({
          host_id: hostId,
          title,
          description,
          channel_name: channelName,
          is_live: true,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('✅ Stream created:', data.id);

      // Add host as a participant
      await supabase.from('stream_participants').insert({
        stream_id: data.id,
        user_id: hostId,
        role: 'host',
        seat_number: 0,
        is_mic_on: true,
        is_camera_on: true,
      });

      return { ...data, token: 'demo-token' };
    } catch (error: any) {
      console.error('❌ Create stream error:', error);
      console.error('Error details:', error.message);
      Alert.alert('Error', 'Failed to start stream. Check console for details.');
      return null;
    }
  },

  // End a stream
  async endStream(streamId: string): Promise<boolean> {
    const { error } = await supabase
      .from('streams')
      .update({
        is_live: false,
        ended_at: new Date().toISOString(),
      })
      .eq('id', streamId);

    return !error;
  },

  // Get stream by ID
  async getStream(streamId: string): Promise<Stream | null> {
    const { data, error } = await supabase
      .from('streams')
      .select(`
        *,
        host:profiles!host_id(username, avatar_url)
      `)
      .eq('id', streamId)
      .single();

    if (error) return null;
    return data;
  },

  // Join stream as viewer
  async joinStream(streamId: string, userId: string): Promise<{ token: string } | null> {
    try {
      // Get stream info
      const stream = await this.getStream(streamId);
      if (!stream) return null;

      // Get viewer token from backend
      const tokenRes = await axios.post(`${API_URL}/api/generate-token`, {
        channelName: stream.channel_name,
        uid: 0,
        role: 2, // Subscriber
      });

      // Increment viewer count
      await supabase.rpc('increment_viewer_count', { stream_id: streamId });

      return { token: tokenRes.data.token };
    } catch (error) {
      console.error('Join stream error:', error);
      return null;
    }
  },

  // Leave stream
  async leaveStream(streamId: string): Promise<void> {
    await supabase.rpc('decrement_viewer_count', { stream_id: streamId });
  },

  // Invite guest to stream
  async inviteGuest(streamId: string, hostId: string, guestId: string): Promise<boolean> {
    const { error } = await supabase.from('stream_invitations').insert({
      stream_id: streamId,
      host_id: hostId,
      guest_id: guestId,
      status: 'pending',
      expires_at: new Date(Date.now() + 60000).toISOString(), // 1 minute expiry
    });

    return !error;
  },

  // Accept guest invitation
  async acceptInvitation(invitationId: string, guestId: string): Promise<{ token: string } | null> {
    try {
      // Update invitation status
      const { data: invitation, error } = await supabase
        .from('stream_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId)
        .eq('guest_id', guestId)
        .select('stream_id')
        .single();

      if (error || !invitation) return null;

      // Get stream
      const stream = await this.getStream(invitation.stream_id);
      if (!stream) return null;

      // Add as guest
      await supabase.from('stream_guests').insert({
        stream_id: invitation.stream_id,
        user_id: guestId,
        role: 'guest',
        is_active: true,
      });

      // Get publisher token
      const tokenRes = await axios.post(`${API_URL}/api/generate-token`, {
        channelName: stream.channel_name,
        uid: 0,
        role: 1, // Publisher as guest
      });

      return { token: tokenRes.data.token };
    } catch (error) {
      console.error('Accept invitation error:', error);
      return null;
    }
  },

  // Subscribe to stream updates
  subscribeToStream(streamId: string, callback: (stream: Stream) => void) {
    return supabase
      .channel(`stream:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streams',
          filter: `id=eq.${streamId}`,
        },
        (payload) => {
          callback(payload.new as Stream);
        }
      )
      .subscribe();
  },

  // Subscribe to guest invitations
  subscribeToInvitations(userId: string, callback: (invitation: any) => void) {
    return supabase
      .channel(`invitations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_invitations',
          filter: `guest_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  },
};
