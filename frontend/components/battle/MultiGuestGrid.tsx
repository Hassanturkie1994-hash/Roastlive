import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface Guest {
  id: string;
  username: string;
  avatar_url?: string;
  isSpeaking?: boolean;
  isLocal?: boolean;
}

interface MultiGuestGridProps {
  guests: Guest[];
  teamColor: string;
  maxGuests: number; // 1, 2, 3, 4, or 5
  localCameraFacing?: CameraType;
}

export default function MultiGuestGrid({
  guests,
  teamColor,
  maxGuests,
  localCameraFacing = 'front',
}: MultiGuestGridProps) {
  // Calculate grid layout based on team size
  const getGridLayout = () => {
    switch (maxGuests) {
      case 1:
        return { rows: 1, cols: 1 };
      case 2:
        return { rows: 2, cols: 1 };
      case 3:
        return { rows: 3, cols: 1 };
      case 4:
        return { rows: 2, cols: 2 };
      case 5:
        return { rows: 3, cols: 2 }; // 2,2,1 pattern
      default:
        return { rows: 1, cols: 1 };
    }
  };

  const { rows, cols } = getGridLayout();
  const cellHeight = height * 0.5 / rows; // Half screen divided by rows

  // Fill empty slots with placeholders
  const filledGuests = [...guests];
  while (filledGuests.length < maxGuests) {
    filledGuests.push({
      id: `empty-${filledGuests.length}`,
      username: 'Waiting...',
    });
  }

  const renderGuestCell = (guest: Guest, index: number) => {
    const isLocal = guest.isLocal;
    const isEmpty = guest.id.startsWith('empty-');

    return (
      <View
        key={guest.id}
        style={[
          styles.guestCell,
          {
            height: cellHeight,
            width: cols === 2 ? '50%' : '100%',
            borderColor: teamColor,
          },
        ]}
      >
        {!isEmpty && isLocal ? (
          // Local user's camera
          <CameraView
            style={styles.cameraView}
            facing={localCameraFacing}
            mirror={localCameraFacing === 'front'}
          >
            <View style={styles.guestOverlay}>
              <View style={styles.guestInfo}>
                <Text style={styles.guestName}>{guest.username}</Text>
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>YOU</Text>
                </View>
              </View>
              {guest.isSpeaking && (
                <View style={styles.speakingIndicator}>
                  <Ionicons name="mic" size={14} color="#fff" />
                </View>
              )}
            </View>
          </CameraView>
        ) : !isEmpty ? (
          // Remote guest - placeholder (would be Agora video in production)
          <View style={[styles.guestPlaceholder, { backgroundColor: `${teamColor}30` }]}>
            <View style={[styles.guestAvatar, { backgroundColor: teamColor }]}>
              <Text style={styles.guestAvatarText}>
                {guest.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.guestOverlay}>
              <Text style={styles.guestName}>{guest.username}</Text>
              {guest.isSpeaking && (
                <View style={styles.speakingIndicator}>
                  <Ionicons name="mic" size={14} color="#fff" />
                </View>
              )}
            </View>
          </View>
        ) : (
          // Empty slot
          <View style={[styles.emptySlot, { borderColor: `${teamColor}40` }]}>
            <Ionicons name="person-add-outline" size={32} color={`${teamColor}60`} />
            <Text style={[styles.emptySlotText, { color: `${teamColor}60` }]}>Waiting...</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.grid, { flexDirection: cols === 2 ? 'row' : 'column', flexWrap: 'wrap' }]}>
        {filledGuests.map((guest, index) => renderGuestCell(guest, index))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    flex: 1,
  },
  guestCell: {
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  cameraView: {
    flex: 1,
  },
  guestPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  guestOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: '#fff',
    marginRight: theme.spacing.xs,
  },
  youBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  speakingIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    margin: 4,
    borderRadius: theme.borderRadius.md,
  },
  emptySlotText: {
    fontSize: theme.typography.sizes.sm,
    marginTop: theme.spacing.xs,
  },
});
