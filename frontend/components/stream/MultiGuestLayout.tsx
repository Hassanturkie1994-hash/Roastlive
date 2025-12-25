import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface Participant {
  id: string;
  user_id: string;
  username?: string;
  seat_number: number;
  is_mic_on: boolean;
  is_camera_on: boolean;
  is_host: boolean;
}

interface MultiGuestLayoutProps {
  participants: Participant[];
  maxSeats?: number;
}

export default function MultiGuestLayout({ participants, maxSeats = 10 }: MultiGuestLayoutProps) {
  const participantCount = participants.length;
  
  const getLayout = () => {
    if (participantCount === 1) return 'fullscreen';
    if (participantCount === 2) return 'split';
    if (participantCount <= 4) return 'grid-2x2';
    if (participantCount <= 6) return 'grid-2x3';
    if (participantCount <= 9) return 'grid-3x3';
    return 'grid-3x3-overflow';
  };

  const layout = getLayout();
  const emptySeats = Math.max(0, maxSeats - participantCount);

  const renderParticipantTile = (participant: Participant, index: number) => {
    const isHost = participant.is_host;
    
    return (
      <View key={participant.id} style={[
        styles.participantTile,
        layout === 'fullscreen' && styles.fullscreenTile,
        layout === 'split' && styles.splitTile,
        (layout.includes('grid')) && styles.gridTile,
        isHost && styles.hostTile,
      ]}>
        {/* Video placeholder */}
        <View style={styles.videoContainer}>
          <Ionicons name="person" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.username}>@{participant.username || `User ${index + 1}`}</Text>
        </View>

        {/* Host badge */}
        {isHost && (
          <View style={styles.hostBadge}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.hostBadgeText}>HOST</Text>
          </View>
        )}

        {/* Mic/Camera indicators */}
        <View style={styles.indicators}>
          {!participant.is_mic_on && (
            <View style={styles.indicator}>
              <Ionicons name="mic-off" size={16} color="#fff" />
            </View>
          )}
          {!participant.is_camera_on && (
            <View style={styles.indicator}>
              <Ionicons name="videocam-off" size={16} color="#fff" />
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptySeat = (index: number) => (
    <View key={`empty-${index}`} style={[styles.participantTile, styles.gridTile, styles.emptyTile]}>
      <Ionicons name="person-add-outline" size={32} color={theme.colors.textSecondary} />
      <Text style={styles.emptyText}>Empty Seat</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[
        styles.layoutContainer,
        layout === 'fullscreen' && styles.fullscreenLayout,
        layout === 'split' && styles.splitLayout,
        layout.includes('grid') && styles.gridLayout,
      ]}>
        {participants.map((participant, index) => renderParticipantTile(participant, index))}
        {Array.from({ length: Math.min(emptySeats, 9 - participantCount) }).map((_, i) => renderEmptySeat(i))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  layoutContainer: {
    flex: 1,
  },
  fullscreenLayout: {
    flexDirection: 'column',
  },
  splitLayout: {
    flexDirection: 'row',
  },
  gridLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  participantTile: {
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: '#000',
    overflow: 'hidden',
  },
  fullscreenTile: {
    width: width,
    height: height,
  },
  splitTile: {
    width: width / 2,
    height: height,
  },
  gridTile: {
    width: width / 3,
    height: height / 3,
  },
  hostTile: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  emptyTile: {
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: theme.typography.sizes.sm,
    color: '#fff',
    marginTop: theme.spacing.sm,
  },
  hostBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  hostBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: 4,
  },
  indicators: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row',
  },
  indicator: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 4,
    borderRadius: theme.borderRadius.sm,
    marginLeft: 4,
  },
  emptyText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});
