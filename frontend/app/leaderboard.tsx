import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { getLeaderboard, getUserRank, getUserXPInfo } from '../services/xpService';
import { BADGES } from '../utils/xpSystem';

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url?: string;
  total_xp: number;
  level: number;
  rank_title: string;
  badges: string[];
  battles_won: number;
  battles_lost: number;
  total_battles: number;
  rank: number;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userXPInfo, setUserXPInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard(100);
      setLeaderboard(data);

      if (user?.id) {
        const rank = await getUserRank(user.id);
        setUserRank(rank);

        const xpInfo = await getUserXPInfo(user.id);
        setUserXPInfo(xpInfo);
      }
    } catch (error) {
      console.error('Load leaderboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const renderBadge = (badgeId: string) => {
    const badge = Object.values(BADGES).find(b => b.id === badgeId);
    if (!badge) return null;

    return (
      <View key={badgeId} style={styles.badge}>
        <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
      </View>
    );
  };

  const renderRankMedal = (rank: number) => {
    if (rank === 1) return <Text style={styles.medal}>🥇</Text>;
    if (rank === 2) return <Text style={styles.medal}>🥈</Text>;
    if (rank === 3) return <Text style={styles.medal}>🥉</Text>;
    return null;
  };

  const renderLeaderboardEntry = (entry: LeaderboardEntry, index: number) => {
    const isCurrentUser = entry.id === user?.id;

    return (
      <View
        key={entry.id}
        style={[
          styles.entryCard,
          isCurrentUser && styles.currentUserCard,
          index < 3 && styles.topThreeCard,
        ]}
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          {renderRankMedal(entry.rank)}
          {!renderRankMedal(entry.rank) && (
            <Text style={[styles.rankNumber, isCurrentUser && styles.currentUserText]}>
              #{entry.rank}
            </Text>
          )}
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {entry.avatar_url ? (
            <Image source={{ uri: entry.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>
                {entry.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {isCurrentUser && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>YOU</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.entryInfo}>
          <Text style={[styles.username, isCurrentUser && styles.currentUserText]} numberOfLines={1}>
            {entry.username}
          </Text>
          <Text style={styles.rankTitle} numberOfLines={1}>{entry.rank_title}</Text>
          <View style={styles.badgesRow}>
            {entry.badges.slice(0, 3).map(renderBadge)}
            {entry.badges.length > 3 && (
              <Text style={styles.badgeMore}>+{entry.badges.length - 3}</Text>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.entryStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, isCurrentUser && styles.currentUserText]}>
              {entry.level}
            </Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, isCurrentUser && styles.currentUserText]}>
              {(entry.total_xp / 1000).toFixed(1)}K
            </Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard 🏆</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* User Rank Card */}
      {userRank && userXPInfo && (
        <View style={styles.userRankCard}>
          <View style={styles.userRankHeader}>
            <Text style={styles.userRankTitle}>Your Rank</Text>
            <Text style={styles.userRankNumber}>#{userRank}</Text>
          </View>
          <View style={styles.userRankStats}>
            <View style={styles.userStatItem}>
              <Ionicons name="trophy" size={20} color={theme.colors.gold} />
              <Text style={styles.userStatValue}>Level {userXPInfo.level}</Text>
              <Text style={styles.userStatLabel}>{userXPInfo.rankTitle}</Text>
            </View>
            <View style={styles.userStatItem}>
              <Ionicons name="flame" size={20} color={theme.colors.primary} />
              <Text style={styles.userStatValue}>{userXPInfo.totalXP.toLocaleString()} XP</Text>
              <Text style={styles.userStatLabel}>
                {userXPInfo.currentLevelXP}/{userXPInfo.nextLevelXP} to next
              </Text>
            </View>
            <View style={styles.userStatItem}>
              <Ionicons name="ribbon" size={20} color={theme.colors.success} />
              <Text style={styles.userStatValue}>{userXPInfo.badges?.length || 0} Badges</Text>
              <Text style={styles.userStatLabel}>
                {userXPInfo.currentWinStreak > 0 ? `${userXPInfo.currentWinStreak} 🔥 streak` : 'No streak'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Leaderboard List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {leaderboard.length > 0 ? (
          leaderboard.map((entry, index) => renderLeaderboardEntry(entry, index))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={80} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Rankings Yet</Text>
            <Text style={styles.emptyText}>Complete battles and streams to appear on the leaderboard!</Text>
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  // User Rank Card
  userRankCard: {
    backgroundColor: `${theme.colors.primary}20`,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  userRankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  userRankTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  userRankNumber: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  userRankStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  userStatValue: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  userStatLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  // Entry Card
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  topThreeCard: {
    borderColor: theme.colors.gold,
    borderWidth: 2,
  },
  currentUserCard: {
    backgroundColor: `${theme.colors.primary}15`,
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  currentUserText: {
    color: theme.colors.primary,
  },
  // Rank
  rankContainer: {
    width: 50,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  medal: {
    fontSize: 30,
  },
  // Avatar
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  youBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  // Info
  entryInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  username: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  rankTitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    marginRight: 4,
  },
  badgeEmoji: {
    fontSize: 16,
  },
  badgeMore: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  // Stats
  entryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  statValue: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.sm,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
});
