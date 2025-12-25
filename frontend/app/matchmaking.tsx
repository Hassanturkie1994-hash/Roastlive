import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { matchmakingService, TeamSize, QueueEntry } from '../services/matchmakingService';

export default function MatchmakingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const teamSize = (params.teamSize as TeamSize) || '1v1';

  const [queueStatus, setQueueStatus] = useState<'idle' | 'searching' | 'found'>('idle');
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    if (user?.id) {
      joinQueue();
    }

    return () => {
      // Cleanup: leave queue when unmounting
      if (user?.id && queueStatus === 'searching') {
        matchmakingService.leaveQueue(user.id);
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to queue updates
    const unsubscribe = matchmakingService.subscribeToQueue(
      user.id,
      (queue) => {
        if (queue?.status === 'matched' && queue.match_id) {
          setQueueStatus('found');
          setTimeout(() => {
            router.replace(`/battle/match/${queue.match_id}`);
          }, 2000);
        }
      }
    );

    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (queueStatus === 'searching') {
      const interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [queueStatus]);

  const joinQueue = async () => {
    if (!user?.id) return;

    setQueueStatus('searching');
    
    const result = await matchmakingService.joinQueue(user.id, teamSize);
    
    if (result.success) {
      // Load estimated wait time
      const wait = await matchmakingService.getEstimatedWaitTime(teamSize);
      setEstimatedWait(wait);
    } else {
      Alert.alert('Error', result.error || 'Failed to join queue');
      router.back();
    }
  };

  const handleCancel = async () => {
    if (!user?.id) return;

    Alert.alert(
      'Leave Queue',
      'Are you sure you want to stop searching?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Leave',
          style: 'destructive',
          onPress: async () => {
            await matchmakingService.leaveQueue(user.id);
            router.back();
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTeamSizeLabel = (size: TeamSize): string => {
    return size.toUpperCase();
  };

  const getMatchDuration = (size: TeamSize): string => {
    const durations = {
      '1v1': '3 min',
      '2v2': '5 min',
      '3v3': '8 min',
      '4v4': '12 min',
      '5v5': '15 min',
    };
    return durations[size];
  };

  if (queueStatus === 'found') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={100} color={theme.colors.success} />
          </View>
          <Text style={styles.title}>Match Found!</Text>
          <Text style={styles.subtitle}>Preparing your battle room...</Text>
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finding Match</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Searching Animation */}
        <View style={styles.searchingContainer}>
          <View style={styles.rippleContainer}>
            <View style={[styles.ripple, styles.ripple1]} />
            <View style={[styles.ripple, styles.ripple2]} />
            <View style={[styles.ripple, styles.ripple3]} />
            <View style={styles.centerIcon}>
              <Ionicons name="search" size={40} color={theme.colors.primary} />
            </View>
          </View>
        </View>

        <Text style={styles.title}>Searching for Opponents</Text>
        <Text style={styles.subtitle}>Finding players for {getTeamSizeLabel(teamSize)} battle</Text>

        {/* Match Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="people" size={24} color={theme.colors.primary} />
            <Text style={styles.infoLabel}>Team Size:</Text>
            <Text style={styles.infoValue}>{getTeamSizeLabel(teamSize)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="timer" size={24} color={theme.colors.primary} />
            <Text style={styles.infoLabel}>Match Duration:</Text>
            <Text style={styles.infoValue}>{getMatchDuration(teamSize)}</Text>
          </View>
        </View>

        {/* Queue Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
            <Text style={styles.statLabel}>Time Searching</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>~{Math.ceil(estimatedWait)}s</Text>
            <Text style={styles.statLabel}>Est. Wait</Text>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Ionicons name="bulb" size={20} color={theme.colors.gold} />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>While you wait...</Text>
            <Text style={styles.tipsText}>Make sure you have a good internet connection and your mic is working!</Text>
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel Search</Text>
        </TouchableOpacity>
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
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  searchingContainer: {
    marginVertical: theme.spacing.xxl,
  },
  rippleContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 100,
    opacity: 0.3,
  },
  ripple1: {
    width: 120,
    height: 120,
  },
  ripple2: {
    width: 160,
    height: 160,
  },
  ripple3: {
    width: 200,
    height: 200,
  },
  centerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  infoCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  infoLabel: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  infoValue: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  tipsCard: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: `${theme.colors.gold}20`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  tipsContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  tipsTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.gold,
    marginBottom: theme.spacing.xs,
  },
  tipsText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  cancelButton: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  cancelButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.error,
  },
  successIcon: {
    marginVertical: theme.spacing.xxl,
  },
});
