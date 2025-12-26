import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

interface Viewer {
  id: string;
  username: string;
  avatar_url?: string;
  joined_at: string;
}

interface ViewerListModalProps {
  visible: boolean;
  streamId: string;
  hostId: string;
  onClose: () => void;
  onInviteGuest?: (viewerId: string) => void;
  onMakeModerator?: (viewerId: string) => void;
}

export default function ViewerListModal({
  visible,
  streamId,
  hostId,
  onClose,
  onInviteGuest,
  onMakeModerator,
}: ViewerListModalProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadViewers();
    }
  }, [visible, streamId]);

  const loadViewers = async () => {
    setLoading(true);
    try {
      // In a real app, you'd have a stream_viewers table
      // For demo, we'll show some mock viewers
      const mockViewers: Viewer[] = [
        {
          id: 'viewer-1',
          username: 'ComedyFan123',
          joined_at: new Date().toISOString(),
        },
        {
          id: 'viewer-2',
          username: 'RoastLover',
          joined_at: new Date().toISOString(),
        },
        {
          id: 'viewer-3',
          username: 'StreamWatcher',
          joined_at: new Date().toISOString(),
        },
      ];
      
      setViewers(mockViewers);
    } catch (error) {
      console.error('Load viewers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteGuest = (viewer: Viewer) => {
    Alert.alert(
      'Invite to Join Stream',
      `Invite ${viewer.username} to join as a guest?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Invite',
          onPress: () => {
            onInviteGuest?.(viewer.id);
            Alert.alert('Invite Sent', `${viewer.username} has been invited!`);
          },
        },
      ]
    );
  };

  const handleMakeModerator = (viewer: Viewer) => {
    Alert.alert(
      'Make Moderator',
      `Make ${viewer.username} a moderator? They'll be able to delete messages and timeout users.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            onMakeModerator?.(viewer.id);
            Alert.alert('Success', `${viewer.username} is now a moderator!`);
          },
        },
      ]
    );
  };

  const filteredViewers = viewers.filter((v) =>
    v.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Text style={styles.viewerName}>{item.username}</Text>
          <Text style={styles.viewerTime}>
            Watching • {new Date(item.joined_at).toLocaleTimeString()}
          </Text>
        </View>
      </View>
      <View style={styles.viewerActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleInviteGuest(item)}
        >
          <Ionicons name="person-add" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleMakeModerator(item)}
        >
          <Ionicons name="shield" size={20} color={theme.colors.success} />
        </TouchableOpacity>
      </View>
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
          <Text style={styles.headerTitle}>Viewers</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
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
        </View>

        {/* Stats */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Ionicons name="eye" size={18} color={theme.colors.primary} />
            <Text style={styles.statText}>{viewers.length} watching</Text>
          </View>
        </View>

        {/* Viewer List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredViewers}
            renderItem={renderViewer}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={60} color={theme.colors.textSecondary} />
                <Text style={styles.emptyText}>No viewers yet</Text>
              </View>
            }
          />
        )}
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
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    paddingVertical: theme.spacing.md,
    marginLeft: theme.spacing.sm,
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
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
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  viewerDetails: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  viewerName: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  viewerTime: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  viewerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});
