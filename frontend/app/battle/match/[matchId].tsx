import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { matchmakingService, BattleMatch, MatchParticipant } from '../../../services/matchmakingService';

export default function BattleMatchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<BattleMatch | null>(null);
  const [participants, setParticipants] = useState<MatchParticipant[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRematchModal, setShowRematchModal] = useState(false);

  useEffect(() => {
    loadMatchData();
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;

    // Subscribe to match updates
    const unsubscribe = matchmakingService.subscribeToMatch(
      matchId,
      (updatedMatch) => {
        setMatch(updatedMatch);
        
        if (updatedMatch.status === 'completed') {
          setShowRematchModal(true);
        }
      }
    );

    return unsubscribe;
  }, [matchId]);

  useEffect(() => {
    if (match?.status === 'in_progress' && match.started_at) {
      const interval = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - new Date(match.started_at!).getTime()) / 1000
        );
        const remaining = match.duration_seconds - elapsed;
        
        setTimeRemaining(Math.max(0, remaining));

        if (remaining <= 0) {
          clearInterval(interval);
          handleMatchEnd();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [match?.status, match?.started_at]);

  const loadMatchData = async () => {
    setLoading(true);
    try {
      const matchData = await matchmakingService.getMatch(matchId);
      const participantsData = await matchmakingService.getMatchParticipants(matchId);
      
      setMatch(matchData);
      setParticipants(participantsData);

      // Check if current user is ready
      const currentUserParticipant = participantsData.find(p => p.user_id === user?.id);
      setIsReady(currentUserParticipant?.is_ready || false);

      // Calculate time remaining if match is in progress
      if (matchData?.status === 'in_progress' && matchData.started_at) {
        const elapsed = Math.floor(
          (Date.now() - new Date(matchData.started_at).getTime()) / 1000
        );
        setTimeRemaining(Math.max(0, matchData.duration_seconds - elapsed));
      } else {
        setTimeRemaining(matchData?.duration_seconds || 0);
      }
    } catch (error) {
      console.error('Error loading match:', error);
      Alert.alert('Error', 'Failed to load match');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReady = async () => {
    if (!user?.id) return;

    const result = await matchmakingService.markReady(matchId, user.id);
    if (result.success) {
      setIsReady(true);
      
      // Check if all players are ready
      const allReady = participants.every(p => 
        p.user_id === user.id || p.is_ready
      );

      if (allReady) {
        await matchmakingService.startMatch(matchId);
      }
    }
  };

  const handleMatchEnd = async () => {
    await matchmakingService.endMatch(matchId);
    setShowRematchModal(true);
  };

  const handleRematch = async () => {
    if (!user?.id) return;

    const result = await matchmakingService.requestRematch(matchId, user.id);
    if (result.success) {
      Alert.alert('Rematch Requested', 'Waiting for other players to accept...');
      setShowRematchModal(false);
    }
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Match',
      'Are you sure you want to leave? This will count as a forfeit.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isFinalTenSeconds = timeRemaining <= 10 && timeRemaining > 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Match not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const teamAParticipants = participants.filter(p => p.team === 'team_a');
  const teamBParticipants = participants.filter(p => p.team === 'team_b');
  const allReady = participants.every(p => p.is_ready);

  return (
    <View style={styles.container}>
      {/* Header with Timer */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} style={styles.leaveButton}>
          <Ionicons name="exit-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={[
          styles.timerContainer,
          isFinalTenSeconds && styles.timerContainerWarning,
        ]}>
          <Ionicons 
            name="timer" 
            size={20} 
            color={isFinalTenSeconds ? theme.colors.error : theme.colors.primary} 
          />
          <Text style={[
            styles.timerText,
            isFinalTenSeconds && styles.timerTextWarning,
          ]}>
            {formatTime(timeRemaining)}
          </Text>
        </View>
        
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Match Status */}
        <View style={styles.statusCard}>
          <Text style={styles.matchType}>{match.team_size.toUpperCase()} Battle</Text>
          <View style={[
            styles.statusBadge,
            match.status === 'in_progress' && { backgroundColor: theme.colors.live },
          ]}>
            <Text style={styles.statusText}>
              {match.status === 'forming' && 'Waiting for Players'}
              {match.status === 'ready' && 'All Ready - Starting Soon'}
              {match.status === 'in_progress' && 'LIVE'}
              {match.status === 'completed' && 'Battle Ended'}
            </Text>
          </View>
        </View>

        {/* Teams Display */}
        <View style={styles.teamsContainer}>
          {/* Team A */}
          <View style={styles.teamCard}>
            <View style={[styles.teamHeader, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.teamTitle}>Team A</Text>
            </View>
            {teamAParticipants.map((participant, index) => (
              <View key={participant.id} style={styles.participantRow}>
                <Ionicons 
                  name={participant.is_ready ? "checkmark-circle" : "ellipse-outline"} 
                  size={20} 
                  color={participant.is_ready ? theme.colors.success : theme.colors.textSecondary} 
                />
                <Text style={styles.participantText}>Player {index + 1}</Text>
                {participant.user_id === user?.id && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* VS Divider */}
          <View style={styles.vsDivider}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Team B */}
          <View style={styles.teamCard}>
            <View style={[styles.teamHeader, { backgroundColor: theme.colors.error }]}>
              <Text style={styles.teamTitle}>Team B</Text>
            </View>
            {teamBParticipants.map((participant, index) => (
              <View key={participant.id} style={styles.participantRow}>
                <Ionicons 
                  name={participant.is_ready ? "checkmark-circle" : "ellipse-outline"} 
                  size={20} 
                  color={participant.is_ready ? theme.colors.success : theme.colors.textSecondary} 
                />
                <Text style={styles.participantText}>Player {index + 1}</Text>
                {participant.user_id === user?.id && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Ready Button */}
        {match.status === 'forming' && !isReady && (
          <TouchableOpacity
            style={styles.readyButton}
            onPress={handleMarkReady}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.readyButtonText}>I'm Ready!</Text>
          </TouchableOpacity>
        )}

        {isReady && match.status === 'forming' && (
          <View style={styles.waitingCard}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.waitingText}>
              Waiting for other players... ({participants.filter(p => p.is_ready).length}/{participants.length} ready)
            </Text>
          </View>
        )}

        {/* Final 10 Seconds Warning */}
        {isFinalTenSeconds && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={32} color={theme.colors.error} />
            <Text style={styles.warningText}>FINAL {timeRemaining} SECONDS!</Text>
          </View>
        )}

        {/* Placeholder for Video Grid */}
        {match.status === 'in_progress' && (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.placeholderText}>Video stream will appear here</Text>
            <Text style={styles.placeholderSubtext}>(Agora SDK integration required)</Text>
          </View>
        )}
      </ScrollView>

      {/* Rematch Modal */}
      {showRematchModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Battle Ended!</Text>
            <Text style={styles.modalSubtitle}>Great battle! What's next?</Text>

            <TouchableOpacity
              style={styles.rematchButton}
              onPress={handleRematch}
            >
              <Ionicons name="refresh-circle" size={24} color="#fff" />
              <Text style={styles.rematchButtonText}>Request Rematch</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.leaveModalButton}
              onPress={() => router.back()}
            >
              <Text style={styles.leaveModalButtonText}>Leave Match</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  leaveButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  timerContainerWarning: {
    backgroundColor: `${theme.colors.error}30`,
  },
  timerText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  timerTextWarning: {
    color: theme.colors.error,
  },
  content: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  matchType: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  statusBadge: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  teamsContainer: {
    padding: theme.spacing.lg,
  },
  teamCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  teamHeader: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  teamTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  participantText: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  youBadge: {
    backgroundColor: theme.colors.gold,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  youBadgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: '#000',
  },
  vsDivider: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  vsText: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  readyButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  waitingText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.error}20`,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.error,
  },
  warningText: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.error,
    marginLeft: theme.spacing.md,
  },
  videoPlaceholder: {
    height: 300,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  placeholderSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textDisabled,
    marginTop: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.error,
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  backButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  modalSubtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  rematchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    width: '100%',
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
  leaveModalButton: {
    width: '100%',
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  leaveModalButtonText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
});
