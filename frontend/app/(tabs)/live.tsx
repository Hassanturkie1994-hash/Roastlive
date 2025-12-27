import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import StreamCard from '../../components/stream/StreamCard';
import { supabase } from '../../lib/supabase';
import BattleQueue from '../../components/battle/BattleQueue';

interface Stream {
  id: string;
  host_id: string;
  title: string;
  channel_name: string;
  is_live: boolean;
  viewer_count: number;
  started_at: string;
  host_username?: string;
}

export default function Live() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'discover' | 'following'>('discover');
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStreams = async () => {
    try {
      // Load active streams from Supabase
      const { data, error } = await supabase
        .from('streams')
        .select(`
          *,
          host:profiles!host_id(username, avatar_url)
        `)
        .eq('is_live', true)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedStreams = (data || []).map((stream: any) => ({
        id: stream.id,
        host_id: stream.host_id,
        title: stream.title,
        channel_name: stream.channel_name,
        is_live: stream.is_live,
        viewer_count: stream.viewer_count || 0,
        started_at: stream.started_at,
        host_username: stream.host?.[0]?.username || 'Unknown',
      }));

      setStreams(formattedStreams);
    } catch (error) {
      console.error('Load streams error:', error);
      setStreams([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStreams();
    const interval = setInterval(loadStreams, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStreams();
  }, []);

  const handleGoLive = () => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }
    // FIXED: Navigate to pre-live-setup instead of going live directly
    router.push('/pre-live-setup');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'discover' && (
            <View style={styles.streamsGrid}>
              {streams.length > 0 ? (
                streams.map((stream) => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                    onPress={() => router.push(`/(tabs)/live/viewer/${stream.id}`)}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="videocam-off-outline" size={64} color={theme.colors.textSecondary} />
                  <Text style={styles.emptyText}>No live streams right now</Text>
                  <Text style={styles.emptySubtext}>Check back later or go live yourself!</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'following' && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No one you follow is live</Text>
              <Text style={styles.emptySubtext}>Start following creators to see their streams here</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Battle Queue Component */}
      {user && <BattleQueue />}

      {/* Go Live Button */}
      <TouchableOpacity style={styles.goLiveButton} onPress={handleGoLive}>
        <Ionicons name="videocam" size={28} color="#fff" />
        <Text style={styles.goLiveText}>Go Live</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
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
    flex: 1,
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  headerActions: { flexDirection: 'row', gap: theme.spacing.sm },
  searchButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: theme.colors.primary },
  tabText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
  },
  activeTabText: { color: theme.colors.primary },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  streamsGrid: {
    padding: theme.spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl * 2,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  goLiveButton: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  goLiveText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
});
