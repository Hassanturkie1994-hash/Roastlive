import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Vibration,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { matchmakingService, BattleMatch, MatchParticipant } from '../../../services/matchmakingService';
import { battleService, VoteCount } from '../../../services/battleService';
import { supabase } from '../../../lib/supabase';

const { width, height } = Dimensions.get('window');

interface PlayerProfile {
  id: string;
  username: string;
  avatar_url?: string;
}

type BattlePhase = 'waiting' | 'countdown' | 'battle' | 'voting' | 'results';

export default function BattleMatchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const matchId = params.matchId as string;

  // State
  const [match, setMatch] = useState<BattleMatch | null>(null);
  const [participants, setParticipants] = useState<MatchParticipant[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});
  const [phase, setPhase] = useState<BattlePhase>('waiting');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdownValue, setCountdownValue] = useState(3);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState<VoteCount>({ team_a: 0, team_b: 0, total: 0, percentage: { team_a: 50, team_b: 50 } });
  const [userVote, setUserVote] = useState<'team_a' | 'team_b' | null>(null);
  const [winner, setWinner] = useState<'team_a' | 'team_b' | 'tie' | null>(null);
  const [showRematchModal, setShowRematchModal] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const countdownScale = useRef(new Animated.Value(0)).current;
  const voteBarAnim = useRef(new Animated.Value(0.5)).current;
  const winnerScale = useRef(new Animated.Value(0)).current;

  // Load match data
  useEffect(() => {
    loadMatchData();
  }, [matchId]);

  // Subscribe to match updates
  useEffect(() => {
    if (!matchId) return;

    const unsubscribe = matchmakingService.subscribeToMatch(matchId, (updatedMatch) => {
      setMatch(updatedMatch);
      
      if (updatedMatch.status === 'in_progress' && phase === 'waiting') {
        startCountdown();
      }
      
      if (updatedMatch.status === 'completed') {
        determineWinner();
      }
    });

    return unsubscribe;
  }, [matchId, phase]);

  // Subscribe to votes
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`battle-votes-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_votes',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          loadVotes();
        }
      )
      .subscribe();

    loadVotes();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // Battle timer
  useEffect(() => {
    if (phase === 'battle' && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            endBattle();
            return 0;
          }
          
          // Final 10 seconds vibration
          if (prev <= 10 && Platform.OS !== 'web') {
            Vibration.vibrate(100);
          }
          
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [phase, timeRemaining]);

  // Pulse animation for live indicator
  useEffect(() => {
    if (phase === 'battle') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [phase]);

  // Vote bar animation
  useEffect(() => {
    const total = votes.team_a + votes.team_b;
    const percentage = total > 0 ? votes.team_a / total : 0.5;
    
    Animated.spring(voteBarAnim, {
      toValue: percentage,
      useNativeDriver: false,
      tension: 50,
      friction: 10,
    }).start();
  }, [votes]);

  const loadMatchData = async () => {
    setLoading(true);
    try {
      const matchData = await matchmakingService.getMatch(matchId);
      const participantsData = await matchmakingService.getMatchParticipants(matchId);
      
      setMatch(matchData);
      setParticipants(participantsData);
      setTimeRemaining(matchData?.duration_seconds || 180);

      // Load player profiles
      const userIds = participantsData.map((p) => p.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesData) {
        const profileMap: Record<string, PlayerProfile> = {};
        profilesData.forEach((p) => {
          profileMap[p.id] = p;
        });
        setProfiles(profileMap);
      }

      // Check ready status
      const currentParticipant = participantsData.find((p) => p.user_id === user?.id);
      setIsReady(currentParticipant?.is_ready || false);

      // Determine phase
      if (matchData?.status === 'in_progress') {
        setPhase('battle');
        if (matchData.started_at) {
          const elapsed = Math.floor((Date.now() - new Date(matchData.started_at).getTime()) / 1000);
          setTimeRemaining(Math.max(0, matchData.duration_seconds - elapsed));
        }
      } else if (matchData?.status === 'completed') {
        setPhase('results');
        determineWinner();
      }
    } catch (error) {
      console.error('Error loading match:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVotes = async () => {
    try {
      const { data, error } = await supabase
        .from('battle_votes')
        .select('team')
        .eq('match_id', matchId);

      if (error) throw error;

      const teamA = data?.filter((v) => v.team === 'team_a').length || 0;
      const teamB = data?.filter((v) => v.team === 'team_b').length || 0;
      setVotes({ team_a: teamA, team_b: teamB });

      // Check if current user has voted
      const { data: userVoteData } = await supabase
        .from('battle_votes')
        .select('team')
        .eq('match_id', matchId)
        .eq('voter_id', user?.id)
        .single();

      if (userVoteData) {
        setUserVote(userVoteData.team as 'team_a' | 'team_b');
      }
    } catch (error) {
      console.error('Error loading votes:', error);
    }
  };

  const startCountdown = () => {
    setPhase('countdown');
    setCountdownValue(3);

    // Countdown animation
    const countdownInterval = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setPhase('battle');
          return 0;
        }
        
        // Pulse animation for each number
        Animated.sequence([
          Animated.timing(countdownScale, { toValue: 1.5, duration: 200, useNativeDriver: true }),
          Animated.timing(countdownScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        
        if (Platform.OS !== 'web') {
          Vibration.vibrate(200);
        }
        
        return prev - 1;
      });
    }, 1000);
  };

  const handleMarkReady = async () => {
    if (!user?.id) return;

    const result = await matchmakingService.markReady(matchId, user.id);
    if (result.success) {
      setIsReady(true);

      // Check if all ready
      const allReady = participants.every((p) => p.user_id === user.id || p.is_ready);
      if (allReady) {
        await matchmakingService.startMatch(matchId);
        startCountdown();
      }
    }
  };

  const handleVote = async (team: 'team_a' | 'team_b') => {
    if (!user?.id || userVote || phase !== 'battle') return;

    try {
      const { error } = await supabase.from('battle_votes').insert({
        match_id: matchId,
        voter_id: user.id,
        team,
      });

      if (error) throw error;

      setUserVote(team);
      
      if (Platform.OS !== 'web') {
        Vibration.vibrate(50);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const endBattle = async () => {
    setPhase('voting');
    await matchmakingService.endMatch(matchId);
    
    // Give 5 seconds for final votes, then show results
    setTimeout(() => {
      determineWinner();
    }, 5000);
  };

  const determineWinner = () => {
    setPhase('results');
    
    let winnerTeam: 'team_a' | 'team_b' | 'tie';
    if (votes.team_a > votes.team_b) {
      winnerTeam = 'team_a';
    } else if (votes.team_b > votes.team_a) {
      winnerTeam = 'team_b';
    } else {
      winnerTeam = 'tie';
    }
    
    setWinner(winnerTeam);
    
    // Winner animation
    Animated.spring(winnerScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 5,
    }).start();

    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 200, 100, 200, 100, 400]);
    }
  };

  const handleRematch = async () => {
    if (!user?.id) return;
    const result = await matchmakingService.requestRematch(matchId, user.id);
    if (result.success) {
      Alert.alert('Rematch Requested', 'Waiting for opponent to accept...');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTeamParticipants = (team: 'team_a' | 'team_b') => 
    participants.filter((p) => p.team === team);

  const getVotePercentage = (team: 'team_a' | 'team_b') => {
    const total = votes.team_a + votes.team_b;
    if (total === 0) return 50;
    return Math.round((votes[team] / total) * 100);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading Battle...</Text>
      </View>
    );
  }

  // COUNTDOWN PHASE
  if (phase === 'countdown') {
    return (
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownLabel}>Battle Starting In</Text>
        <Animated.Text 
          style={[
            styles.countdownNumber,
            { transform: [{ scale: countdownScale }] }
          ]}
        >
          {countdownValue}
        </Animated.Text>
        <Text style={styles.countdownHint}>Get ready to roast!</Text>
      </View>
    );
  }

  // RESULTS PHASE
  if (phase === 'results') {
    const teamAParticipants = getTeamParticipants('team_a');
    const teamBParticipants = getTeamParticipants('team_b');
    const winnerProfile = winner && winner !== 'tie' 
      ? profiles[getTeamParticipants(winner)[0]?.user_id]
      : null;

    return (
      <View style={styles.resultsContainer}>
        <Animated.View 
          style={[
            styles.winnerAnnouncement,
            { transform: [{ scale: winnerScale }] }
          ]}
        >
          {winner === 'tie' ? (
            <>
              <Ionicons name="ribbon" size={80} color={theme.colors.gold} />
              <Text style={styles.winnerTitle}>IT'S A TIE!</Text>
              <Text style={styles.winnerSubtitle}>Both sides fought hard!</Text>
            </>
          ) : (
            <>
              <View style={[
                styles.winnerAvatar,
                { backgroundColor: winner === 'team_a' ? theme.colors.primary : theme.colors.error }
              ]}>
                {winnerProfile?.avatar_url ? (
                  <Image source={{ uri: winnerProfile.avatar_url }} style={styles.winnerAvatarImage} />
                ) : (
                  <Text style={styles.winnerAvatarText}>
                    {winnerProfile?.username?.charAt(0).toUpperCase() || '?'}
                  </Text>
                )}
              </View>
              <Ionicons name="trophy" size={60} color={theme.colors.gold} />
              <Text style={styles.winnerTitle}>
                {winner === 'team_a' ? 'TEAM A' : 'TEAM B'} WINS!
              </Text>
              <Text style={styles.winnerName}>
                {winnerProfile?.username || 'Unknown'}
              </Text>
            </>
          )}
        </Animated.View>

        {/* Final Vote Count */}
        <View style={styles.finalVotes}>
          <View style={styles.finalVoteTeam}>
            <Text style={styles.finalVoteLabel}>Team A</Text>
            <Text style={[styles.finalVoteCount, { color: theme.colors.primary }]}>
              {votes.team_a} votes ({getVotePercentage('team_a')}%)
            </Text>
          </View>
          <Text style={styles.finalVoteVs}>vs</Text>
          <View style={styles.finalVoteTeam}>
            <Text style={styles.finalVoteLabel}>Team B</Text>
            <Text style={[styles.finalVoteCount, { color: theme.colors.error }]}>
              {votes.team_b} votes ({getVotePercentage('team_b')}%)
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.resultsActions}>
          <TouchableOpacity style={styles.rematchButton} onPress={handleRematch}>
            <Ionicons name="refresh" size={24} color="#fff" />
            <Text style={styles.rematchButtonText}>Rematch</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.leaveButton} 
            onPress={() => router.replace('/(tabs)/live')}
          >
            <Text style={styles.leaveButtonText}>Back to Lobby</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // WAITING / BATTLE PHASE
  const teamAParticipants = getTeamParticipants('team_a');
  const teamBParticipants = getTeamParticipants('team_b');
  const allReady = participants.every((p) => p.is_ready);
  const isFinalSeconds = timeRemaining <= 10 && timeRemaining > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.exitButton}
          onPress={() => {
            Alert.alert('Leave Battle?', 'This will count as a forfeit.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: () => router.back() },
            ]);
          }}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        {/* Timer / Status */}
        <View style={[
          styles.timerBadge,
          phase === 'battle' && styles.timerBadgeLive,
          isFinalSeconds && styles.timerBadgeUrgent,
        ]}>
          {phase === 'battle' && (
            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
          )}
          <Text style={[
            styles.timerText,
            isFinalSeconds && styles.timerTextUrgent,
          ]}>
            {phase === 'waiting' ? 'WAITING' : formatTime(timeRemaining)}
          </Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {/* Split Screen View */}
      <View style={styles.battleArea}>
        {/* Team A Side */}
        <View style={[styles.teamSide, styles.teamASide]}>
          <View style={styles.teamVideoArea}>
            {/* Demo placeholder for video */}
            <View style={styles.videoPlaceholder}>
              <View style={[styles.playerAvatarLarge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.playerAvatarLargeText}>
                  {profiles[teamAParticipants[0]?.user_id]?.username?.charAt(0).toUpperCase() || 'A'}
                </Text>
              </View>
              {phase === 'battle' && (
                <View style={styles.speakingIndicator}>
                  <Ionicons name="mic" size={16} color="#fff" />
                </View>
              )}
            </View>
          </View>
          <View style={styles.teamInfo}>
            <Text style={styles.teamLabel}>TEAM A</Text>
            <Text style={styles.playerName}>
              {profiles[teamAParticipants[0]?.user_id]?.username || 'Player 1'}
            </Text>
            {teamAParticipants[0]?.user_id === user?.id && (
              <View style={styles.youIndicator}>
                <Text style={styles.youIndicatorText}>YOU</Text>
              </View>
            )}
          </View>
        </View>

        {/* VS Divider */}
        <View style={styles.vsDivider}>
          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>
        </View>

        {/* Team B Side */}
        <View style={[styles.teamSide, styles.teamBSide]}>
          <View style={styles.teamVideoArea}>
            <View style={styles.videoPlaceholder}>
              <View style={[styles.playerAvatarLarge, { backgroundColor: theme.colors.error }]}>
                <Text style={styles.playerAvatarLargeText}>
                  {profiles[teamBParticipants[0]?.user_id]?.username?.charAt(0).toUpperCase() || 'B'}
                </Text>
              </View>
              {phase === 'battle' && (
                <View style={styles.speakingIndicator}>
                  <Ionicons name="mic" size={16} color="#fff" />
                </View>
              )}
            </View>
          </View>
          <View style={styles.teamInfo}>
            <Text style={styles.teamLabel}>TEAM B</Text>
            <Text style={styles.playerName}>
              {profiles[teamBParticipants[0]?.user_id]?.username || 'Player 2'}
            </Text>
            {teamBParticipants[0]?.user_id === user?.id && (
              <View style={styles.youIndicator}>
                <Text style={styles.youIndicatorText}>YOU</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Vote Bar (during battle) */}
      {phase === 'battle' && (
        <View style={styles.voteSection}>
          <Text style={styles.voteTitle}>AUDIENCE VOTES</Text>
          
          <View style={styles.voteBarContainer}>
            <Animated.View 
              style={[
                styles.voteBarFill,
                styles.voteBarTeamA,
                { 
                  width: voteBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.voteBarFill,
                styles.voteBarTeamB,
                { 
                  width: voteBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['100%', '0%'],
                  })
                }
              ]} 
            />
          </View>

          <View style={styles.voteStats}>
            <Text style={[styles.votePercent, { color: theme.colors.primary }]}>
              {getVotePercentage('team_a')}%
            </Text>
            <Text style={styles.totalVotes}>{votes.team_a + votes.team_b} votes</Text>
            <Text style={[styles.votePercent, { color: theme.colors.error }]}>
              {getVotePercentage('team_b')}%
            </Text>
          </View>

          {/* Vote Buttons (for non-participants) */}
          {!participants.some((p) => p.user_id === user?.id) && (
            <View style={styles.voteButtons}>
              <TouchableOpacity
                style={[
                  styles.voteButton,
                  styles.voteButtonA,
                  userVote === 'team_a' && styles.voteButtonSelected,
                ]}
                onPress={() => handleVote('team_a')}
                disabled={!!userVote}
              >
                <Ionicons name="flame" size={20} color="#fff" />
                <Text style={styles.voteButtonText}>Vote Team A</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.voteButton,
                  styles.voteButtonB,
                  userVote === 'team_b' && styles.voteButtonSelected,
                ]}
                onPress={() => handleVote('team_b')}
                disabled={!!userVote}
              >
                <Ionicons name="flame" size={20} color="#fff" />
                <Text style={styles.voteButtonText}>Vote Team B</Text>
              </TouchableOpacity>
            </View>
          )}

          {userVote && (
            <Text style={styles.votedText}>
              You voted for {userVote === 'team_a' ? 'Team A' : 'Team B'} ✓
            </Text>
          )}
        </View>
      )}

      {/* Ready Button (waiting phase) */}
      {phase === 'waiting' && (
        <View style={styles.waitingSection}>
          {!isReady ? (
            <TouchableOpacity style={styles.readyButton} onPress={handleMarkReady}>
              <Ionicons name="checkmark-circle" size={28} color="#fff" />
              <Text style={styles.readyButtonText}>I'M READY!</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitingStatus}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.waitingText}>
                Waiting for opponent... ({participants.filter((p) => p.is_ready).length}/{participants.length})
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Final Seconds Warning */}
      {isFinalSeconds && (
        <View style={styles.finalSecondsOverlay}>
          <Text style={styles.finalSecondsText}>{timeRemaining}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xxl + 10,
    paddingBottom: theme.spacing.sm,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  timerBadgeLive: {
    backgroundColor: 'rgba(255,0,0,0.8)',
  },
  timerBadgeUrgent: {
    backgroundColor: theme.colors.error,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: theme.spacing.sm,
  },
  timerText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  timerTextUrgent: {
    color: '#fff',
  },
  // Battle Area
  battleArea: {
    flex: 1,
    flexDirection: 'row',
  },
  teamSide: {
    flex: 1,
  },
  teamASide: {
    borderRightWidth: 2,
    borderRightColor: theme.colors.primary,
  },
  teamBSide: {
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.error,
  },
  teamVideoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarLargeText: {
    fontSize: 48,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  speakingIndicator: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  teamInfo: {
    padding: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  playerName: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: '#fff',
  },
  youIndicator: {
    backgroundColor: theme.colors.gold,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginTop: 4,
  },
  youIndicatorText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#000',
  },
  // VS Divider
  vsDivider: {
    position: 'absolute',
    left: '50%',
    top: '40%',
    transform: [{ translateX: -25 }],
    zIndex: 10,
  },
  vsCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  vsText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#000',
  },
  // Vote Section
  voteSection: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  voteTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  voteBarContainer: {
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceLight,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  voteBarFill: {
    height: '100%',
  },
  voteBarTeamA: {
    backgroundColor: theme.colors.primary,
  },
  voteBarTeamB: {
    backgroundColor: theme.colors.error,
    position: 'absolute',
    right: 0,
  },
  voteStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  votePercent: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  totalVotes: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  voteButtons: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  voteButtonA: {
    backgroundColor: theme.colors.primary,
  },
  voteButtonB: {
    backgroundColor: theme.colors.error,
  },
  voteButtonSelected: {
    opacity: 0.6,
  },
  voteButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.xs,
  },
  votedText: {
    textAlign: 'center',
    color: theme.colors.success,
    marginTop: theme.spacing.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  // Waiting Section
  waitingSection: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  readyButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
  waitingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
  },
  waitingText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  // Countdown
  countdownContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownLabel: {
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  countdownNumber: {
    fontSize: 150,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  countdownHint: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
  },
  // Final Seconds Overlay
  finalSecondsOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  finalSecondsText: {
    fontSize: 120,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.error,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  // Results
  resultsContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  winnerAnnouncement: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  winnerAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 4,
    borderColor: theme.colors.gold,
  },
  winnerAvatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  winnerAvatarText: {
    fontSize: 40,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  winnerTitle: {
    fontSize: 36,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.gold,
    marginTop: theme.spacing.md,
  },
  winnerSubtitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  winnerName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.semibold,
    color: '#fff',
    marginTop: theme.spacing.sm,
  },
  finalVotes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  finalVoteTeam: {
    flex: 1,
    alignItems: 'center',
  },
  finalVoteLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  finalVoteCount: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  finalVoteVs: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.md,
  },
  resultsActions: {
    width: '100%',
  },
  rematchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  rematchButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
  leaveButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
});
