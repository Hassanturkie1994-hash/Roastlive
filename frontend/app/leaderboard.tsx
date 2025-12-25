import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { supabase } from '../lib/supabase';

type LeaderboardType = 'roasters' | 'gifters' | 'earners' | 'battles';
type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'alltime';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar_url?: string;
  value: number;
  change?: number;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('roasters');
  const [period, setPeriod] = useState<TimePeriod>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab, period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Mock data for demo
      const mockData: LeaderboardEntry[] = Array.from({ length: 20 }, (_, i) => ({
        rank: i + 1,
        userId: `user-${i}`,
        username: `${getRandomName()}${Math.floor(Math.random() * 1000)}`,
        value: Math.floor(Math.random() * 10000) * (21 - i),
        change: Math.floor(Math.random() * 10) - 5,
      }));

      setEntries(mockData.sort((a, b) => b.value - a.value).map((e, i) => ({ ...e, rank: i + 1 })));
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getRandomName = () => {
    const names = ['RoastKing', 'FlameQueen', 'BurnMaster', 'SavageOne', 'ComedyGod', 'WittyWarrior', 'JokeStar', 'RoastLord'];
    return names[Math.floor(Math.random() * names.length)];
  };

  const getTabConfig = () => {
    switch (activeTab) {
      case 'roasters': return { icon: 'flame', label: 'Top Roasters', unit: 'wins' };
      case 'gifters': return { icon: 'gift', label: 'Top Gifters', unit: 'SEK sent' };
      case 'earners': return { icon: 'cash', label: 'Top Earners', unit: 'SEK earned' };
      case 'battles': return { icon: 'trophy', label: 'Battle Champions', unit: 'victories' };
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { backgroundColor: '#FFD700', borderColor: '#FFD700' };
    if (rank === 2) return { backgroundColor: '#C0C0C0', borderColor: '#C0C0C0' };
    if (rank === 3) return { backgroundColor: '#CD7F32', borderColor: '#CD7F32' };
    return { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.border };
  };

  const config = getTabConfig();

  const renderTopThree = () => {
    const top3 = entries.slice(0, 3);
    if (top3.length < 3) return null;

    return (
      <View style={styles.podium}>
        {/* 2nd Place */}
        <View style={styles.podiumItem}>
          <View style={[styles.podiumAvatar, styles.podiumAvatarSecond]}>
            <Text style={styles.podiumAvatarText}>{top3[1].username.charAt(0)}</Text>
            <View style={[styles.podiumRank, { backgroundColor: '#C0C0C0' }]}>
              <Text style={styles.podiumRankText}>2</Text>
            </View>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{top3[1].username}</Text>
          <Text style={styles.podiumValue}>{formatValue(top3[1].value)}</Text>
          <View style={[styles.podiumBar, { height: 60, backgroundColor: '#C0C0C0' }]} />
        </View>

        {/* 1st Place */}
        <View style={styles.podiumItem}>
          <View style={styles.crownContainer}>
            <Text style={styles.crownEmoji}>👑</Text>
          </View>
          <View style={[styles.podiumAvatar, styles.podiumAvatarFirst]}>
            <Text style={styles.podiumAvatarText}>{top3[0].username.charAt(0)}</Text>
            <View style={[styles.podiumRank, { backgroundColor: '#FFD700' }]}>
              <Text style={styles.podiumRankText}>1</Text>
            </View>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{top3[0].username}</Text>
          <Text style={styles.podiumValue}>{formatValue(top3[0].value)}</Text>
          <View style={[styles.podiumBar, { height: 80, backgroundColor: '#FFD700' }]} />
        </View>

        {/* 3rd Place */}
        <View style={styles.podiumItem}>
          <View style={[styles.podiumAvatar, styles.podiumAvatarThird]}>
            <Text style={styles.podiumAvatarText}>{top3[2].username.charAt(0)}</Text>
            <View style={[styles.podiumRank, { backgroundColor: '#CD7F32' }]}>
              <Text style={styles.podiumRankText}>3</Text>
            </View>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{top3[2].username}</Text>
          <Text style={styles.podiumValue}>{formatValue(top3[2].value)}</Text>
          <View style={[styles.podiumBar, { height: 40, backgroundColor: '#CD7F32' }]} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        {(['roasters', 'gifters', 'earners', 'battles'] as LeaderboardType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === 'roasters' ? 'flame' : tab === 'gifters' ? 'gift' : tab === 'earners' ? 'cash' : 'trophy'}
              size={18}
              color={activeTab === tab ? '#fff' : theme.colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['daily', 'weekly', 'monthly', 'alltime'] as TimePeriod[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === 'alltime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              loadLeaderboard();
            }} />
          }
        >
          {/* Podium */}
          {renderTopThree()}

          {/* Rest of list */}
          <View style={styles.listContainer}>
            {entries.slice(3).map((entry) => (
              <TouchableOpacity
                key={entry.userId}
                style={styles.listItem}
                onPress={() => router.push(`/user/${entry.userId}`)}
              >
                <Text style={styles.listRank}>#{entry.rank}</Text>
                <View style={styles.listAvatar}>
                  <Text style={styles.listAvatarText}>{entry.username.charAt(0)}</Text>
                </View>
                <View style={styles.listInfo}>
                  <Text style={styles.listName}>{entry.username}</Text>
                  {entry.change !== undefined && entry.change !== 0 && (
                    <View style={styles.changeContainer}>
                      <Ionicons
                        name={entry.change > 0 ? 'arrow-up' : 'arrow-down'}
                        size={12}
                        color={entry.change > 0 ? theme.colors.success : theme.colors.error}
                      />
                      <Text style={[
                        styles.changeText,
                        { color: entry.change > 0 ? theme.colors.success : theme.colors.error }
                      ]}>
                        {Math.abs(entry.change)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.listValue}>{formatValue(entry.value)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xxl + 10, paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  tabsScroll: { backgroundColor: theme.colors.surface, paddingVertical: theme.spacing.sm },
  tab: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full, marginLeft: theme.spacing.sm, backgroundColor: theme.colors.surfaceLight,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { marginLeft: 6, fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: theme.typography.weights.semibold },
  periodSelector: { flexDirection: 'row', padding: theme.spacing.md, backgroundColor: theme.colors.surface },
  periodButton: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: theme.borderRadius.md, marginHorizontal: 2 },
  periodButtonActive: { backgroundColor: theme.colors.surfaceLight },
  periodText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  periodTextActive: { color: theme.colors.text, fontWeight: theme.typography.weights.semibold },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingVertical: theme.spacing.xl, paddingHorizontal: theme.spacing.md },
  podiumItem: { alignItems: 'center', width: 100 },
  crownContainer: { marginBottom: -10 },
  crownEmoji: { fontSize: 32 },
  podiumAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  podiumAvatarFirst: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, borderColor: '#FFD700' },
  podiumAvatarSecond: { backgroundColor: theme.colors.info, borderColor: '#C0C0C0' },
  podiumAvatarThird: { backgroundColor: theme.colors.warning, borderColor: '#CD7F32' },
  podiumAvatarText: { fontSize: 24, fontWeight: theme.typography.weights.bold, color: '#fff' },
  podiumRank: { position: 'absolute', bottom: -8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  podiumRankText: { fontSize: 12, fontWeight: theme.typography.weights.bold, color: '#000' },
  podiumName: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.text, marginTop: theme.spacing.md },
  podiumValue: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  podiumBar: { width: 60, borderTopLeftRadius: 8, borderTopRightRadius: 8, marginTop: theme.spacing.sm },
  listContainer: { padding: theme.spacing.md },
  listItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.sm,
  },
  listRank: { width: 36, fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: theme.colors.textSecondary },
  listAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  listAvatarText: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  listInfo: { flex: 1, marginLeft: theme.spacing.md },
  listName: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  changeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  changeText: { fontSize: 11, marginLeft: 2 },
  listValue: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: theme.colors.gold },
});
