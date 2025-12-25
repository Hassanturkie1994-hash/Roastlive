import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

interface GuestInvitationModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  hostName: string;
  streamTitle: string;
}

export default function GuestInvitationModal({
  visible,
  onAccept,
  onDecline,
  hostName,
  streamTitle,
}: GuestInvitationModalProps) {
  const [countdown, setCountdown] = useState(20);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      setCountdown(20);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            onDecline();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      return () => clearInterval(timer);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="videocam" size={48} color={theme.colors.primary} />
          </View>

          <Text style={styles.title}>Guest Invitation</Text>
          <Text style={styles.subtitle}>@{hostName} invited you to join</Text>
          <Text style={styles.streamTitle}>"{streamTitle}"</Text>

          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={20} color={theme.colors.warning} />
            <Text style={styles.warningText}>
              You will be visible on camera to all viewers
            </Text>
          </View>

          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>Auto-decline in</Text>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
              <Ionicons name="close-circle" size={24} color={theme.colors.error} />
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.acceptButtonText}>Accept & Join</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${theme.colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  streamTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.warning}15`,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.warning,
    marginLeft: theme.spacing.sm,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  countdownText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  countdownCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.error}20`,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.sm,
  },
  declineButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.error,
    marginLeft: theme.spacing.xs,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    marginLeft: theme.spacing.sm,
  },
  acceptButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: '#fff',
    marginLeft: theme.spacing.xs,
  },
});