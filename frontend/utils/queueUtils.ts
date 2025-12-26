import { supabase } from '../lib/supabase';

export interface MatchmakingQueue {
  id: string;
  user_id: string;
  team_size: string;
  status: string;
  joined_at: string;
  position?: number;
}

/**
 * Get user's queue position
 */
export async function getQueuePosition(
  userId: string,
  teamSize: string
): Promise<number | null> {
  try {
    // Get all waiting users for this team size, ordered by join time
    const { data, error } = await supabase
      .from('matchmaking_queue')
      .select('user_id, joined_at')
      .eq('team_size', teamSize)
      .eq('status', 'waiting')
      .order('joined_at', { ascending: true });

    if (error) throw error;

    // Find user's position
    const position = data?.findIndex(entry => entry.user_id === userId);
    return position !== undefined && position >= 0 ? position + 1 : null;
  } catch (error) {
    console.error('Get queue position error:', error);
    return null;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(teamSize: string) {
  try {
    const { count, error } = await supabase
      .from('matchmaking_queue')
      .select('*', { count: 'exact', head: true })
      .eq('team_size', teamSize)
      .eq('status', 'waiting');

    if (error) throw error;

    // Calculate estimated wait time
    // Formula: (players in queue / team size) * average match time
    const playersNeeded = parseInt(teamSize[0]) * 2; // e.g., 1v1 needs 2 players
    const groupsInQueue = Math.floor((count || 0) / playersNeeded);
    const estimatedWaitSeconds = groupsInQueue * 30; // 30 seconds per group ahead

    return {
      playersInQueue: count || 0,
      groupsAhead: groupsInQueue,
      estimatedWaitSeconds,
    };
  } catch (error) {
    console.error('Get queue stats error:', error);
    return {
      playersInQueue: 0,
      groupsAhead: 0,
      estimatedWaitSeconds: 0,
    };
  }
}

/**
 * Subscribe to queue position changes
 */
export function subscribeToQueuePosition(
  userId: string,
  teamSize: string,
  callback: (position: number | null) => void
) {
  // Subscribe to changes in the queue
  const channel = supabase
    .channel(`queue-position:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matchmaking_queue',
        filter: `team_size=eq.${teamSize}`,
      },
      async () => {
        const position = await getQueuePosition(userId, teamSize);
        callback(position);
      }
    )
    .subscribe();

  // Initial position
  getQueuePosition(userId, teamSize).then(callback);

  return () => {
    supabase.removeChannel(channel);
  };
}
