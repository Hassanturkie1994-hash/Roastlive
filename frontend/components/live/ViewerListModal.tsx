import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Viewer {
  user_id: string;
  username: string;
  avatar_url?: string;
}

interface ViewerListModalProps {
  visible: boolean;
  onClose: () => void;
  streamId: string;
  hostId: string;
  maxGuests?: number;
  currentGuestCount: number;
}

export default function ViewerListModal({
  visible,
  onClose,
  streamId,
  hostId,
  maxGuests = 9,
  currentGuestCount,
}: ViewerListModalProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadViewers();
    }
  }, [visible]);

  const loadViewers = async () => {
    setLoading(true);
    try {
      // In production, track viewers via presence
      // For now, get recent followers as mock viewers
      const { data: followers } = await supabase
        .from('follows')
        .select(`
          follower:profiles!follower_id(id, username, avatar_url)
        `)
        .eq('following_id', hostId)
        .limit(20);

      const viewerList: Viewer[] = followers?.map((f: any) => ({
        user_id: f.follower.id,
        username: f.follower.username,
        avatar_url: f.follower.avatar_url,
      })) || [];

      setViewers(viewerList);
    } catch (error) {
      console.error('Load viewers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const inviteGuest = async (userId: string) => {
    if (currentGuestCount >= maxGuests) {
      alert('Maximum guests reached (9/9)');
      return;
    }

    setInviting(userId);
    try {
      // Create invitation
      await supabase.from('stream_invitations').insert({
        stream_id: streamId,
        host_id: hostId,
        guest_id: userId,
        status: 'pending',
        expires_at: new Date(Date.now() + 20000).toISOString(), // 20 seconds
      });

      // Send notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'stream_invitation',
        title: 'Live Stream Invitation',
        message: 'You have been invited to join a live stream!',
        data: { stream_id: streamId },
      });

      alert('Invitation sent!');
    } catch (error) {
      console.error('Invite error:', error);
      alert('Failed to send invitation');
    } finally {
      setInviting(null);
    }
  };

  const renderViewer = ({ item }: { item: Viewer }) => (
    <View style={styles.viewerItem}>
      <View style={styles.viewerInfo}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={theme.colors.text} />
        </View>
        <Text style={styles.username}>@{item.username}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.inviteButton,
          (inviting === item.user_id || currentGuestCount >= maxGuests) &&
            styles.inviteButtonDisabled,
        ]}
        onPress={() => inviteGuest(item.user_id)}
        disabled={inviting === item.user_id || currentGuestCount >= maxGuests}
      >
        {inviting === item.user_id ? (
          <ActivityIndicator size="small" color={theme.colors.text} />
        ) : (
          <Text style={styles.inviteButtonText}>Invite</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Viewers</Text>
            <Text style={styles.subtitle}>
              {currentGuestCount}/{maxGuests} guests
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Viewers List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : viewers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={theme.colors.textDisabled} />
              <Text style={styles.emptyText}>No viewers yet</Text>
            </View>
          ) : (
            <FlatList
              data={viewers}
              renderItem={renderViewer}
              keyExtractor={(item) => item.user_id}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    flex: 1,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.md,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  loadingContainer: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyState: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  viewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  username: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  inviteButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  inviteButtonDisabled: {
    backgroundColor: theme.colors.surfaceLight,
    opacity: 0.5,
  },
  inviteButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
});
