import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface TrendingStream {
  id: string;
  host_username: string;
  host_avatar?: string;
  title: string;
  viewer_count: number;
  rank_score: number;
  thumbnail_url?: string;
}

interface TrendingCreator {
  id: string;
  username: string;
  avatar_url?: string;
  followers_count: number;
  rank_score: number;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'streams' | 'creators'>('streams');
  const [trendingStreams] = useState<TrendingStream[]>([]);
  const [trendingCreators] = useState<TrendingCreator[]>([]);

  const renderStream = ({ item }: { item: TrendingStream }) => (
    <TouchableOpacity style={styles.streamCard}>
      <View style={styles.streamThumbnail}>
        <Ionicons name="videocam" size={48} color={theme.colors.textSecondary} />
        <View style={styles.livebadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.hostName}>@{item.host_username}</Text>
        <View style={styles.streamMeta}>
          <Ionicons name="eye" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.viewerCount}>{item.viewer_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCreator = ({ item }: { item: TrendingCreator }) => (
    <TouchableOpacity style={styles.creatorCard}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.creatorAvatar} />
      ) : (
        <View style={[styles.creatorAvatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.creatorUsername}>@{item.username}</Text>
      <Text style={styles.creatorFollowers}>{item.followers_count} followers</Text>
      <TouchableOpacity style={styles.followButton}>
        <Text style={styles.followButtonText}>Follow</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'streams' && styles.tabActive]}
          onPress={() => setSelectedTab('streams')}
        >
          <Ionicons
            name="flame"
            size={20}
            color={selectedTab === 'streams' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, selectedTab === 'streams' && styles.tabTextActive]}>
            Trending Streams
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'creators' && styles.tabActive]}
          onPress={() => setSelectedTab('creators')}
        >
          <Ionicons
            name="people"
            size={20}
            color={selectedTab === 'creators' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, selectedTab === 'creators' && styles.tabTextActive]}>
            Trending Creators
          </Text>
        </TouchableOpacity>
      </View>

      {selectedTab === 'streams' ? (
        <FlatList
          data={trendingStreams}
          renderItem={renderStream}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.streamList}
          ListEmptyComponent=(
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No trending streams right now</Text>
            </View>
          )
        />
      ) : (
        <FlatList
          data={trendingCreators}
          renderItem={renderCreator}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={styles.creatorList}
          ListEmptyComponent=(
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No trending creators right now</Text>
            </View>
          )
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xxl + 10,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  tabActive: {
    backgroundColor: `${theme.colors.primary}20`,
  },
  tabText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  streamList: {
    padding: theme.spacing.sm,
  },
  streamCard: {
    flex: 1,
    margin: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  streamThumbnail: {
    height: 120,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  livebadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.live,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  streamInfo: {
    padding: theme.spacing.sm,
  },
  streamTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  hostName: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  streamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  viewerCount: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  creatorList: {
    padding: theme.spacing.sm,
  },
  creatorCard: {
    flex: 1,
    margin: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: theme.spacing.sm,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  creatorUsername: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  creatorFollowers: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  followButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  followButtonText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});