import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Follower {
  id: string;
  follower_id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  is_following_back: boolean;
}

export default function FollowersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const userId = params.userId || user?.id;
  
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowers();
  }, []);

  const loadFollowers = async () => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          id,
          follower_id,
          profiles:follower_id (
            id,
            username,
            avatar_url,
            full_name
          )
        `)
        .eq('following_id', userId);

      if (error) throw error;

      // Check if current user follows them back
      const followerIds = data?.map((f: any) => f.follower_id) || [];
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id)
        .in('following_id', followerIds);

      const followingIds = new Set(following?.map((f: any) => f.following_id) || []);

      const formattedFollowers = data?.map((f: any) => ({
        id: f.id,
        follower_id: f.follower_id,
        username: f.profiles.username,
        avatar_url: f.profiles.avatar_url,
        full_name: f.profiles.full_name,
        is_following_back: followingIds.has(f.follower_id),
      })) || [];

      setFollowers(formattedFollowers);
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (followerId: string, isFollowing: boolean) => {
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user?.id)
          .eq('following_id', followerId);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: user?.id,
            following_id: followerId,
          });
      }

      // Update local state
      setFollowers(prev =>
        prev.map(f =>
          f.follower_id === followerId
            ? { ...f, is_following_back: !isFollowing }
            : f
        )
      );
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const renderFollower = ({ item }: { item: Follower }) => (
    <TouchableOpacity
      style={styles.followerItem}
      onPress={() => router.push(`/profile/${item.follower_id}` as any)}
    >
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {item.username?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
      )}
      <View style={styles.followerInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        {item.full_name && <Text style={styles.fullName}>{item.full_name}</Text>}
      </View>
      {item.follower_id !== user?.id && (
        <TouchableOpacity
          style={[
            styles.followButton,
            item.is_following_back && styles.followingButton,
          ]}
          onPress={() => handleFollow(item.follower_id, item.is_following_back)}
        >
          <Text
            style={[
              styles.followButtonText,
              item.is_following_back && styles.followingButtonText,
            ]}
          >
            {item.is_following_back ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Followers</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : followers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>No followers yet</Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          renderItem={renderFollower}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  list: {
    padding: theme.spacing.md,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: theme.spacing.md,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  followerInfo: {
    flex: 1,
  },
  username: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  fullName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  followButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: '#fff',
  },
  followingButtonText: {
    color: theme.colors.text,
  },
});