import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';

// Demo data - in production this would come from user_sessions table
const DEMO_SESSIONS = [
  { id: '1', device: 'Android Phone', type: 'mobile', location: 'New York, US', lastActive: '2 minutes ago', isCurrent: true },
  { id: '2', device: 'Chrome on Windows', type: 'web', location: 'Los Angeles, US', lastActive: '3 days ago', isCurrent: false },
];

export default function SessionsScreen() {
  const { user } = useAuth();

  const handleLogoutSession = (sessionId: string, device: string) => {
    Alert.alert(
      'Log Out Device',
      `Log out from "${device}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            // In production: delete session from database
            Alert.alert('Success', 'Device logged out successfully');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Sessions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Manage devices logged into your account. If you see an unfamiliar device, log it out immediately and change your password.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Devices ({DEMO_SESSIONS.length})</Text>
          {DEMO_SESSIONS.map((session) => (
            <View key={session.id} style={styles.sessionItem}>
              <View style={styles.sessionLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={session.type === 'mobile' ? 'phone-portrait' : 'desktop'}
                    size={24}
                    color={session.isCurrent ? theme.colors.success : theme.colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.deviceHeader}>
                    <Text style={styles.deviceName}>{session.device}</Text>
                    {session.isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.location}>{session.location}</Text>
                  <Text style={styles.lastActive}>Active {session.lastActive}</Text>
                </View>
              </View>
              {!session.isCurrent && (
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={() => handleLogoutSession(session.id, session.device)}
                >
                  <Ionicons name="log-out" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: { padding: theme.spacing.sm },
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1 },
  infoCard: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
  },
  infoText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.text, lineHeight: 18 },
  section: { marginTop: theme.spacing.md },
  sectionTitle: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sessionLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: 4 },
  deviceName: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  currentBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.sm,
  },
  currentText: { fontSize: theme.typography.sizes.xs, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  location: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginBottom: 2 },
  lastActive: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
