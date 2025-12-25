import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

interface Viewer {
  id: string;
  username: string;
  avatar_url?: string;
  is_moderator: boolean;
}

interface StreamModeratorModalProps {
  visible: boolean;
  onClose: () => void;
  streamId: string;
  onModeratorAdded?: (userId: string) => void;
  onModeratorRemoved?: (userId: string) => void;
}

export default function StreamModeratorModal({
  visible,
  onClose,
  streamId,
  onModeratorAdded,
  onModeratorRemoved,
}: StreamModeratorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [filteredViewers, setFilteredViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (visible && streamId) {
      loadViewers();
    }
  }, [visible, streamId]);

  useEffect(() => {
    // Filter viewers by search query
    if (searchQuery.trim()) {
      const filtered = viewers.filter((v) =>
        v.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredViewers(filtered);
    } else {
      setFilteredViewers(viewers);
    }
  }, [searchQuery, viewers]);

  const loadViewers = async () => {
    setLoading(true);
    try {
      // Get stream viewers (from stream_presence table)
      const { data: presenceData, error: presenceError } = await supabase
        .from('stream_presence')
        .select('user_id')
        .eq('stream_id', streamId)
        .eq('is_active', true);

      if (presenceError) throw presenceError;

      const viewerIds = presenceData?.map((p) => p.user_id) || [];

      if (viewerIds.length === 0) {
        setViewers([]);
        setLoading(false);
        return;
      }

      // Get user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', viewerIds);

      if (profilesError) throw profilesError;

      // Get current moderators for this stream
      const { data: moderators, error: modsError } = await supabase
        .from('stream_moderators')
        .select('user_id')
        .eq('stream_id', streamId)
        .eq('is_active', true);

      if (modsError) throw modsError;

      const modIds = new Set(moderators?.map((m) => m.user_id) || []);

      // Combine data
      const viewerList: Viewer[] = (profiles || []).map((profile) => ({
        id: profile.id,
        username: profile.username || 'Unknown',
        avatar_url: profile.avatar_url,
        is_moderator: modIds.has(profile.id),
      }));

      // Sort: moderators first, then alphabetically
      viewerList.sort((a, b) => {
        if (a.is_moderator && !b.is_moderator) return -1;
        if (!a.is_moderator && b.is_moderator) return 1;
        return a.username.localeCompare(b.username);
      });

      setViewers(viewerList);
    } catch (error) {
      console.error('Error loading viewers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModerator = async (viewer: Viewer) => {
    setActionLoading(viewer.id);
    try {
      if (viewer.is_moderator) {
        // Remove moderator
        const { error } = await supabase
          .from('stream_moderators')
          .update({ is_active: false, removed_at: new Date().toISOString() })
          .eq('stream_id', streamId)
          .eq('user_id', viewer.id);

        if (error) throw error;

        // Update local state
        setViewers(viewers.map((v) =>
          v.id === viewer.id ? { ...v, is_moderator: false } : v
        ));

        onModeratorRemoved?.(viewer.id);
      } else {
        // Add moderator
        const { error } = await supabase
          .from('stream_moderators')
          .upsert({
            stream_id: streamId,
            user_id: viewer.id,
            is_active: true,
            assigned_at: new Date().toISOString(),
          });

        if (error) throw error;

        // Update local state
        setViewers(viewers.map((v) =>
          v.id === viewer.id ? { ...v, is_moderator: true } : v
        ));

        onModeratorAdded?.(viewer.id);
      }
    } catch (error) {
      console.error('Error toggling moderator:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const renderViewer = ({ item }: { item: Viewer }) => (
    <View style={styles.viewerItem}>
      <View style={styles.viewerInfo}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.viewerDetails}>
          <Text style={styles.username}>{item.username}</Text>
          {item.is_moderator && (
            <View style={styles.modBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#fff" />
              <Text style={styles.modBadgeText}>MOD</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.actionButton,
          item.is_moderator ? styles.removeButton : styles.addButton,
        ]}
        onPress={() => handleToggleModerator(item)}
        disabled={actionLoading === item.id}
      >
        {actionLoading === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons
              name={item.is_moderator ? 'remove-circle' : 'add-circle'}
              size={18}
              color="#fff"
            />
            <Text style={styles.actionButtonText}>
              {item.is_moderator ? 'Remove' : 'Make Mod'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Stream Moderators</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search viewers..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoBar}>
          <Ionicons name="information-circle" size={18} color={theme.colors.info} />
          <Text style={styles.infoText}>
            Moderators can mute, timeout, and remove viewers from your stream
          </Text>
        </View>

        {/* Viewer List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading viewers...</Text>
          </View>
        ) : filteredViewers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No viewers found' : 'No viewers in stream yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Viewers will appear here once they join'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredViewers}
            keyExtractor={(item) => item.id}
            renderItem={renderViewer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Stats */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{viewers.length}</Text>
            <Text style={styles.statLabel}>Viewers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {viewers.filter((v) => v.is_moderator).length}
            </Text>
            <Text style={styles.statLabel}>Moderators</Text>
          </View>
        </View>
      </View>
    </Modal>
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
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.info}15`,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.info,
    marginLeft: theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  listContent: {
    padding: theme.spacing.md,
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  viewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  viewerDetails: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  username: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  modBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  modBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minWidth: 100,
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: theme.colors.success,
  },
  removeButton: {
    backgroundColor: theme.colors.error,
  },
  actionButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: '#fff',
    marginLeft: theme.spacing.xs,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
});
