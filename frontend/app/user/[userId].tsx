import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface UserProfile {
  id: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  is_verified?: boolean;
  follower_count: number;
  following_count: number;
  stream_count: number;
  battle_wins: number;
  battle_losses: number;
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { userId } = useLocalSearchParams();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'streams' | 'battles'>('streams');
  const [streams, setStreams] = useState<any[]>([]);

  const isOwnProfile = userId === user?.id;

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      // Get user profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      // Get follower/following counts
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      // Check if current user follows this user
      if (user?.id && !isOwnProfile) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();
        setIsFollowing(!!followData);

        // Check if blocked
        const { data: blockData } = await supabase
          .from('blocked_users')
          .select('id')
          .eq('blocker_id', user.id)
          .eq('blocked_id', userId)
          .maybeSingle();
        setIsBlocked(!!blockData);
      }

      setProfile({
        ...profileData,
        follower_count: followers || 0,
        following_count: following || 0,
        stream_count: 0,
        battle_wins: profileData.battle_wins || 0,
        battle_losses: profileData.battle_losses || 0,
      });

      // Load replays
      const { data: replays } = await supabase
        .from('stream_replays')
        .select('*')
        .eq('creator_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(12);

      setStreams(replays || []);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user?.id) return;

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        setIsFollowing(false);
        setProfile((p) => p ? { ...p, follower_count: p.follower_count - 1 } : p);
      } else {
        await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: userId,
        });
        setIsFollowing(true);
        setProfile((p) => p ? { ...p, follower_count: p.follower_count + 1 } : p);
      }
    } catch (error) {
      console.error('Error following:', error);
    }
  };

  const handleMessage = () => {
    // Create or get conversation and navigate
    router.push(`/messages/${userId}`);
  };

  const handleBlock = () => {
    Alert.alert(
      isBlocked ? 'Unblock User' : 'Block User',
      isBlocked
        ? `Unblock @${profile?.username}?`
        : `Block @${profile?.username}? They won't be able to see your content or message you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isBlocked) {
                await supabase
                  .from('blocked_users')
                  .delete()
                  .eq('blocker_id', user?.id)
                  .eq('blocked_id', userId);
              } else {
                await supabase.from('blocked_users').insert({
                  blocker_id: user?.id,
                  blocked_id: userId,
                });
              }
              setIsBlocked(!isBlocked);
            } catch (error) {
              console.error('Error blocking:', error);
            }
          },
        },
      ]
    );
  };

  const handleReport = () => {
    router.push(`/report?type=user&id=${userId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  const winRate = profile.battle_wins + profile.battle_losses > 0
    ? Math.round((profile.battle_wins / (profile.battle_wins + profile.battle_losses)) * 100)
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
        <TouchableOpacity style={styles.menuButton} onPress={() => {
          Alert.alert('Options', '', [
            { text: 'Report', onPress: handleReport },
            { text: isBlocked ? 'Unblock' : 'Block', style: 'destructive', onPress: handleBlock },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile.username?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {profile.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
              </View>
            )}
          </View>

          <Text style={styles.username}>{profile.username}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{profile.follower_count}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{profile.following_count}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.battle_wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{winRate}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={handleFollow}
              >
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                <Ionicons name="chatbubble-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'streams' && styles.tabActive]}
            onPress={() => setActiveTab('streams')}
          >
            <Ionicons name="videocam" size={20} color={activeTab === 'streams' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'streams' && styles.tabTextActive]}>Streams</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'battles' && styles.tabActive]}
            onPress={() => setActiveTab('battles')}
          >
            <Ionicons name="flame" size={20} color={activeTab === 'battles' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'battles' && styles.tabTextActive]}>Battles</Text>
          </TouchableOpacity>
        </View>

        {/* Content Grid */}
        {streams.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-off-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No streams yet</Text>
          </View>
        ) : (
          <View style={styles.streamsGrid}>
            {streams.map((stream) => (
              <TouchableOpacity
                key={stream.id}
                style={styles.streamCard}
                onPress={() => router.push(`/replays/${stream.id}`)}
              >
                <View style={styles.streamThumbnail}>
                  <Ionicons name="play-circle" size={32} color="#fff" />
                </View>
                <Text style={styles.streamTitle} numberOfLines={2}>{stream.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  errorText: { color: theme.colors.error, fontSize: theme.typography.sizes.lg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xxl + 10, paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  menuButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  profileSection: { alignItems: 'center', padding: theme.spacing.lg, backgroundColor: theme.colors.surface },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 40, fontWeight: theme.typography.weights.bold, color: '#fff' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 12 },
  username: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginTop: theme.spacing.md },
  bio: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  statsRow: { flexDirection: 'row', marginTop: theme.spacing.lg, width: '100%', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  statLabel: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
  actionButtons: { flexDirection: 'row', marginTop: theme.spacing.lg },
  followButton: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.xxl, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.lg },
  followingButton: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  followButtonText: { color: '#fff', fontWeight: theme.typography.weights.bold },
  followingButtonText: { color: theme.colors.text },
  messageButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', marginLeft: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  tabs: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { marginLeft: theme.spacing.xs, color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.primary, fontWeight: theme.typography.weights.semibold },
  emptyState: { alignItems: 'center', padding: theme.spacing.xxl },
  emptyText: { color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  streamsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 2 },
  streamCard: { width: (width - 8) / 3, margin: 1 },
  streamThumbnail: { aspectRatio: 1, backgroundColor: theme.colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  streamTitle: { fontSize: 10, color: theme.colors.textSecondary, padding: 4 },
});
