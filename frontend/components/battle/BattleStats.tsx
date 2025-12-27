import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface BattleHistory {
  match_id: string;
  team_size: string;
  winner: string;
  your_team: string;
  final_score: {
    team_a: number;
    team_b: number;
  };
  ended_at: string;
}

export default function BattleStats() {
  const [stats, setStats] = useState({
    total_battles: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    win_rate: 0,
    favorite_mode: '1v1',
  });
  const [history, setHistory] = useState<BattleHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBattleStats();
  }, []);

  const loadBattleStats = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would call a backend endpoint
      // For now, we'll simulate data
      
      // Simulate stats
      setStats({
        total_battles: 15,
        wins: 9,
        losses: 5,
        ties: 1,
        win_rate: 60,
        favorite_mode: '1v1',
      });

      // Simulate history
      const mockHistory: BattleHistory[] = [
        {
          match_id: 'battle_1',
          team_size: '1v1',
          winner: 'team_a',
          your_team: 'team_a',
          final_score: { team_a: 150, team_b: 120 },
          ended_at: new Date().toISOString(),
        },
        {
          match_id: 'battle_2',
          team_size: '2v2',
          winner: 'team_b',
          your_team: 'team_a',
          final_score: { team_a: 80, team_b: 100 },
          ended_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
      setHistory(mockHistory);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResultIcon = (match: BattleHistory) => {
    if (match.winner === 'tie') return '🤝';
    const won = match.winner === match.your_team;
    return won ? '🏆' : '😢';
  };

  const getResultText = (match: BattleHistory) => {
    if (match.winner === 'tie') return 'Tie';
    return match.winner === match.your_team ? 'Victory' : 'Defeat';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Overall Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total_battles}</Text>
          <Text style={styles.statLabel}>Total Battles</Text>
        </View>

        <View style={[styles.statCard, styles.winCard]}>
          <Text style={styles.statValue}>{stats.wins}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>

        <View style={[styles.statCard, styles.lossCard]}>
          <Text style={styles.statValue}>{stats.losses}</Text>
          <Text style={styles.statLabel}>Losses</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.win_rate}%</Text>
          <Text style={styles.statLabel}>Win Rate</Text>
        </View>
      </View>

      {/* Favorite Mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Mode</Text>
        <View style={styles.modeCard}>
          <Ionicons name="flash" size={32} color="#667eea" />
          <Text style={styles.modeText}>{stats.favorite_mode}</Text>
          <Text style={styles.modeSubtext}>Most played</Text>
        </View>
      </View>

      {/* Battle History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Battles</Text>
        {history.map((match) => (
          <View key={match.match_id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyEmoji}>{getResultIcon(match)}</Text>
              <View style={styles.historyInfo}>
                <Text style={styles.historyMode}>{match.team_size} Battle</Text>
                <Text style={styles.historyResult}>{getResultText(match)}</Text>
              </View>
            </View>

            <View style={styles.historyScore}>
              <Text
                style={[
                  styles.scoreText,
                  match.your_team === 'team_a' && styles.yourScore,
                ]}
              >
                {match.final_score.team_a}
              </Text>
              <Text style={styles.scoreDivider}>-</Text>
              <Text
                style={[
                  styles.scoreText,
                  match.your_team === 'team_b' && styles.yourScore,
                ]}
              >
                {match.final_score.team_b}
              </Text>
            </View>

            <Text style={styles.historyTime}>
              {new Date(match.ended_at).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  winCard: {
    backgroundColor: '#d1fae5',
  },
  lossCard: {
    backgroundColor: '#fee2e2',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  modeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  modeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 8,
  },
  modeSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyMode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  historyResult: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  historyScore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  yourScore: {
    color: '#667eea',
  },
  scoreDivider: {
    fontSize: 24,
    color: '#999',
    marginHorizontal: 16,
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
