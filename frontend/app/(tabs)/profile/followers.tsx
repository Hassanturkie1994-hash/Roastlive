import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface User {
  id: string;
  username: string;
  avatar_url?: string;
  is_following?: boolean;
}

export default function FollowersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const tab = (params.tab as string) || 'followers';

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(tab as any);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, [activeTab]);

  const loadUsers = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      let data: any[] = [];

      if (activeTab === 'followers') {
        const { data: followers } = await supabase
          .from('follows')
          .select(`
            follower:follower_id (id, username, avatar_url)
          `)
          .eq('following_id', user.id);
        data = followers?.map((f: any) => f.follower) || [];
      } else {
        const { data: following } = await supabase
          .from('follows')
          .select(`
            following:following_id (id, username, avatar_url)
          `)
          .eq('follower_id', user.id);
        data = following?.map((f: any) => f.following) || [];
      }

      setUsers(data.filter(Boolean));
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetId: string, isFollowing: boolean) => {
    if (!user?.id) return;

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetId);
      } else {
        await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: targetId,
        });
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetId ? { ...u, is_following: !isFollowing } : u
        )
      );
    } catch (error) {
      console.error('Error following:', error);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => router.push(`/user/${item.id}`)}
      >
        <View style={styles.avatar}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <Text style={styles.username}>{item.username}</Text>
      </TouchableOpacity>

      {item.id !== user?.id && (
        <TouchableOpacity
          style={[styles.followButton, item.is_following && styles.followingButton]}
          onPress={() => handleFollow(item.id, !!item.is_following)}
        >
          <Text style={[styles.followButtonText, item.is_following && styles.followingButtonText]}>
            {item.is_following ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeTab === 'followers' ? 'Followers' : 'Following'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.tabActive]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}>
            Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>
            {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
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
  tabs: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { flex: 1, paddingVertical: theme.spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.primary, fontWeight: theme.typography.weights.semibold },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    margin: theme.spacing.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border,
  },
  searchInput: { flex: 1, fontSize: theme.typography.sizes.base, color: theme.colors.text, marginLeft: theme.spacing.sm },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  listContent: { padding: theme.spacing.md },
  userItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.sm,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  username: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text, marginLeft: theme.spacing.md },
  followButton: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.md },
  followingButton: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  followButtonText: { color: '#fff', fontWeight: theme.typography.weights.semibold },
  followingButtonText: { color: theme.colors.text },
});
