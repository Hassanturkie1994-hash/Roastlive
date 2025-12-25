import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Vibration,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { matchmakingService, TeamSize, QueueEntry } from '../services/matchmakingService';
import { supabase } from '../lib/supabase';

type MatchmakingState = 'searching' | 'match_found' | 'waiting_accept' | 'starting' | 'cancelled';

interface MatchFoundData {
  matchId: string;
  opponent: {
    id: string;
    username: string;
    avatar_url?: string;
    wins?: number;
  };
  teamSize: TeamSize;
}

export default function MatchmakingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ teamSize: string }>();
  const teamSize = (params.teamSize || '1v1') as TeamSize;

  // State
  const [state, setState] = useState<MatchmakingState>('searching');
  const [queueId, setQueueId] = useState<string | null>(null);
  const [waitTime, setWaitTime] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState(0);
  const [playersInQueue, setPlayersInQueue] = useState(0);
  const [matchData, setMatchData] = useState<MatchFoundData | null>(null);
  const [acceptCountdown, setAcceptCountdown] = useState(15);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Join queue on mount
  useEffect(() => {
    if (user?.id) {
      joinQueue();
    }

    return () => {
      // Cleanup: leave queue if still in it
      if (user?.id && state === 'searching') {
        matchmakingService.leaveQueue(user.id);
      }
    };
  }, [user?.id]);

  // Wait time counter
  useEffect(() => {
    if (state === 'searching') {
      const interval = setInterval(() => {
        setWaitTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state]);

  // Accept countdown
  useEffect(() => {
    if (state === 'match_found' && acceptCountdown > 0) {
      const interval = setInterval(() => {
        setAcceptCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (state === 'match_found' && acceptCountdown === 0) {
      handleDeclineMatch();
    }
  }, [state, acceptCountdown]);

  // Pulse animation for searching
  useEffect(() => {
    if (state === 'searching') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [state]);

  // Rotation animation
  useEffect(() => {
    if (state === 'searching') {
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      );
      rotate.start();
      return () => rotate.stop();
    }
  }, [state]);

  // Subscribe to queue updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = matchmakingService.subscribeToQueue(
      user.id,
      (queueEntry) => {
        if (queueEntry?.status === 'matched' && queueEntry.match_id) {
          handleMatchFound(queueEntry.match_id);
        }
      }
    );

    return unsubscribe;
  }, [user?.id]);

  // Get queue stats
  useEffect(() => {
    const getQueueStats = async () => {
      const { count } = await supabase
        .from('matchmaking_queue')
        .select('*', { count: 'exact', head: true })
        .eq('team_size', teamSize)
        .eq('status', 'waiting');
      
      setPlayersInQueue(count || 0);
      const estimate = await matchmakingService.getEstimatedWaitTime(teamSize);
      setEstimatedWait(estimate);
    };

    getQueueStats();
    const interval = setInterval(getQueueStats, 5000);
    return () => clearInterval(interval);
  }, [teamSize]);

  const joinQueue = async () => {
    if (!user?.id) return;

    const result = await matchmakingService.joinQueue(user.id, teamSize);
    
    if (result.success && result.queueId) {
      setQueueId(result.queueId);
      // Demo: Simulate match after 5-10 seconds
      simulateMatchmaking();
    } else {
      Alert.alert('Error', result.error || 'Failed to join queue');
      router.back();
    }
  };

  // Demo simulation
  const simulateMatchmaking = () => {
    const delay = 5000 + Math.random() * 5000;
    
    setTimeout(() => {
      if (state === 'searching') {
        const mockMatchData: MatchFoundData = {
          matchId: 'demo-match-' + Date.now(),
          opponent: {
            id: 'opponent-123',
            username: 'RoastMaster_' + Math.floor(Math.random() * 1000),
            wins: Math.floor(Math.random() * 50),
          },
          teamSize,
        };
        
        setMatchData(mockMatchData);
        setState('match_found');
        
        if (Platform.OS !== 'web') {
          Vibration.vibrate([0, 200, 100, 200]);
        }
        
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
      }
    }, delay);
  };

  const handleMatchFound = async (matchId: string) => {
    const match = await matchmakingService.getMatch(matchId);
    const participants = await matchmakingService.getMatchParticipants(matchId);
    const opponent = participants.find((p) => p.user_id !== user?.id);
    
    if (match && opponent) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', opponent.user_id)
        .single();

      setMatchData({
        matchId,
        opponent: {
          id: opponent.user_id,
          username: profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url,
        },
        teamSize: match.team_size,
      });

      setState('match_found');
      setAcceptCountdown(15);
      
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 200, 100, 200]);
      }
    }
  };

  const handleAcceptMatch = async () => {
    if (!matchData) return;
    
    setState('waiting_accept');
    await matchmakingService.markReady(matchData.matchId, user?.id || '');
    
    setTimeout(() => {
      setState('starting');
      setTimeout(() => {
        router.replace(`/battle/match/${matchData.matchId}`);
      }, 1500);
    }, 1000);
  };

  const handleDeclineMatch = async () => {
    setState('cancelled');
    if (user?.id) {
      await matchmakingService.leaveQueue(user.id);
    }
    setTimeout(() => router.back(), 500);
  };

  const handleCancelSearch = async () => {
    if (user?.id) {
      await matchmakingService.leaveQueue(user.id);
    }
    router.back();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getDuration = () => {
    const durations: Record<TeamSize, string> = {
      '1v1': '3 min',
      '2v2': '5 min',
      '3v3': '8 min',
      '4v4': '12 min',
      '5v5': '15 min',
    };
    return durations[teamSize];
  };

  // SEARCHING STATE
  if (state === 'searching') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancelSearch} style={styles.backButton}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Finding Match</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* Animated Search */}
          <View style={styles.searchContainer}>
            <Animated.View
              style={[
                styles.searchRing,
                styles.searchRingOuter,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Animated.View
              style={[
                styles.searchRing,
                styles.searchRingMiddle,
                { transform: [{ rotate: spin }] },
              ]}
            />
            <View style={styles.searchIconContainer}>
              <Ionicons name="flame" size={48} color={theme.colors.error} />
            </View>
          </View>

          {/* Mode Info */}
          <View style={styles.modeCard}>
            <Text style={styles.modeTitle}>{teamSize} Battle</Text>
            <Text style={styles.modeDuration}>{getDuration()}</Text>
          </View>

          {/* Timer */}
          <Text style={styles.searchingText}>Searching for opponents...</Text>
          <Text style={styles.waitTime}>{formatTime(waitTime)}</Text>

          {/* Queue Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={20} color={theme.colors.primary} />
              <Text style={styles.statValue}>{playersInQueue}</Text>
              <Text style={styles.statLabel}>In Queue</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={20} color={theme.colors.primary} />
              <Text style={styles.statValue}>~{Math.max(1, Math.ceil(estimatedWait / 60))} min</Text>
              <Text style={styles.statLabel}>Est. Wait</Text>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 While you wait...</Text>
            <Text style={styles.tipText}>• Practice your best roasts</Text>
            <Text style={styles.tipText}>• Check your camera & mic</Text>
            <Text style={styles.tipText}>• Stay positive, have fun!</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSearch}>
            <Text style={styles.cancelButtonText}>Cancel Search</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // MATCH FOUND STATE
  if (state === 'match_found' || state === 'waiting_accept') {
    return (
      <View style={styles.container}>
        <View style={styles.matchFoundContent}>
          <Animated.View
            style={[
              styles.matchFoundBanner,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0],
                  }),
                }],
              },
            ]}
          >
            <Ionicons name="flash" size={32} color="#FFD700" />
            <Text style={styles.matchFoundText}>MATCH FOUND!</Text>
            <Ionicons name="flash" size={32} color="#FFD700" />
          </Animated.View>

          {/* VS Display */}
          <View style={styles.vsContainer}>
            <View style={styles.playerCard}>
              <View style={styles.playerAvatar}>
                <Text style={styles.playerAvatarText}>
                  {user?.email?.charAt(0).toUpperCase() || 'Y'}
                </Text>
              </View>
              <Text style={styles.playerName}>You</Text>
              <View style={styles.readyBadge}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            </View>

            <View style={styles.vsIcon}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.playerCard}>
              <View style={[styles.playerAvatar, styles.opponentAvatar]}>
                <Text style={styles.playerAvatarText}>
                  {matchData?.opponent.username?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={styles.playerName}>{matchData?.opponent.username}</Text>
              {matchData?.opponent.wins !== undefined && (
                <Text style={styles.playerWins}>{matchData.opponent.wins} wins</Text>
              )}
            </View>
          </View>

          <View style={styles.matchModeCard}>
            <Ionicons name="flame" size={24} color={theme.colors.error} />
            <Text style={styles.matchModeText}>{matchData?.teamSize} Roast Battle</Text>
          </View>

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>Accept within</Text>
            <View style={[
              styles.countdownCircle,
              acceptCountdown <= 5 && styles.countdownCircleUrgent
            ]}>
              <Text style={styles.countdownNumber}>{acceptCountdown}</Text>
            </View>
            <Text style={styles.countdownUnit}>seconds</Text>
          </View>

          {/* Actions */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDeclineMatch}
              disabled={state === 'waiting_accept'}
            >
              <Ionicons name="close" size={24} color={theme.colors.error} />
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, state === 'waiting_accept' && styles.acceptButtonDisabled]}
              onPress={handleAcceptMatch}
              disabled={state === 'waiting_accept'}
            >
              {state === 'waiting_accept' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={24} color="#fff" />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // STARTING STATE
  if (state === 'starting') {
    return (
      <View style={styles.container}>
        <View style={styles.startingContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.startingText}>Starting Roast Live...</Text>
          <Text style={styles.startingSubtext}>Get ready to battle!</Text>
        </View>
      </View>
    );
  }

  // CANCELLED STATE
  return (
    <View style={styles.container}>
      <View style={styles.cancelledContent}>
        <Ionicons name="close-circle" size={80} color={theme.colors.error} />
        <Text style={styles.cancelledText}>Match Cancelled</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xxl + 10,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  searchContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  searchRing: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 3,
  },
  searchRingOuter: {
    width: 180,
    height: 180,
    borderColor: `${theme.colors.primary}30`,
  },
  searchRingMiddle: {
    width: 140,
    height: 140,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  searchIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${theme.colors.error}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.lg,
  },
  modeTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  modeDuration: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  searchingText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  waitTime: {
    fontSize: 48,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  tipsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
  },
  tipsTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  tipText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  footer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
  },
  matchFoundContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  matchFoundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.error}20`,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.xxl,
  },
  matchFoundText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.error,
    marginHorizontal: theme.spacing.sm,
  },
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  playerCard: {
    alignItems: 'center',
    flex: 1,
  },
  playerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  opponentAvatar: {
    backgroundColor: theme.colors.error,
  },
  playerAvatarText: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  playerName: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  playerWins: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  readyBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  vsIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  vsText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  matchModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
  },
  matchModeText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  countdownLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  countdownCircleUrgent: {
    backgroundColor: theme.colors.error,
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  countdownUnit: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  declineButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  acceptButtonDisabled: {
    opacity: 0.7,
  },
  acceptButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
  startingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startingText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
  },
  startingSubtext: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  cancelledContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.error,
    marginTop: theme.spacing.lg,
  },
});
