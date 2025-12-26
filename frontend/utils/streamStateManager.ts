import { supabase } from '../lib/supabase';
import { AppState, AppStateStatus } from 'react-native';

interface StreamPauseState {
  streamId: string;
  pausedAt: number;
  timeoutId?: NodeJS.Timeout;
}

let pauseState: StreamPauseState | null = null;
const PAUSE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Initialize stream pause/resume monitoring
 * Call this when a stream starts
 */
export function initializeStreamMonitoring(
  streamId: string,
  onAutoEnd: () => void
): () => void {
  let appStateSubscription: any;

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    console.log('AppState changed to:', nextAppState);

    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background - pause stream
      await pauseStream(streamId, onAutoEnd);
    } else if (nextAppState === 'active') {
      // App came to foreground - resume stream
      await resumeStream(streamId);
    }
  };

  // Subscribe to app state changes
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

  // Cleanup function
  return () => {
    if (appStateSubscription) {
      appStateSubscription.remove();
    }
    if (pauseState?.timeoutId) {
      clearTimeout(pauseState.timeoutId);
    }
    pauseState = null;
  };
}

/**
 * Pause a stream (called when app goes to background)
 */
async function pauseStream(streamId: string, onAutoEnd: () => void) {
  if (pauseState) return; // Already paused

  console.log('⏸️ Pausing stream:', streamId);

  try {
    // Update stream status to paused
    await supabase
      .from('streams')
      .update({ 
        is_paused: true,
        paused_at: new Date().toISOString()
      })
      .eq('id', streamId);

    // Set 10-minute timeout
    const timeoutId = setTimeout(async () => {
      console.log('⏰ 10-minute pause timeout reached - ending stream');
      await endStreamDueToPause(streamId);
      onAutoEnd();
    }, PAUSE_TIMEOUT_MS);

    pauseState = {
      streamId,
      pausedAt: Date.now(),
      timeoutId,
    };
  } catch (error) {
    console.error('Pause stream error:', error);
  }
}

/**
 * Resume a stream (called when app returns to foreground)
 */
async function resumeStream(streamId: string) {
  if (!pauseState || pauseState.streamId !== streamId) return;

  console.log('▶️ Resuming stream:', streamId);

  try {
    // Clear timeout
    if (pauseState.timeoutId) {
      clearTimeout(pauseState.timeoutId);
    }

    // Check if we're within 10-minute window
    const pauseDuration = Date.now() - pauseState.pausedAt;
    if (pauseDuration >= PAUSE_TIMEOUT_MS) {
      // Too late, stream should have ended
      console.log('❌ Cannot resume - pause timeout exceeded');
      return;
    }

    // Update stream status to active
    await supabase
      .from('streams')
      .update({ 
        is_paused: false,
        resumed_at: new Date().toISOString()
      })
      .eq('id', streamId);

    pauseState = null;
  } catch (error) {
    console.error('Resume stream error:', error);
  }
}

/**
 * End a stream due to pause timeout
 */
async function endStreamDueToPause(streamId: string) {
  try {
    await supabase
      .from('streams')
      .update({
        is_live: false,
        is_paused: false,
        ended_at: new Date().toISOString(),
        end_reason: 'paused_timeout',
      })
      .eq('id', streamId);

    // Add system message to chat
    await supabase
      .from('stream_messages')
      .insert({
        stream_id: streamId,
        user_id: null,
        username: 'System',
        message: 'Stream ended due to inactivity (10 minutes)',
        type: 'system',
      });

    pauseState = null;
  } catch (error) {
    console.error('End stream due to pause error:', error);
  }
}

/**
 * Get pause status
 */
export function getPauseStatus() {
  if (!pauseState) return null;

  const elapsed = Date.now() - pauseState.pausedAt;
  const remaining = PAUSE_TIMEOUT_MS - elapsed;

  return {
    isPaused: true,
    elapsedMs: elapsed,
    remainingMs: Math.max(0, remaining),
    remainingMinutes: Math.ceil(remaining / 60000),
  };
}
