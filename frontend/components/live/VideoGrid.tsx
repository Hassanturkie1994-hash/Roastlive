import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface Guest {
  user_id: string;
  username: string;
  is_host?: boolean;
  is_muted_audio?: boolean;
  is_muted_video?: boolean;
}

interface VideoGridProps {
  guests: Guest[];
  hostId: string;
}

export default function VideoGrid({ guests, hostId }: VideoGridProps) {
  const getLayout = () => {
    const count = guests.length;
    if (count === 1) return { columns: 1, rows: 1, tileWidth: width };
    if (count === 2) return { columns: 2, rows: 1, tileWidth: width / 2 };
    if (count <= 4) return { columns: 2, rows: 2, tileWidth: width / 2 };
    if (count <= 6) return { columns: 3, rows: 2, tileWidth: width / 3 };
    if (count <= 9) return { columns: 3, rows: 3, tileWidth: width / 3 };
    return { columns: 3, rows: 3, tileWidth: width / 3 };
  };

  const { columns, tileWidth } = getLayout();
  const tileHeight = tileWidth * 1.33; // 4:3 aspect ratio

  const renderVideoTile = (guest: Guest, index: number) => {
    const isHost = guest.user_id === hostId;

    return (
      <View
        key={guest.user_id || `empty-${index}`}
        style={[
          styles.videoTile,
          {
            width: tileWidth,
            height: tileHeight,
          },
          isHost && styles.hostTile,
        ]}
      >
        {/* Video Placeholder */}
        <View style={styles.videoPlaceholder}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={32} color="#fff" />
          </View>
        </View>

        {/* Overlay Info */}
        <View style={styles.tileOverlay}>
          {/* Username */}
          <View style={styles.usernameContainer}>
            {isHost && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>HOST</Text>
              </View>
            )}
            <Text style={styles.username} numberOfLines={1}>
              {guest.username || 'Guest'}
            </Text>
          </View>

          {/* Status Icons */}
          <View style={styles.statusContainer}>
            {guest.is_muted_audio && (
              <View style={styles.statusIcon}>
                <Ionicons name="mic-off" size={16} color="#fff" />
              </View>
            )}
            {guest.is_muted_video && (
              <View style={styles.statusIcon}>
                <Ionicons name="videocam-off" size={16} color="#fff" />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Add empty seats if less than max
  const maxGuests = 10;
  const emptySeats = Math.max(0, maxGuests - guests.length);
  const allSlots = [
    ...guests,
    ...Array(emptySeats)
      .fill(null)
      .map((_, i) => ({ user_id: `empty-${i}`, username: 'Seat Available' })),
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.grid, { width }]}>
        {allSlots.slice(0, maxGuests).map((guest, index) => renderVideoTile(guest, index))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  videoTile: {
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  hostTile: {
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hostBadge: {
    backgroundColor: theme.colors.live,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
  },
  hostBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  username: {
    fontSize: theme.typography.sizes.xs,
    color: '#fff',
    fontWeight: theme.typography.weights.medium,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusIcon: {
    marginLeft: theme.spacing.xs,
  },
});
