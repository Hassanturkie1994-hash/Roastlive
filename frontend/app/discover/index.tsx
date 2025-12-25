import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', name: 'All', emoji: '🔥' },
  { id: 'roast', name: 'Roast', emoji: '🎤' },
  { id: 'comedy', name: 'Comedy', emoji: '😂' },
  { id: 'drama', name: 'Drama', emoji: '🎭' },
  { id: 'debate', name: 'Debate', emoji: '💬' },
  { id: 'chill', name: 'Chill', emoji: '😎' },
  { id: 'music', name: 'Music', emoji: '🎵' },
];

interface LiveStream {
  id: string;
  title: string;
  host_id: string;
  host_username: string;
  host_avatar?: string;
  viewer_count: number;
  category: string;
  is_battle: boolean;
  thumbnail_url?: string;
}

interface Creator {
  id: string;
  username: string;
  avatar_url?: string;
  follower_count: number;
  is_live: boolean;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadContent();
  }, [selectedCategory]);

  const loadContent = async () => {
    try {
      // Load live streams (mock data for demo)
      const mockStreams: LiveStream[] = [
        { id: '1', title: 'Epic Roast Battle Tonight! 🔥', host_id: '1', host_username: 'RoastKing', viewer_count: 1243, category: 'roast', is_battle: true },
        { id: '2', title: 'Comedy Hour - Stand Up Session', host_id: '2', host_username: 'FunnyGuy', viewer_count: 856, category: 'comedy', is_battle: false },
        { id: '3', title: 'Drama Queens Unite', host_id: '3', host_username: 'DramaQueen', viewer_count: 432, category: 'drama', is_battle: false },
        { id: '4', title: '1v1 Roast Championship', host_id: '4', host_username: 'ChampRoaster', viewer_count: 2100, category: 'roast', is_battle: true },
        { id: '5', title: 'Chill Vibes Only', host_id: '5', host_username: 'ChillMaster', viewer_count: 324, category: 'chill', is_battle: false },
        { id: '6', title: 'Hot Take Debate Night', host_id: '6', host_username: 'DebateKing', viewer_count: 567, category: 'debate', is_battle: true },
      ];

      const filtered = selectedCategory === 'all' 
        ? mockStreams 
        : mockStreams.filter(s => s.category === selectedCategory);
      
      setLiveStreams(filtered);

      // Load trending creators
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .limit(10);

      setTrendingCreators((creators || []).map(c => ({
        ...c,
        follower_count: Math.floor(Math.random() * 10000),
        is_live: Math.random() > 0.7,
      })));
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatViewers = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const renderStreamCard = ({ item }: { item: LiveStream }) => (
    <TouchableOpacity
      style={styles.streamCard}
      onPress={() => router.push(`/stream/${item.id}`)}
    >
      <View style={styles.thumbnailContainer}>
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="videocam" size={32} color={theme.colors.textSecondary} />
        </View>
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
        <View style={styles.viewerBadge}>
          <Ionicons name="eye" size={12} color="#fff" />
          <Text style={styles.viewerText}>{formatViewers(item.viewer_count)}</Text>
        </View>
        {item.is_battle && (
          <View style={styles.battleBadge}>
            <Ionicons name="flame" size={12} color="#fff" />
            <Text style={styles.battleText}>BATTLE</Text>
          </View>
        )}
      </View>
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.hostRow}>
          <View style={styles.hostAvatar}>
            <Text style={styles.hostAvatarText}>{item.host_username.charAt(0)}</Text>
          </View>
          <Text style={styles.hostName}>{item.host_username}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCreator = ({ item }: { item: Creator }) => (
    <TouchableOpacity
      style={styles.creatorCard}
      onPress={() => router.push(`/user/${item.id}`)}
    >
      <View style={styles.creatorAvatarContainer}>
        <View style={[styles.creatorAvatar, item.is_live && styles.creatorAvatarLive]}>
          <Text style={styles.creatorAvatarText}>
            {item.username?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        {item.is_live && <View style={styles.liveIndicator} />}
      </View>
      <Text style={styles.creatorName} numberOfLines={1}>{item.username}</Text>
      <Text style={styles.creatorFollowers}>{formatViewers(item.follower_count)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search streams, creators..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadContent();
          }} />
        }
      >
        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[
                styles.categoryText,
                selectedCategory === cat.id && styles.categoryTextActive,
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Trending Creators */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Creators</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={trendingCreators}
            keyExtractor={(item) => item.id}
            renderItem={renderCreator}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.creatorsScroll}
          />
        </View>

        {/* Live Now */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔴 Live Now</Text>
            <Text style={styles.liveCount}>{liveStreams.length} streams</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : liveStreams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="videocam-off-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No live streams in this category</Text>
            </View>
          ) : (
            <View style={styles.streamsGrid}>
              {liveStreams.map((stream) => (
                <View key={stream.id} style={{ width: '50%' }}>
                  {renderStreamCard({ item: stream })}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xxl + 10, paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: { fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceLight,
    marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.lg,
  },
  searchInput: { flex: 1, fontSize: theme.typography.sizes.base, color: theme.colors.text, marginLeft: theme.spacing.sm },
  content: { flex: 1 },
  categoriesScroll: { marginBottom: theme.spacing.md },
  categoriesContent: { paddingHorizontal: theme.spacing.md },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full, marginRight: theme.spacing.sm,
  },
  categoryChipActive: { backgroundColor: theme.colors.primary },
  categoryEmoji: { fontSize: 16, marginRight: 4 },
  categoryText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  categoryTextActive: { color: '#fff', fontWeight: theme.typography.weights.semibold },
  section: { marginBottom: theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  seeAllText: { fontSize: theme.typography.sizes.sm, color: theme.colors.primary },
  liveCount: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  creatorsScroll: { paddingHorizontal: theme.spacing.md },
  creatorCard: { alignItems: 'center', marginRight: theme.spacing.lg, width: 70 },
  creatorAvatarContainer: { position: 'relative' },
  creatorAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  creatorAvatarLive: { borderWidth: 3, borderColor: theme.colors.error },
  creatorAvatarText: { fontSize: 24, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  liveIndicator: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.error, borderWidth: 2, borderColor: theme.colors.background },
  creatorName: { fontSize: theme.typography.sizes.sm, color: theme.colors.text, marginTop: theme.spacing.xs, textAlign: 'center' },
  creatorFollowers: { fontSize: 10, color: theme.colors.textSecondary },
  streamsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.sm },
  streamCard: { padding: theme.spacing.xs },
  thumbnailContainer: { aspectRatio: 16/9, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, overflow: 'hidden', position: 'relative' },
  thumbnailPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceLight },
  liveBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: theme.colors.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveBadgeText: { color: '#fff', fontSize: 10, fontWeight: theme.typography.weights.bold },
  viewerBadge: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  viewerText: { color: '#fff', fontSize: 10, marginLeft: 4 },
  battleBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  battleText: { color: '#000', fontSize: 10, fontWeight: theme.typography.weights.bold, marginLeft: 2 },
  streamInfo: { padding: theme.spacing.xs },
  streamTitle: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  hostRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  hostAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  hostAvatarText: { color: '#fff', fontSize: 10, fontWeight: theme.typography.weights.bold },
  hostName: { fontSize: 11, color: theme.colors.textSecondary, marginLeft: 4 },
  emptyState: { alignItems: 'center', padding: theme.spacing.xl },
  emptyText: { color: theme.colors.textSecondary, marginTop: theme.spacing.md },
});
