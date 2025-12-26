import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  totalViews: number;
  totalWatchTime: number;
  totalGiftsReceived: number;
  totalEarnings: number;
  followers: number;
  followersGrowth: number;
  streams: number;
  avgViewers: number;
  topGifts: { name: string; count: number; emoji: string }[];
  recentStreams: { id: string; title: string; viewers: number; date: string }[];
  viewsOverTime: { date: string; views: number }[];
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    if (!user?.id) return;

    try {
      // Get wallet data
      const { data: wallet } = await supabase
        .from('wallets')
        .select('total_earned')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get follower count
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      // Get gift transactions
      const { data: gifts } = await supabase
        .from('gift_transactions')
        .select('gift_name, gift_emoji')
        .eq('recipient_id', user.id);

      // Get stream count
      const { count: streams } = await supabase
        .from('streams')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', user.id);

      // Aggregate top gifts
      const giftCounts: Record<string, { count: number; emoji: string }> = {};
      (gifts || []).forEach((g: any) => {
        if (!giftCounts[g.gift_name]) {
          giftCounts[g.gift_name] = { count: 0, emoji: g.gift_emoji };
        }
        giftCounts[g.gift_name].count++;
      });

      const topGifts = Object.entries(giftCounts)
        .map(([name, { count, emoji }]) => ({ name, count, emoji }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Mock some data for demo
      setData({
        totalViews: Math.floor(Math.random() * 10000),
        totalWatchTime: Math.floor(Math.random() * 50000),
        totalGiftsReceived: gifts?.length || 0,
        totalEarnings: wallet?.total_earned || 0,
        followers: followers || 0,
        followersGrowth: Math.floor(Math.random() * 50) - 10,
        streams: streams || 0,
        avgViewers: Math.floor(Math.random() * 100) + 10,
        topGifts,
        recentStreams: [],
        viewsOverTime: [],
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
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
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['7d', '30d', '90d'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadAnalytics();
          }} />
        }
      >
        {/* Main Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="eye" size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{formatNumber(data?.totalViews || 0)}</Text>
            <Text style={styles.statLabel}>Total Views</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color={theme.colors.info} />
            <Text style={styles.statValue}>{formatTime(data?.totalWatchTime || 0)}</Text>
            <Text style={styles.statLabel}>Watch Time</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="gift" size={24} color={theme.colors.gold} />
            <Text style={styles.statValue}>{formatNumber(data?.totalGiftsReceived || 0)}</Text>
            <Text style={styles.statLabel}>Gifts</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>{formatNumber(data?.totalEarnings || 0)}</Text>
            <Text style={styles.statLabel}>Earnings (SEK)</Text>
          </View>
        </View>

        {/* Followers Card */}
        <View style={styles.followersCard}>
          <View style={styles.followersHeader}>
            <Ionicons name="people" size={24} color={theme.colors.primary} />
            <Text style={styles.followersTitle}>Followers</Text>
          </View>
          <Text style={styles.followersCount}>{formatNumber(data?.followers || 0)}</Text>
          <View style={styles.growthRow}>
            <Ionicons
              name={(data?.followersGrowth || 0) >= 0 ? 'trending-up' : 'trending-down'}
              size={16}
              color={(data?.followersGrowth || 0) >= 0 ? theme.colors.success : theme.colors.error}
            />
            <Text style={[
              styles.growthText,
              { color: (data?.followersGrowth || 0) >= 0 ? theme.colors.success : theme.colors.error }
            ]}>
              {(data?.followersGrowth || 0) >= 0 ? '+' : ''}{data?.followersGrowth} this {period}
            </Text>
          </View>
        </View>

        {/* Streaming Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming</Text>
          <View style={styles.streamingStats}>
            <View style={styles.streamingStat}>
              <Text style={styles.streamingStatValue}>{data?.streams || 0}</Text>
              <Text style={styles.streamingStatLabel}>Total Streams</Text>
            </View>
            <View style={styles.streamingStatDivider} />
            <View style={styles.streamingStat}>
              <Text style={styles.streamingStatValue}>{data?.avgViewers || 0}</Text>
              <Text style={styles.streamingStatLabel}>Avg Viewers</Text>
            </View>
          </View>
        </View>

        {/* Top Gifts */}
        {(data?.topGifts?.length || 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Gifts Received</Text>
            <View style={styles.topGiftsList}>
              {data?.topGifts.map((gift, index) => (
                <View key={gift.name} style={styles.topGiftItem}>
                  <Text style={styles.topGiftRank}>#{index + 1}</Text>
                  <Text style={styles.topGiftEmoji}>{gift.emoji}</Text>
                  <Text style={styles.topGiftName}>{gift.name}</Text>
                  <Text style={styles.topGiftCount}>×{gift.count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/profile/wallet')}>
            <Ionicons name="wallet" size={20} color={theme.colors.primary} />
            <Text style={styles.actionButtonText}>View Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/replays')}>
            <Ionicons name="play-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.actionButtonText}>My Replays</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xxl + 10, paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  periodSelector: { flexDirection: 'row', padding: theme.spacing.md, backgroundColor: theme.colors.surface },
  periodButton: {
    flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center',
    borderRadius: theme.borderRadius.md, marginHorizontal: 2,
  },
  periodButtonActive: { backgroundColor: theme.colors.primary },
  periodText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  periodTextActive: { color: '#fff', fontWeight: theme.typography.weights.semibold },
  content: { flex: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: theme.spacing.md },
  statCard: {
    width: '48%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg, marginBottom: theme.spacing.md, marginHorizontal: '1%',
  },
  statValue: { fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginTop: theme.spacing.sm },
  statLabel: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 4 },
  followersCard: {
    backgroundColor: theme.colors.surface, margin: theme.spacing.md, marginTop: 0,
    padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg,
  },
  followersHeader: { flexDirection: 'row', alignItems: 'center' },
  followersTitle: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, marginLeft: theme.spacing.sm },
  followersCount: { fontSize: 48, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginVertical: theme.spacing.sm },
  growthRow: { flexDirection: 'row', alignItems: 'center' },
  growthText: { fontSize: theme.typography.sizes.sm, marginLeft: 4 },
  section: { padding: theme.spacing.md },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.md },
  streamingStats: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
  streamingStat: { flex: 1, alignItems: 'center' },
  streamingStatValue: { fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  streamingStatLabel: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 4 },
  streamingStatDivider: { width: 1, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.md },
  topGiftsList: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg },
  topGiftItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  topGiftRank: { width: 30, fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.bold, color: theme.colors.textSecondary },
  topGiftEmoji: { fontSize: 24, marginRight: theme.spacing.sm },
  topGiftName: { flex: 1, fontSize: theme.typography.sizes.base, color: theme.colors.text },
  topGiftCount: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: theme.colors.gold },
  quickActions: { flexDirection: 'row', padding: theme.spacing.md, marginBottom: theme.spacing.xxl },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginHorizontal: 4,
  },
  actionButtonText: { fontSize: theme.typography.sizes.sm, color: theme.colors.primary, fontWeight: theme.typography.weights.semibold, marginLeft: theme.spacing.sm },
});
