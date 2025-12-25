import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - theme.spacing.md * 3) / 2;

interface Replay {
  id: string;
  stream_id: string;
  title: string;
  thumbnail_url?: string;
  duration_seconds: number;
  view_count: number;
  created_at: string;
  creator: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export default function ReplaysScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [replays, setReplays] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'following' | 'mine'>('all');

  useEffect(() => {
    loadReplays();
  }, [filter]);

  const loadReplays = async () => {
    try {
      let query = supabase
        .from('stream_replays')
        .select(`
          id,
          stream_id,
          title,
          thumbnail_url,
          duration_seconds,
          view_count,
          created_at,
          creator:creator_id (id, username, avatar_url)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === 'mine' && user?.id) {
        query = query.eq('creator_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      setReplays(data?.map((r: any) => ({ ...r, creator: r.creator })) || []);
    } catch (error) {
      console.error('Error loading replays:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const renderReplay = ({ item }: { item: Replay }) => (
    <TouchableOpacity
      style={styles.replayCard}
      onPress={() => router.push(`/replays/${item.id}`)}
    >
      <View style={styles.thumbnailContainer}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="play-circle" size={40} color={theme.colors.textSecondary} />
          </View>
        )}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(item.duration_seconds)}</Text>
        </View>
      </View>
      <View style={styles.replayInfo}>
        <Text style={styles.replayTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.creatorRow}>
          <View style={styles.creatorAvatar}>
            <Text style={styles.creatorAvatarText}>
              {item.creator?.username?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.creatorName}>{item.creator?.username}</Text>
        </View>
        <View style={styles.statsRow}>
          <Ionicons name="eye" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.statsText}>{formatViews(item.view_count)}</Text>
          <Text style={styles.statsDot}>•</Text>
          <Text style={styles.statsText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Replays</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(['all', 'following', 'mine'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'following' ? 'Following' : 'My Replays'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : replays.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-off-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Replays</Text>
          <Text style={styles.emptyText}>Replays will appear here after streams end</Text>
        </View>
      ) : (
        <FlatList
          data={replays}
          keyExtractor={(item) => item.id}
          renderItem={renderReplay}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              loadReplays();
            }} />
          }
        />
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
  filters: { flexDirection: 'row', padding: theme.spacing.md, backgroundColor: theme.colors.surface },
  filterButton: {
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.surfaceLight, marginRight: theme.spacing.sm,
  },
  filterButtonActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: theme.typography.weights.semibold },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  emptyTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginTop: theme.spacing.lg },
  emptyText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: 'center' },
  listContent: { padding: theme.spacing.md },
  columnWrapper: { justifyContent: 'space-between' },
  replayCard: { width: CARD_WIDTH, marginBottom: theme.spacing.md },
  thumbnailContainer: { width: '100%', aspectRatio: 16 / 9, borderRadius: theme.borderRadius.lg, overflow: 'hidden', backgroundColor: theme.colors.surface },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceLight },
  durationBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  durationText: { color: '#fff', fontSize: 11, fontWeight: theme.typography.weights.semibold },
  replayInfo: { padding: theme.spacing.sm },
  replayTitle: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs },
  creatorAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  creatorAvatarText: { fontSize: 10, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  creatorName: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginLeft: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statsText: { fontSize: 11, color: theme.colors.textSecondary, marginLeft: 4 },
  statsDot: { marginHorizontal: 4, color: theme.colors.textSecondary },
});
