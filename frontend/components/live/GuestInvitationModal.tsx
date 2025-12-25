import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

interface GuestInvitationModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  hostUsername: string;
  streamTitle: string;
  invitationId?: string;
}

export default function GuestInvitationModal({
  visible,
  onAccept,
  onDecline,
  hostUsername,
  streamTitle,
  invitationId,
}: GuestInvitationModalProps) {
  const [countdown, setCountdown] = useState(20);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setCountdown(20);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleDecline();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [visible]);

  const handleAccept = async () => {
    setLoading(true);
    try {
      if (invitationId) {
        await supabase
          .from('stream_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitationId);
      }
      onAccept();
    } catch (error) {
      console.error('Accept error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    try {
      if (invitationId) {
        await supabase
          .from('stream_invitations')
          .update({ status: 'declined' })
          .eq('id', invitationId);
      }
      onDecline();
    } catch (error) {
      console.error('Decline error:', error);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="videocam" size={48} color={theme.colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Live Stream Invitation</Text>

          {/* Message */}
          <Text style={styles.message}>
            <Text style={styles.hostName}>@{hostUsername}</Text> has invited you to join their live
            stream!
          </Text>

          <Text style={styles.streamTitle}>"{streamTitle}"</Text>

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
            <Text style={styles.countdownLabel}>seconds to respond</Text>
          </View>

          {/* Warning */}
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={20} color={theme.colors.warning} />
            <Text style={styles.warningText}>
              You will be visible to all viewers on camera
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton, loading && styles.buttonDisabled]}
              onPress={handleAccept}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={theme.colors.text} />
                  <Text style={styles.buttonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  hostName: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  streamTitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  countdownContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: theme.colors.primaryLight,
  },
  countdownText: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  countdownLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  warningText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.warning,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  declineButton: {
    backgroundColor: theme.colors.surfaceLight,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
});
