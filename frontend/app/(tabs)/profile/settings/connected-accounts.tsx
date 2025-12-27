import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';

// Demo connected accounts
const CONNECTED_ACCOUNTS = [
  { provider: 'google', email: 'user@gmail.com', connected: true },
  { provider: 'apple', email: null, connected: false },
  { provider: 'facebook', email: null, connected: false },
];

export default function ConnectedAccountsScreen() {
  const { user } = useAuth();

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google': return 'logo-google';
      case 'apple': return 'logo-apple';
      case 'facebook': return 'logo-facebook';
      default: return 'link';
    }
  };

  const getProviderName = (provider: string) => {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  const handleToggleConnection = (provider: string, connected: boolean) => {
    if (connected) {
      Alert.alert(
        `Disconnect ${getProviderName(provider)}?`,
        'You won\'t be able to sign in with this account anymore.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disconnect', style: 'destructive', onPress: () => {
            Alert.alert('Disconnected', `${getProviderName(provider)} account disconnected`);
          }}
        ]
      );
    } else {
      Alert.alert('Connect Account', `Sign in with ${getProviderName(provider)} to link your account`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connected Accounts</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="link" size={24} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Link your social accounts for easier sign-in and account recovery options.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Connections</Text>
          {CONNECTED_ACCOUNTS.map((account, index) => (
            <View key={index} style={styles.accountItem}>
              <View style={styles.accountLeft}>
                <View style={[styles.providerIcon, account.connected && styles.providerIconConnected]}>
                  <Ionicons name={getProviderIcon(account.provider) as any} size={24} color={account.connected ? theme.colors.success : theme.colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{getProviderName(account.provider)}</Text>
                  {account.connected && account.email && (
                    <Text style={styles.email}>{account.email}</Text>
                  )}
                  <Text style={styles.status}>
                    {account.connected ? '✓ Connected' : 'Not connected'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionButton, account.connected ? styles.disconnectButton : styles.connectButton]}
                onPress={() => handleToggleConnection(account.provider, account.connected)}
              >
                <Text style={[styles.actionText, account.connected ? styles.disconnectText : styles.connectText]}>
                  {account.connected ? 'Disconnect' : 'Connect'}
                </Text>
              </TouchableOpacity>
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
  headerTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
  },
  infoText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.text },
  section: { marginTop: theme.spacing.md },
  sectionTitle: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  accountLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerIconConnected: { backgroundColor: `${theme.colors.success}15` },
  providerName: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  email: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
  status: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginTop: 4 },
  actionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  connectButton: { backgroundColor: theme.colors.primary },
  disconnectButton: { backgroundColor: `${theme.colors.error}15`, borderWidth: 1, borderColor: theme.colors.error },
  actionText: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold },
  connectText: { color: theme.colors.text },
  disconnectText: { color: theme.colors.error },
});
