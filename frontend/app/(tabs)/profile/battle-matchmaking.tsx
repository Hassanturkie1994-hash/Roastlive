import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

type TeamSize = '1v1' | '2v2' | '3v3' | '4v4' | '5v5';

export default function BattleMatchmakingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedTeamSize, setSelectedTeamSize] = useState<TeamSize>('1v1');
  const [inQueue, setInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      checkQueueStatus();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (inQueue) {
      interval = setInterval(checkQueueStatus, 2000); // Poll every 2 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [inQueue]);

  const checkQueueStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/matchmaking/queue/status`, {
        headers: {
          'Authorization': `Bearer ${user?.session_token}`,
        },
      });
      const data = await response.json();
      setQueueStatus(data);
      setInQueue(data.in_queue);
    } catch (error) {
      console.error('Check queue error:', error);
    }
  };

  const handleJoinQueue = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to join matchmaking');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/matchmaking/queue/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.session_token}`,
        },
        body: JSON.stringify({
          team_size: selectedTeamSize,
          region: 'global',
          guest_ids: [],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setInQueue(true);
        Alert.alert('Joined Queue!', `Searching for ${selectedTeamSize} battle...`);
      } else {
        Alert.alert('Error', data.detail || 'Failed to join queue');
      }
    } catch (error) {
      console.error('Join queue error:', error);
      Alert.alert('Error', 'Failed to join matchmaking');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/matchmaking/queue/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.session_token}`,
        },
      });

      if (response.ok) {
        setInQueue(false);
        setQueueStatus(null);
      }
    } catch (error) {
      console.error('Leave queue error:', error);
    } finally {
      setLoading(false);
    }
  };

  const teamSizes: TeamSize[] = ['1v1', '2v2', '3v3', '4v4', '5v5'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Battle Matchmaking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!inQueue ? (
          <>
            {/* Team Size Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Team Size</Text>
              <View style={styles.teamSizeGrid}>
                {teamSizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.teamSizeButton,
                      selectedTeamSize === size && styles.teamSizeButtonActive,
                    ]}
                    onPress={() => setSelectedTeamSize(size)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.teamSizeText,
                        selectedTeamSize === size && styles.teamSizeTextActive,
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Battle Info */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Battle Format</Text>
                <Text style={styles.infoText}>
                  • 3-minute roast battle{'
'}
                  • Most gifts wins{'
'}
                  • XP rewards: Win=100, Loss=50
                </Text>
              </View>
            </View>

            {/* Join Button */}
            <TouchableOpacity
              style={[
                styles.joinButton,
                loading && styles.joinButtonDisabled,
              ]}
              onPress={handleJoinQueue}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="search" size={24} color="#fff" />
                  <Text style={styles.joinButtonText}>Find {selectedTeamSize} Match</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Queue Status */}
            <View style={styles.queueCard}>
              <ActivityIndicator size="large" color={theme.colors.primary} style={styles.queueSpinner} />
              <Text style={styles.queueTitle}>Searching for Match...</Text>
              <Text style={styles.queueSubtext}>
                Team Size: {queueStatus?.team_size || selectedTeamSize}
              </Text>
              {queueStatus?.position && (
                <Text style={styles.queuePosition}>
                  Position in queue: #{queueStatus.position}
                </Text>
              )}
              {queueStatus?.wait_time_seconds && (
                <Text style={styles.queueWait}>
                  Waiting: {queueStatus.wait_time_seconds}s
                </Text>
              )}
              {queueStatus?.estimated_wait && (
                <Text style={styles.queueEstimate}>
                  Estimated: {queueStatus.estimated_wait}
                </Text>
              )}
            </View>

            {/* Leave Queue Button */}
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleLeaveQueue}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.error} />
              ) : (
                <Text style={styles.leaveButtonText}>Leave Queue</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Battle Leaderboard Link */}
        <TouchableOpacity
          style={styles.leaderboardButton}
          onPress={() => router.push('/leaderboard-battles')}
          activeOpacity={0.7}
        >
          <Ionicons name="trophy" size={20} color={theme.colors.warning} />
          <Text style={styles.leaderboardText}>View Battle Leaderboard</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  teamSizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  teamSizeButton: {
    width: '30%',
    margin: '1.5%',
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  teamSizeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}15`,
  },
  teamSizeText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  teamSizeTextActive: {
    color: theme.colors.primary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 20,
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  queueCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  queueSpinner: {
    marginBottom: 16,
  },
  queueTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  queueSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  queuePosition: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  queueWait: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  queueEstimate: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  leaveButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
  },
  leaderboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  leaderboardText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
    marginLeft: 12,
  },
});