import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar?: string;
  battle_wins: number;
  battle_total: number;
  win_rate: number;
  win_streak: number;
  total_score: number;
}

export default function BattleLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly'>('all');

  useEffect(() => {
    loadLeaderboard();
  }, [filter]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);

      // Simulate leaderboard data (in real app, fetch from backend)
      const mockData: LeaderboardEntry[] = [
        {
          rank: 1,
          user_id: 'user_1',
          username: 'BattleKing',
          battle_wins: 45,
          battle_total: 50,
          win_rate: 90,
          win_streak: 8,
          total_score: 12500,
        },
        {
          rank: 2,
          user_id: 'user_2',
          username: 'StreamQueen',
          battle_wins: 38,
          battle_total: 45,
          win_rate: 84,
          win_streak: 5,
          total_score: 10800,
        },
        {
          rank: 3,
          user_id: 'user_3',
          username: 'RoastMaster',
          battle_wins: 35,
          battle_total: 42,
          win_rate: 83,
          win_streak: 3,
          total_score: 9600,
        },
        {
          rank: 4,
          user_id: 'user_4',
          username: 'PKChampion',
          battle_wins: 32,
          battle_total: 40,
          win_rate: 80,
          win_streak: 6,
          total_score: 8900,
        },
        {
          rank: 5,
          user_id: 'user_5',
          username: 'VictoryLion',
          battle_wins: 28,
          battle_total: 38,
          win_rate: 74,
          win_streak: 2,
          total_score: 7800,
        },
      ];

      setLeaderboard(mockData);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 80) return '#10B981';
    if (rate >= 60) return '#667eea';
    if (rate >= 40) return '#F59E0B';
    return '#EF4444';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Battle Leaderboard</Text>
        <Text style={styles.subtitle}>Top battle champions</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All Time
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'weekly' && styles.filterTabActive]}
          onPress={() => setFilter('weekly')}
        >
          <Text style={[styles.filterText, filter === 'weekly' && styles.filterTextActive]}>
            This Week
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'daily' && styles.filterTabActive]}
          onPress={() => setFilter('daily')}
        >
          <Text style={[styles.filterText, filter === 'daily' && styles.filterTextActive]}>
            Today
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leaderboard List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {leaderboard.map((entry) => (
          <View key={entry.user_id} style={styles.leaderboardCard}>
            {/* Rank Badge */}
            <View style={styles.rankBadge}>
              <Text style={[styles.rankText, entry.rank <= 3 && styles.topRankText]}>
                {getMedalEmoji(entry.rank)}
              </Text>
            </View>

            {/* User Info */}
            <View style={styles.userInfo}>
              <Text style={styles.username}>{entry.username}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="trophy" size={14} color="#F59E0B" />
                  <Text style={styles.statText}>
                    {entry.battle_wins}/{entry.battle_total}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Ionicons name="flame" size={14} color="#EF4444" />
                  <Text style={styles.statText}>Streak: {entry.win_streak}</Text>
                </View>

                <View
                  style={[
                    styles.winRateBadge,
                    { backgroundColor: getWinRateColor(entry.win_rate) + '20' },
                  ]}
                >
                  <Text style={[styles.winRateText, { color: getWinRateColor(entry.win_rate) }]}>
                    {entry.win_rate}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Total Score */}
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={styles.scoreValue}>{entry.total_score.toLocaleString()}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
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
    marginTop: 12,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#667eea',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  leaderboardCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rankBadge: {
    width: 50,
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  topRankText: {
    fontSize: 28,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  winRateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  winRateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#999',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
});
