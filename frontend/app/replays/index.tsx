import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Replay {
  id: string;
  stream_id: string;
  url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  view_count: number;
  created_at: string;
  stream?: {
    title: string;
    host_id: string;
  };
}

export default function ReplaysScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [replays, setReplays] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReplays();
  }, []);

  const loadReplays = async () => {
    try {
      const { data } = await supabase
        .from('replays')
        .select(`
          *,
          stream:streams (title, host_id)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setReplays(data || []);
    } catch (error) {
      console.error('Load replays error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderReplay = ({ item }: { item: Replay }) => (
    <TouchableOpacity
      style={styles.replayCard}
      onPress={() => router.push(`/replay/${item.id}`)}
    >
      <View style={styles.thumbnail}>
        <Ionicons name="play-circle" size={48} color="#fff" />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(item.duration_seconds)}</Text>
        </View>
      </View>
      <View style={styles.replayInfo}>
        <Text style={styles.replayTitle} numberOfLines={2}>
          {item.stream?.title || 'Untitled Stream'}
        </Text>
        <View style={styles.replayMeta}>
          <Ionicons name="eye-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.viewCount}>{item.view_count} views</Text>
          <Text style={styles.replayDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Replays</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={replays}
        renderItem={renderReplay}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="videocam-off-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No replays available</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  list: { padding: theme.spacing.md },
  replayCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  thumbnail: {
    height: 200,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  durationText: { fontSize: theme.typography.sizes.xs, color: '#fff', fontWeight: theme.typography.weights.bold },
  replayInfo: { padding: theme.spacing.md },
  replayTitle: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text, marginBottom: theme.spacing.sm },
  replayMeta: { flexDirection: 'row', alignItems: 'center' },
  viewCount: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginLeft: 4, marginRight: theme.spacing.md },
  replayDate: { fontSize: theme.typography.sizes.xs, color: theme.colors.textDisabled },
  emptyState: { alignItems: 'center', padding: theme.spacing.xxl, marginTop: theme.spacing.xxl },
  emptyText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
});
