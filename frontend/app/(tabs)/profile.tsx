import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { postsService } from '../../services/postsService';
import { getUserXPInfo } from '../../services/xpService';
import { BADGES } from '../../utils/xpSystem';

const { width } = Dimensions.get('window');

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'stories'>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [xpInfo, setXPInfo] = useState<any>(null);
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    streams: 0,
    posts: 0,
  });

  useEffect(() => {
    loadProfile();
    loadStats();
    loadPosts();
    loadXPInfo();
  }, []);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [followersCount, followingCount, streamsCount, postsCount] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user?.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user?.id),
        supabase.from('streams').select('*', { count: 'exact', head: true }).eq('host_id', user?.id),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user?.id),
      ]);

      setStats({
        followers: followersCount.count || 0,
        following: followingCount.count || 0,
        streams: streamsCount.count || 0,
        posts: postsCount.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPosts = async () => {
    if (!user?.id) return;
    try {
      const userPosts = await postsService.getUserPosts(user.id);
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const loadXPInfo = async () => {
    if (!user?.id) return;
    try {
      const xp = await getUserXPInfo(user.id);
      setXPInfo(xp);
    } catch (error) {
      console.error('Error loading XP:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/welcome');
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
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/(tabs)/profile/settings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Info */}
        <View style={styles.profileCard}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {profile?.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <Text style={styles.username}>@{profile?.username || 'user'}</Text>
          {profile?.full_name && (
            <Text style={styles.fullName}>{profile.full_name}</Text>
          )}
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* XP & Level Display */}
          {xpInfo && (
            <View style={styles.xpSection}>
              <View style={styles.xpHeader}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>Lv. {xpInfo.level}</Text>
                </View>
                <Text style={styles.rankTitle}>{xpInfo.rankTitle}</Text>
                <TouchableOpacity onPress={() => router.push('/leaderboard')}>
                  <Ionicons name="trophy" size={20} color={theme.colors.gold} />
                </TouchableOpacity>
              </View>
              
              {/* XP Progress Bar */}
              <View style={styles.xpBarContainer}>
                <View style={styles.xpBar}>
                  <View 
                    style={[
                      styles.xpBarFill, 
                      { width: `${xpInfo.progress}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.xpText}>
                  {xpInfo.currentLevelXP.toLocaleString()} / {xpInfo.nextLevelXP.toLocaleString()} XP
                </Text>
              </View>

              {/* Badges */}
              {xpInfo.badges && xpInfo.badges.length > 0 && (
                <View style={styles.badgesContainer}>
                  <Text style={styles.badgesTitle}>Badges:</Text>
                  <View style={styles.badgesList}>
                    {xpInfo.badges.slice(0, 5).map((badgeId: string) => {
                      const badge = Object.values(BADGES).find(b => b.id === badgeId);
                      return badge ? (
                        <View key={badgeId} style={styles.badgeItem}>
                          <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                        </View>
                      ) : null;
                    })}
                    {xpInfo.badges.length > 5 && (
                      <Text style={styles.badgeMore}>+{xpInfo.badges.length - 5}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Win Streak */}
              {xpInfo.currentWinStreak > 0 && (
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={16} color={theme.colors.error} />
                  <Text style={styles.streakText}>{xpInfo.currentWinStreak} Win Streak!</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/(tabs)/profile/followers')}
          >
            <Text style={styles.statValue}>{stats.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/(tabs)/profile/following')}
          >
            <Text style={styles.statValue}>{stats.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.posts}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/(tabs)/profile/edit')}
          >
            <Ionicons name="create-outline" size={20} color={theme.colors.text} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Ionicons
              name="grid"
              size={20}
              color={activeTab === 'posts' ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stories' && styles.activeTab]}
            onPress={() => setActiveTab('stories')}
          >
            <Ionicons
              name="play-circle"
              size={20}
              color={activeTab === 'stories' ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'stories' && styles.activeTabText]}>Stories</Text>
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        {activeTab === 'posts' && (
          <View style={styles.postsGrid}>
            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={styles.emptyText}>No posts yet</Text>
                <TouchableOpacity
                  style={styles.createPostButton}
                  onPress={() => router.push('/posts/create')}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.createPostButtonText}>Create Post</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={posts}
                numColumns={3}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.postThumbnail}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.thumbnailImage} />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <Ionicons name="image" size={32} color={theme.colors.textSecondary} />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        {/* Stories Grid */}
        {activeTab === 'stories' && (
          <View style={styles.storiesGrid}>
            <View style={styles.emptyState}>
              <Ionicons name="play-circle-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No stories yet</Text>
              <TouchableOpacity
                style={styles.createPostButton}
                onPress={() => router.push('/stories/create')}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.createPostButtonText}>Create Story</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/posts/create')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
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
  headerTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  settingsButton: {
    padding: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  profileCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: theme.spacing.md,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  username: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  fullName: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  bio: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.sm,
  },
  editButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  adminButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  activeTab: {
    backgroundColor: theme.colors.primaryLight,
  },
  tabText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  postsGrid: {
    paddingHorizontal: theme.spacing.md,
  },
  postThumbnail: {
    width: (width - theme.spacing.md * 2 - 4) / 3,
    height: (width - theme.spacing.md * 2 - 4) / 3,
    margin: 1,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storiesGrid: {
    paddingHorizontal: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
    marginTop: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  createPostButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  // XP Section
  xpSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  levelBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  levelText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  rankTitle: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
  },
  xpBarContainer: {
    marginTop: theme.spacing.xs,
  },
  xpBar: {
    height: 8,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  xpText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  badgesContainer: {
    marginTop: theme.spacing.sm,
  },
  badgesTitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  badgesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgeItem: {
    marginRight: theme.spacing.xs,
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeMore: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.error}20`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
  },
  streakText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.error,
    marginLeft: 4,
  },

  },
});
