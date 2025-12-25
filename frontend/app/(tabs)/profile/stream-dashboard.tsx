import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

export default function StreamDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStreams: 0,
    totalViewers: 0,
    totalGiftsReceived: 0,
    totalEarnings: 0,
    avgWatchTime: 0,
    followers: 0,
  });
  const [recentStreams, setRecentStreams] = useState<any[]>([]);
  const [topGifters, setTopGifters] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load stream stats
      const { data: streams } = await supabase
        .from('streams')
        .select('*')
        .eq('host_id', user?.id)
        .order('created_at', { ascending: false });

      if (streams) {
        const totalViewers = streams.reduce((sum, s) => sum + (s.viewer_count || 0), 0);
        setStats(prev => ({
          ...prev,
          totalStreams: streams.length,
          totalViewers,
        }));
        setRecentStreams(streams.slice(0, 5));
      }

      // Load gift stats
      const { data: gifts } = await supabase
        .from('gift_transactions')
        .select('*, sender:profiles!sender_id(username)')
        .eq('receiver_id', user?.id);

      if (gifts) {
        const totalEarnings = gifts.reduce((sum, g) => sum + (g.amount || 0), 0);
        const creatorEarnings = Math.floor(totalEarnings * 0.7); // 70% to creator
        setStats(prev => ({
          ...prev,
          totalGiftsReceived: gifts.length,
          totalEarnings: creatorEarnings,
        }));

        // Calculate top gifters
        const gifterMap = new Map();
        gifts.forEach(g => {
          const username = g.sender?.username || 'Anonymous';
          gifterMap.set(username, (gifterMap.get(username) || 0) + g.amount);
        });
        const sorted = Array.from(gifterMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([username, amount]) => ({ username, amount }));
        setTopGifters(sorted);
      }

      // Load follower count
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user?.id);
      
      setStats(prev => ({ ...prev, followers: count || 0 }));

    } catch (error) {
      console.error('Load dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
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
        <Text style={styles.headerTitle}>Stream Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="videocam" size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats.totalStreams}</Text>
            <Text style={styles.statLabel}>Total Streams</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
            <Ionicons name="eye" size={24} color="#2196F3" />
            <Text style={styles.statValue}>{formatNumber(stats.totalViewers)}</Text>
            <Text style={styles.statLabel}>Total Views</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
            <Ionicons name="gift" size={24} color={theme.colors.gold} />
            <Text style={styles.statValue}>{stats.totalGiftsReceived}</Text>
            <Text style={styles.statLabel}>Gifts Received</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(0, 200, 83, 0.15)' }]}>
            <Ionicons name="cash" size={24} color={theme.colors.success} />
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {stats.totalEarnings} SEK
            </Text>
            <Text style={styles.statLabel}>Earnings (70%)</Text>
          </View>
        </View>

        {/* Follower Count */}
        <View style={styles.followerCard}>
          <View style={styles.followerInfo}>
            <Ionicons name="people" size={32} color={theme.colors.primary} />
            <View style={styles.followerText}>
              <Text style={styles.followerCount}>{formatNumber(stats.followers)}</Text>
              <Text style={styles.followerLabel}>Followers</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.viewFollowersButton}>
            <Text style={styles.viewFollowersText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Recent Streams */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Streams</Text>
          {recentStreams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="videocam-off" size={48} color={theme.colors.textDisabled} />
              <Text style={styles.emptyText}>No streams yet</Text>
              <TouchableOpacity
                style={styles.goLiveButton}
                onPress={() => router.push('/(tabs)/live/broadcast')}
              >
                <Text style={styles.goLiveText}>Go Live Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentStreams.map((stream, index) => (
              <View key={stream.id} style={styles.streamItem}>
                <View style={styles.streamIndex}>
                  <Text style={styles.streamIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.streamInfo}>
                  <Text style={styles.streamTitle} numberOfLines={1}>
                    {stream.title || 'Untitled Stream'}
                  </Text>
                  <Text style={styles.streamDate}>
                    {new Date(stream.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.streamStats}>
                  <View style={styles.streamStatItem}>
                    <Ionicons name="eye" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.streamStatText}>{stream.viewer_count || 0}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Top Gifters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Supporters</Text>
          {topGifters.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color={theme.colors.textDisabled} />
              <Text style={styles.emptyText}>No gifts received yet</Text>
            </View>
          ) : (
            topGifters.map((gifter, index) => (
              <View key={gifter.username} style={styles.gifterItem}>
                <View style={[
                  styles.gifterRank,
                  index === 0 && { backgroundColor: theme.colors.gold },
                  index === 1 && { backgroundColor: '#C0C0C0' },
                  index === 2 && { backgroundColor: '#CD7F32' },
                ]}>
                  <Text style={styles.gifterRankText}>{index + 1}</Text>
                </View>
                <Text style={styles.gifterName}>@{gifter.username}</Text>
                <Text style={styles.gifterAmount}>{gifter.amount} SEK</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
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
    backgroundColor: theme.colors.background,
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    width: '48%',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  followerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  followerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followerText: {
    marginLeft: theme.spacing.md,
  },
  followerCount: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  followerLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  viewFollowersButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewFollowersText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  goLiveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.lg,
  },
  goLiveText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  streamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  streamIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  streamIndexText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
  },
  streamInfo: {
    flex: 1,
  },
  streamTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  streamDate: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  streamStats: {
    flexDirection: 'row',
  },
  streamStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
  },
  streamStatText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  gifterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  gifterRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  gifterRankText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  gifterName: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  gifterAmount: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.gold,
  },
});
