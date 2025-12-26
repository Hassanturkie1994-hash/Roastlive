import { supabase } from '../lib/supabase';

export type TeamSize = '1v1' | '2v2' | '3v3' | '4v4' | '5v5';
export type QueueStatus = 'waiting' | 'matched' | 'cancelled' | 'timeout';
export type MatchStatus = 'forming' | 'ready' | 'in_progress' | 'completed' | 'cancelled';

export interface QueueEntry {
  id: string;
  user_id: string;
  team_size: TeamSize;
  status: QueueStatus;
  joined_at: string;
  matched_at?: string;
  match_id?: string;
}

export interface BattleMatch {
  id: string;
  team_size: TeamSize;
  status: MatchStatus;
  duration_seconds: number;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  user_id: string;
  team: 'team_a' | 'team_b';
  is_ready: boolean;
  accepted_at?: string;
}

const MATCH_DURATIONS: Record<TeamSize, number> = {
  '1v1': 180,  // 3 minutes
  '2v2': 300,  // 5 minutes
  '3v3': 480,  // 8 minutes
  '4v4': 720,  // 12 minutes
  '5v5': 900,  // 15 minutes
};

export const matchmakingService = {
  // Join matchmaking queue
  async joinQueue(
    userId: string,
    teamSize: TeamSize
  ): Promise<{ success: boolean; queueId?: string; error?: string }> {
    try {
      // Check if user is already in queue - use maybeSingle to avoid error if not in queue
      const { data: existing, error: checkError } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existing) {
        return { success: true, queueId: existing.id };
      }

      // Add to queue
      const { data, error } = await supabase
        .from('matchmaking_queue')
        .insert({
          user_id: userId,
          team_size: teamSize,
          status: 'waiting',
        })
        .select()
        .single();  // Keep .single() - we just inserted, must return 1 row

      if (error) throw error;

      return { success: true, queueId: data.id };
    } catch (error: any) {
      console.error('Join queue error:', error);
      return { success: false, error: error.message };
    }
  },

  // Leave matchmaking queue
  async leaveQueue(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('matchmaking_queue')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('status', 'waiting');

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Leave queue error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get queue status
  async getQueueStatus(userId: string): Promise<QueueEntry | null> {
    try {
      const { data, error } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .single();

      if (error || !data) return null;
      return data as QueueEntry;
    } catch (error) {
      console.error('Get queue status error:', error);
      return null;
    }
  },

  // Get estimated wait time (mock implementation)
  async getEstimatedWaitTime(teamSize: TeamSize): Promise<number> {
    try {
      const { count } = await supabase
        .from('matchmaking_queue')
        .select('*', { count: 'exact', head: true })
        .eq('team_size', teamSize)
        .eq('status', 'waiting');

      // Simple estimation: 30 seconds per person in queue
      return (count || 0) * 30;
    } catch (error) {
      console.error('Get wait time error:', error);
      return 0;
    }
  },

  // Create match (typically called by server-side matchmaking logic)
  async createMatch(
    teamSize: TeamSize,
    participantIds: string[]
  ): Promise<{ success: boolean; matchId?: string; error?: string }> {
    try {
      const duration = MATCH_DURATIONS[teamSize];

      // Create match
      const { data: match, error: matchError } = await supabase
        .from('battle_matches')
        .insert({
          team_size: teamSize,
          status: 'forming',
          duration_seconds: duration,
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Assign participants to teams
      const teamSize_num = parseInt(teamSize[0]);
      const participants = participantIds.map((userId, index) => ({
        match_id: match.id,
        user_id: userId,
        team: index < teamSize_num ? 'team_a' : 'team_b',
        is_ready: false,
      }));

      const { error: participantsError } = await supabase
        .from('battle_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      // Update queue entries
      const { error: queueError } = await supabase
        .from('matchmaking_queue')
        .update({
          status: 'matched',
          match_id: match.id,
          matched_at: new Date().toISOString(),
        })
        .in('user_id', participantIds);

      if (queueError) throw queueError;

      return { success: true, matchId: match.id };
    } catch (error: any) {
      console.error('Create match error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get match details
  async getMatch(matchId: string): Promise<BattleMatch | null> {
    try {
      const { data, error } = await supabase
        .from('battle_matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error || !data) return null;
      return data as BattleMatch;
    } catch (error) {
      console.error('Get match error:', error);
      return null;
    }
  },

  // Get match participants
  async getMatchParticipants(matchId: string): Promise<MatchParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('battle_participants')
        .select('*')
        .eq('match_id', matchId);

      if (error || !data) return [];
      return data as MatchParticipant[];
    } catch (error) {
      console.error('Get match participants error:', error);
      return [];
    }
  },

  // Mark player as ready
  async markReady(matchId: string, userId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('battle_participants')
        .update({
          is_ready: true,
          accepted_at: new Date().toISOString(),
        })
        .eq('match_id', matchId)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Mark ready error:', error);
      return { success: false };
    }
  },

  // Start match (when all players ready)
  async startMatch(matchId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('battle_matches')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Start match error:', error);
      return { success: false };
    }
  },

  // End match
  async endMatch(matchId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('battle_matches')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('End match error:', error);
      return { success: false };
    }
  },

  // Request rematch
  async requestRematch(
    previousMatchId: string,
    requesterId: string
  ): Promise<{ success: boolean; rematchId?: string; error?: string }> {
    try {
      const expiresAt = new Date(Date.now() + 20 * 1000); // 20 seconds

      const { data, error } = await supabase
        .from('rematch_requests')
        .insert({
          previous_match_id: previousMatchId,
          requester_id: requesterId,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, rematchId: data.id };
    } catch (error: any) {
      console.error('Request rematch error:', error);
      return { success: false, error: error.message };
    }
  },

  // Accept/decline rematch
  async respondToRematch(
    rematchRequestId: string,
    userId: string,
    accepted: boolean
  ): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('rematch_acceptances')
        .insert({
          rematch_request_id: rematchRequestId,
          user_id: userId,
          accepted,
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Respond to rematch error:', error);
      return { success: false };
    }
  },

  // Subscribe to queue updates (real-time)
  subscribeToQueue(
    userId: string,
    callback: (queue: QueueEntry | null) => void
  ) {
    const channel = supabase
      .channel(`queue:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matchmaking_queue',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as QueueEntry);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Subscribe to match updates (real-time)
  subscribeToMatch(
    matchId: string,
    callback: (match: BattleMatch) => void
  ) {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          callback(payload.new as BattleMatch);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
