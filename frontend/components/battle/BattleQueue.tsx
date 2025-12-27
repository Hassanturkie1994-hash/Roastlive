import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

type TeamSize = '1v1' | '2v2' | '3v3' | '4v4' | '5v5';

interface QueueStatus {
  in_queue: boolean;
  team_size?: string;
  position?: number;
  wait_time_seconds?: number;
  estimated_wait?: string;
}

export default function BattleQueue() {
  const { user } = useAuth();
  const router = useRouter();
  const [showTeamSizeModal, setShowTeamSizeModal] = useState(false);
  const [selectedTeamSize, setSelectedTeamSize] = useState<TeamSize>('1v1');
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ in_queue: false });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  // Poll queue status while in queue
  useEffect(() => {
    if (queueStatus.in_queue) {
      const interval = setInterval(checkQueueStatus, 2000); // Check every 2 seconds
      return () => clearInterval(interval);
    }
  }, [queueStatus.in_queue]);

  const checkQueueStatus = async () => {
    try {
      setChecking(true);
      const response = await fetch(`${BACKEND_URL}/api/matchmaking/queue/status`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check if we found a match (transitioned from in_queue to not in_queue)
        if (queueStatus.in_queue && !data.in_queue) {
          // User left queue - likely matched
          // Try to find the match by checking recent battle_participants
          try {
            const matchResponse = await fetch(`${BACKEND_URL}/api/matchmaking/queue/status`, {
              credentials: 'include',
            });
            
            // In real implementation, backend would return match_id
            // For now, show alert and reset
            Alert.alert(
              '🎮 Match Found!',
              'Your battle is ready to begin!',
              [
                {
                  text: 'Join Battle',
                  onPress: () => {
                    // TODO: Navigate to actual match_id from backend
                    router.push('/battle/demo_match_123');
                  },
                },
              ]
            );
            setQueueStatus({ in_queue: false });
          } catch (error) {
            console.error('Match check failed:', error);
          }
        } else {
          setQueueStatus(data);
        }
      }
    } catch (error) {
      console.error('Queue status check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleJoinQueue = async () => {
    setShowTeamSizeModal(false);
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/matchmaking/queue/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          team_size: selectedTeamSize,
          region: 'global',
          guest_ids: [], // Empty for now, will add guest support later
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQueueStatus({ in_queue: true, team_size: selectedTeamSize });
        Alert.alert('🎮 Joining Queue', `Looking for ${selectedTeamSize} match...`);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to join queue');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join matchmaking queue');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/matchmaking/queue/leave`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setQueueStatus({ in_queue: false });
        Alert.alert('Left Queue', 'You have left the matchmaking queue');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to leave queue');
    } finally {
      setLoading(false);
    }
  };

  const teamSizes: TeamSize[] = ['1v1', '2v2', '3v3', '4v4', '5v5'];

  if (queueStatus.in_queue) {
    return (
      <View style={styles.queueStatusContainer}>
        <View style={styles.queueCard}>
          <View style={styles.queueHeader}>
            <Ionicons name="search" size={32} color="#667eea" />
            <Text style={styles.queueTitle}>Finding Match...</Text>
          </View>

          <View style={styles.queueInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mode:</Text>
              <Text style={styles.infoValue}>{queueStatus.team_size}</Text>
            </View>

            {queueStatus.position !== undefined && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Position in Queue:</Text>
                <Text style={styles.infoValue}>#{queueStatus.position}</Text>
              </View>
            )}

            {queueStatus.wait_time_seconds !== undefined && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time Waiting:</Text>
                <Text style={styles.infoValue}>{queueStatus.wait_time_seconds}s</Text>
              </View>
            )}

            {queueStatus.estimated_wait && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estimated:</Text>
                <Text style={styles.infoValue}>{queueStatus.estimated_wait}</Text>
              </View>
            )}
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            {checking && <Text style={styles.checkingText}>Checking for opponents...</Text>}
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleLeaveQueue}
            disabled={loading}
          >
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.cancelButtonText}>Cancel Search</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.battleButton}
        onPress={() => setShowTeamSizeModal(true)}
        disabled={loading}
      >
        <Ionicons name="flash" size={24} color="#fff" />
        <Text style={styles.battleButtonText}>Start Battle</Text>
      </TouchableOpacity>

      <Modal
        visible={showTeamSizeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTeamSizeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Battle Mode</Text>
              <TouchableOpacity onPress={() => setShowTeamSizeModal(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select your team size</Text>

            <View style={styles.teamSizeGrid}>
              {teamSizes.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.teamSizeCard,
                    selectedTeamSize === size && styles.teamSizeCardSelected,
                  ]}
                  onPress={() => setSelectedTeamSize(size)}
                >
                  <Text style={styles.teamSizeEmoji}>⚔️</Text>
                  <Text
                    style={[
                      styles.teamSizeText,
                      selectedTeamSize === size && styles.teamSizeTextSelected,
                    ]}
                  >
                    {size}
                  </Text>
                  <Text style={styles.teamSizeDescription}>
                    {size === '1v1' && 'Solo Duel'}
                    {size === '2v2' && 'Duo Battle'}
                    {size === '3v3' && 'Trio Clash'}
                    {size === '4v4' && 'Squad Fight'}
                    {size === '5v5' && 'Team War'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={handleJoinQueue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.startButtonText}>Find Match</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  battleButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 20,
  },
  battleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  teamSizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  teamSizeCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  teamSizeCardSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#667eea',
  },
  teamSizeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  teamSizeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  teamSizeTextSelected: {
    color: '#667eea',
  },
  teamSizeDescription: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  queueStatusContainer: {
    padding: 20,
  },
  queueCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  queueHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  queueTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 12,
  },
  queueInfo: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  checkingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#666',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fef2f2',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
