import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';

interface MutedUser {
  id: string;
  muted_user_id: string;
  created_at: string;
  muted_user: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

export default function MutedUsersScreen() {
  const { user } = useAuth();
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMutedUsers();
  }, []);

  const loadMutedUsers = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('muted_users')
      .select(`
        id,
        muted_user_id,
        created_at,
        muted_user:muted_user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMutedUsers(data as any);
    }
    setLoading(false);
  };

  const handleUnmute = (mutedUserId: string, username: string) => {
    Alert.alert(
      'Unmute User',
      `Unmute @${username}? You'll see their content again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmute',
          onPress: async () => {
            if (!user?.id) return;
            
            const { error } = await supabase
              .from('muted_users')
              .delete()
              .eq('user_id', user.id)
              .eq('muted_user_id', mutedUserId);

            if (!error) {
              setMutedUsers(prev => prev.filter(u => u.muted_user_id !== mutedUserId));
            }
          }
        }
      ]
    );
  };

  const renderMutedUser = ({ item }: { item: MutedUser }) => (
    <View style={styles.userItem}>
      <View style={styles.userLeft}>
        {item.muted_user?.avatar_url ? (
          <Image source={{ uri: item.muted_user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
          </View>
        )}
        <View>
          <Text style={styles.username}>@{item.muted_user?.username || 'Unknown'}</Text>
          <Text style={styles.date}>Muted {new Date(item.created_at).toLocaleDateString()}</Text>
          <Text style={styles.info}>Their content is hidden from your feed</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.unmuteButton}
        onPress={() => handleUnmute(item.muted_user_id, item.muted_user?.username || 'user')}
      >
        <Ionicons name="volume-high" size={18} color={theme.colors.primary} />
        <Text style={styles.unmuteText}>Unmute</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Muted Users</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : mutedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="volume-mute" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Muted Users</Text>
          <Text style={styles.emptyText}>Mute users to hide their content without blocking them</Text>
        </View>
      ) : (
        <>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Muted users can still follow you and see your content, but you won't see theirs.
            </Text>
          </View>
          <FlatList
            data={mutedUsers}
            renderItem={renderMutedUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
          />
        </>
      )}
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
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: { padding: theme.spacing.sm },
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
  },
  infoText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.text },
  list: { padding: theme.spacing.md },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  userLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { backgroundColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  username: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  date: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginTop: 2 },
  info: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginTop: 2 },
  unmuteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: `${theme.colors.primary}15`,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  unmuteText: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.primary },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  emptyTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginTop: theme.spacing.md },
  emptyText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: 'center' },
});
