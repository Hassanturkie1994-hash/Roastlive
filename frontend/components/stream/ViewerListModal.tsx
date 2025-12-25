import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

interface Viewer {
  id: string;
  username: string;
  avatar_url?: string;
  is_guest: boolean;
}

interface ViewerListModalProps {
  visible: boolean;
  onClose: () => void;
  viewers: Viewer[];
  onInviteGuest: (viewerId: string) => void;
  maxGuests: number;
  currentGuestCount: number;
  isSeatsLocked: boolean;
}

export default function ViewerListModal({
  visible,
  onClose,
  viewers,
  onInviteGuest,
  maxGuests,
  currentGuestCount,
  isSeatsLocked,
}: ViewerListModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredViewers = viewers.filter(v =>
    v.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canInviteMore = currentGuestCount < maxGuests && !isSeatsLocked;

  const renderViewer = ({ item }: { item: Viewer }) => (
    <View style={styles.viewerItem}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {item.username.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.viewerInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        {item.is_guest && (
          <View style={styles.guestBadge}>
            <Text style={styles.guestBadgeText}>GUEST</Text>
          </View>
        )}
      </View>
      {!item.is_guest && canInviteMore && (
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => onInviteGuest(item.id)}
        >
          <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      )}
      {item.is_guest && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Viewers ({viewers.length})</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.guestInfo}>
            <Text style={styles.guestInfoText}>
              Guests: {currentGuestCount}/{maxGuests}
            </Text>
            {isSeatsLocked && (
              <View style={styles.lockedBadge}>
                <Ionicons name="lock-closed" size={14} color={theme.colors.warning} />
                <Text style={styles.lockedText}>Seats Locked</Text>
              </View>
            )}
          </View>

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

          <FlatList
            data={filteredViewers}
            renderItem={renderViewer}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent=(
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.emptyText}>No viewers yet</Text>
              </View>
            )
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '70%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  guestInfoText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.warning}20`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  lockedText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.warning,
    marginLeft: theme.spacing.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  list: {
    padding: theme.spacing.md,
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.md,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  viewerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  guestBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
  },
  guestBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: `${theme.colors.primary}20`,
    borderRadius: theme.borderRadius.full,
  },
  inviteButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: `${theme.colors.live}20`,
    borderRadius: theme.borderRadius.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.live,
    marginRight: theme.spacing.xs,
  },
  liveText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.live,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});