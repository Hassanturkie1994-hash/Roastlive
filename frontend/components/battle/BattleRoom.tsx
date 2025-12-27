import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
const { width, height } = Dimensions.get('window');

interface BattleRoomProps {
  matchId: string;
  userTeam: 'team_a' | 'team_b';
  teamSize: string;
}

interface BattleData {
  match: {
    match_id: string;
    team_size: string;
    status: string;
    team_a_score: number;
    team_b_score: number;
    duration_seconds: number;
    started_at?: string;
  };
  team_a: any[];
  team_b: any[];
}

export default function BattleRoom({ matchId, userTeam, teamSize }: BattleRoomProps) {
  const router = useRouter();
  const [battleData, setBattleData] = useState<BattleData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const [battleStarted, setBattleStarted] = useState(false);

  useEffect(() => {
    loadBattleData();
    const interval = setInterval(loadBattleData, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [matchId]);

  // Countdown timer
  useEffect(() => {
    if (battleStarted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleBattleEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [battleStarted, timeRemaining]);

  const loadBattleData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/matchmaking/match/${matchId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setBattleData(data);

        if (data.match.status === 'in_progress' && !battleStarted) {
          setBattleStarted(true);
          if (data.match.started_at) {
            // Calculate elapsed time
            const elapsed = Math.floor(
              (new Date().getTime() - new Date(data.match.started_at).getTime()) / 1000
            );
            setTimeRemaining(Math.max(0, data.match.duration_seconds - elapsed));
          }
        }
      }
    } catch (error) {
      console.error('Failed to load battle data:', error);
    }
  };

  const handleReady = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/matchmaking/match/${matchId}/ready`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.all_ready) {
          Alert.alert('Battle Starting!', 'All players are ready!');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to mark ready');
    }
  };

  const handleBattleEnd = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/matchmaking/match/${matchId}/end`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        showBattleSummary(data);
      }
    } catch (error) {
      console.error('Failed to end battle:', error);
    }
  };

  const showBattleSummary = (data: any) => {
    const userWon =
      (data.winner === 'team_a' && userTeam === 'team_a') ||
      (data.winner === 'team_b' && userTeam === 'team_b');
    const message = data.winner === 'tie' ? "It's a tie!" : userWon ? 'You Won!' : 'You Lost';

    Alert.alert(
      '🏆 Battle Complete!',
      `${message}\n\nFinal Score:\nTeam A: ${data.final_score.team_a}\nTeam B: ${data.final_score.team_b}`,
      [
        {
          text: 'Back to Stream',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoLayout = () => {
    const teamCount = parseInt(teamSize.split('v')[0]);

    if (teamCount === 1) return '1x1'; // Side by side
    if (teamCount === 2) return '2x2'; // 2x2 grid
    if (teamCount === 3) return '3x2'; // 3 per side
    if (teamCount === 4) return '4x2'; // 4 per side
    return '5x2'; // 5 per side
  };

  if (!battleData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading battle...</Text>
      </View>
    );
  }

  const layout = getVideoLayout();
  const teamAScore = battleData.match.team_a_score;
  const teamBScore = battleData.match.team_b_score;
  const isUserTeamA = userTeam === 'team_a';

  return (
    <View style={styles.container}>
      {/* Header with Scoreboard */}
      <View style={styles.header}>
        <View style={styles.scoreContainer}>
          <View style={[styles.teamScore, isUserTeamA && styles.userTeam]}>
            <Text style={styles.teamLabel}>Team A {isUserTeamA && '(You)'}</Text>
            <Text style={styles.scoreText}>{teamAScore}</Text>
          </View>

          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
            <View style={[styles.timer, timeRemaining < 30 && styles.timerWarning]}>
              <Ionicons name="time" size={16} color="#fff" />
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
            </View>
          </View>

          <View style={[styles.teamScore, !isUserTeamA && styles.userTeam]}>
            <Text style={styles.teamLabel}>Team B {!isUserTeamA && '(You)'}</Text>
            <Text style={styles.scoreText}>{teamBScore}</Text>
          </View>
        </View>
      </View>

      {/* Video Grid */}
      <View style={styles.videoContainer}>
        <View style={styles.teamColumn}>
          <Text style={styles.teamHeader}>Team A</Text>
          {battleData.team_a.map((player, idx) => (
            <View key={idx} style={[styles.videoSlot, getVideoSlotStyle(layout)]}>
              <View style={styles.placeholderVideo}>
                <Ionicons name="person" size={32} color="#666" />
                <Text style={styles.playerName}>{player.user_id.substring(0, 8)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.teamColumn}>
          <Text style={styles.teamHeader}>Team B</Text>
          {battleData.team_b.map((player, idx) => (
            <View key={idx} style={[styles.videoSlot, getVideoSlotStyle(layout)]}>
              <View style={styles.placeholderVideo}>
                <Ionicons name="person" size={32} color="#666" />
                <Text style={styles.playerName}>{player.user_id.substring(0, 8)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Ready Button (if not started) */}
      {!battleStarted && (
        <TouchableOpacity style={styles.readyButton} onPress={handleReady}>
          <Text style={styles.readyButtonText}>I'm Ready!</Text>
        </TouchableOpacity>
      )}

      {/* Battle Status */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {battleStarted ? '🔥 Battle in Progress' : 'Waiting for players...'}
        </Text>
      </View>
    </View>
  );
}

function getVideoSlotStyle(layout: string) {
  // Adjust video slot size based on layout
  if (layout === '1x1') return { height: height * 0.4 };
  if (layout === '2x2') return { height: height * 0.25 };
  if (layout === '3x2') return { height: height * 0.18 };
  if (layout === '4x2') return { height: height * 0.15 };
  return { height: height * 0.12 };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  teamScore: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  userTeam: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  teamLabel: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  vsContainer: {
    alignItems: 'center',
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerWarning: {
    backgroundColor: '#EF4444',
  },
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  videoContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  teamColumn: {
    flex: 1,
    padding: 4,
  },
  teamHeader: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 4,
  },
  videoSlot: {
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  placeholderVideo: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  playerName: {
    color: '#999',
    fontSize: 10,
    marginTop: 8,
  },
  readyButton: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
  },
  readyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBar: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
