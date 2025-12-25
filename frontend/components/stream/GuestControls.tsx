import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

interface GuestControlsProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
}

export default function GuestControls({
  isMicOn,
  isCameraOn,
  onToggleMic,
  onToggleCamera,
  onLeave,
}: GuestControlsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.controlButton, !isMicOn && styles.controlButtonOff]}
        onPress={onToggleMic}
      >
        <Ionicons
          name={isMicOn ? 'mic' : 'mic-off'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlButton, !isCameraOn && styles.controlButtonOff]}
        onPress={onToggleCamera}
      >
        <Ionicons
          name={isCameraOn ? 'videocam' : 'videocam-off'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.leaveButton} onPress={onLeave}>
        <Ionicons name="exit-outline" size={24} color="#fff" />
        <Text style={styles.leaveButtonText}>Leave</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.borderRadius.full,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  controlButtonOff: {
    backgroundColor: theme.colors.error,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.full,
    marginLeft: theme.spacing.md,
  },
  leaveButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: '#fff',
    marginLeft: theme.spacing.xs,
  },
});