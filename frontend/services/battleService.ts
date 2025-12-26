import { supabase } from '../lib/supabase';

export interface BattleVote {
  id: string;
  match_id: string;
  voter_id: string;
  team: 'team_a' | 'team_b';
  created_at: string;
}

export interface BattleResult {
  id: string;
  match_id: string;
  winner_team: 'team_a' | 'team_b' | 'tie';
  team_a_votes: number;
  team_b_votes: number;
  total_votes: number;
  created_at: string;
}

export interface VoteCount {
  team_a: number;
  team_b: number;
  total: number;
  percentage: {
    team_a: number;
    team_b: number;
  };
}

export const battleService = {
  /**
   * Cast a vote for a team in a battle
   */
  async castVote(
    matchId: string,
    voterId: string,
    team: 'team_a' | 'team_b'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user has already voted
      const { data: existingVote } = await supabase
        .from('battle_votes')
        .select('id')
        .eq('match_id', matchId)
        .eq('voter_id', voterId)
        .single();

      if (existingVote) {
        // Update existing vote
        const { error } = await supabase
          .from('battle_votes')
          .update({ team, updated_at: new Date().toISOString() })
          .eq('id', existingVote.id);

        if (error) throw error;
      } else {
        // Insert new vote
        const { error } = await supabase
          .from('battle_votes')
          .insert({
            match_id: matchId,
            voter_id: voterId,
            team,
          });

        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Cast vote error:', error);
      return { success: false, error: error.message || 'Failed to cast vote' };
    }
  },

  /**
   * Get current vote counts for a battle
   */
  async getVoteCounts(matchId: string): Promise<VoteCount> {
    try {
      const { data, error } = await supabase
        .from('battle_votes')
        .select('team')
        .eq('match_id', matchId);

      if (error) throw error;

      const teamAVotes = data?.filter((v) => v.team === 'team_a').length || 0;
      const teamBVotes = data?.filter((v) => v.team === 'team_b').length || 0;
      const total = teamAVotes + teamBVotes;

      return {
        team_a: teamAVotes,
        team_b: teamBVotes,
        total,
        percentage: {
          team_a: total > 0 ? (teamAVotes / total) * 100 : 50,
          team_b: total > 0 ? (teamBVotes / total) * 100 : 50,
        },
      };
    } catch (error) {
      console.error('Get vote counts error:', error);
      return {
        team_a: 0,
        team_b: 0,
        total: 0,
        percentage: { team_a: 50, team_b: 50 },
      };
    }
  },

  /**
   * Check if a user has voted
   */
  async getUserVote(
    matchId: string,
    userId: string
  ): Promise<'team_a' | 'team_b' | null> {
    try {
      const { data, error } = await supabase
        .from('battle_votes')
        .select('team')
        .eq('match_id', matchId)
        .eq('voter_id', userId)
        .single();

      if (error || !data) return null;
      return data.team as 'team_a' | 'team_b';
    } catch (error) {
      console.error('Get user vote error:', error);
      return null;
    }
  },

  /**
   * End a battle and calculate results
   */
  async endBattle(matchId: string): Promise<{ success: boolean; result?: BattleResult }> {
    try {
      // Get vote counts
      const voteCounts = await this.getVoteCounts(matchId);

      // Determine winner
      let winnerTeam: 'team_a' | 'team_b' | 'tie';
      if (voteCounts.team_a > voteCounts.team_b) {
        winnerTeam = 'team_a';
      } else if (voteCounts.team_b > voteCounts.team_a) {
        winnerTeam = 'team_b';
      } else {
        winnerTeam = 'tie';
      }

      // Save results
      const { data, error } = await supabase
        .from('battle_results')
        .insert({
          match_id: matchId,
          winner_team: winnerTeam,
          team_a_votes: voteCounts.team_a,
          team_b_votes: voteCounts.team_b,
          total_votes: voteCounts.total,
        })
        .select()
        .single();

      if (error) throw error;

      // Update match status to completed
      await supabase
        .from('battle_matches')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      // Update participant stats
      await this.updateParticipantStats(matchId, winnerTeam);

      return { success: true, result: data as BattleResult };
    } catch (error: any) {
      console.error('End battle error:', error);
      return { success: false };
    }
  },

  /**
   * Get battle results
   */
  async getBattleResults(matchId: string): Promise<BattleResult | null> {
    try {
      const { data, error } = await supabase
        .from('battle_results')
        .select('*')
        .eq('match_id', matchId)
        .single();

      if (error || !data) return null;
      return data as BattleResult;
    } catch (error) {
      console.error('Get battle results error:', error);
      return null;
    }
  },

  /**
   * Update participant statistics after battle
   */
  async updateParticipantStats(
    matchId: string,
    winnerTeam: 'team_a' | 'team_b' | 'tie'
  ): Promise<void> {
    try {
      // Get participants
      const { data: participants } = await supabase
        .from('battle_participants')
        .select('user_id, team')
        .eq('match_id', matchId);

      if (!participants) return;

      // Update stats for each participant
      for (const participant of participants) {
        const isWinner =
          winnerTeam === participant.team ||
          (winnerTeam === 'tie' && (participant.team === 'team_a' || participant.team === 'team_b'));

        // Get current stats
        const { data: profile } = await supabase
          .from('profiles')
          .select('battles_won, battles_lost, battles_tied, total_battles')
          .eq('id', participant.user_id)
          .single();

        if (profile) {
          const updates: any = {
            total_battles: (profile.total_battles || 0) + 1,
          };

          if (winnerTeam === 'tie') {
            updates.battles_tied = (profile.battles_tied || 0) + 1;
          } else if (isWinner) {
            updates.battles_won = (profile.battles_won || 0) + 1;
          } else {
            updates.battles_lost = (profile.battles_lost || 0) + 1;
          }

          await supabase
            .from('profiles')
            .update(updates)
            .eq('id', participant.user_id);
        }
      }
    } catch (error) {
      console.error('Update participant stats error:', error);
    }
  },

  /**
   * Subscribe to vote changes in real-time
   */
  subscribeToVotes(
    matchId: string,
    callback: (voteCounts: VoteCount) => void
  ) {
    const channel = supabase
      .channel(`battle-votes:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_votes',
          filter: `match_id=eq.${matchId}`,
        },
        async () => {
          // Reload vote counts when any vote changes
          const counts = await this.getVoteCounts(matchId);
          callback(counts);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Subscribe to battle result
   */
  subscribeToResult(
    matchId: string,
    callback: (result: BattleResult) => void
  ) {
    const channel = supabase
      .channel(`battle-result:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_results',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          callback(payload.new as BattleResult);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Get battle history for a user
   */
  async getUserBattleHistory(
    userId: string,
    limit = 20
  ): Promise<BattleResult[]> {
    try {
      const { data, error } = await supabase
        .from('battle_results')
        .select(`
          *,
          match:battle_matches(
            *,
            participants:battle_participants(
              user_id,
              team
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Filter results where user was a participant
      const userBattles = (data || []).filter((result: any) =>
        result.match?.participants?.some((p: any) => p.user_id === userId)
      );

      return userBattles as BattleResult[];
    } catch (error) {
      console.error('Get battle history error:', error);
      return [];
    }
  },

  /**
   * Get battle statistics for a user
   */
  async getUserBattleStats(userId: string): Promise<{
    total_battles: number;
    battles_won: number;
    battles_lost: number;
    battles_tied: number;
    win_rate: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('battles_won, battles_lost, battles_tied, total_battles')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return {
          total_battles: 0,
          battles_won: 0,
          battles_lost: 0,
          battles_tied: 0,
          win_rate: 0,
        };
      }

      const totalBattles = data.total_battles || 0;
      const battlesWon = data.battles_won || 0;
      const winRate = totalBattles > 0 ? (battlesWon / totalBattles) * 100 : 0;

      return {
        total_battles: totalBattles,
        battles_won: battlesWon,
        battles_lost: data.battles_lost || 0,
        battles_tied: data.battles_tied || 0,
        win_rate: parseFloat(winRate.toFixed(1)),
      };
    } catch (error) {
      console.error('Get battle stats error:', error);
      return {
        total_battles: 0,
        battles_won: 0,
        battles_lost: 0,
        battles_tied: 0,
        win_rate: 0,
      };
    }
  },
};
