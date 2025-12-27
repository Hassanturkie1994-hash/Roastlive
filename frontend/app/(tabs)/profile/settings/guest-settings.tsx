import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService, UserSettings } from '../../../../services/settingsService';

export default function GuestSettingsScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Partial<UserSettings>>({});
  const [maxGuests, setMaxGuests] = useState('9');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user?.id) return;
    const data = await settingsService.getSettings(user.id);
    if (data) {
      setSettings(data);
      if (data.max_guests) {
        setMaxGuests(data.max_guests.toString());
      }
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!user?.id) return;
    setSettings(prev => ({ ...prev, [key]: value }));
    await settingsService.updateSettings(user.id, { [key]: value });
  };

  const updateMaxGuests = () => {
    const num = parseInt(maxGuests);
    if (isNaN(num) || num < 1 || num > 9) {
      Alert.alert('Invalid Value', 'Maximum guests must be between 1 and 9');
      setMaxGuests('9');
      return;
    }
    updateSetting('max_guests', num);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Guest & Invite Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="people" size={24} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Multi-Guest Streaming</Text>
            <Text style={styles.infoText}>
              Invite viewers to join your stream as guests. Create collaborative content or host panel discussions.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guest Permissions</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Allow Guest Requests</Text>
              <Text style={styles.settingDescription}>Viewers can request to join your stream</Text>
            </View>
            <Switch
              value={settings.allow_guest_requests ?? true}
              onValueChange={(value) => updateSetting('allow_guest_requests', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>

          <View style={styles.settingCard}>
            <Text style={styles.cardLabel}>Maximum Guests</Text>
            <Text style={styles.cardHint}>How many guests can join simultaneously? (1-9)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={maxGuests}
                onChangeText={setMaxGuests}
                keyboardType="number-pad"
                maxLength={1}
                onBlur={updateMaxGuests}
              />
              <Text style={styles.guestsText}>guests</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite System</Text>
          
          <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <Ionicons name="timer" size={24} color={theme.colors.primary} />
              <Text style={styles.featureTitle}>20-Second Accept Window</Text>
            </View>
            <Text style={styles.featureText}>
              When you invite a viewer, they have 20 seconds to accept. After that, the invite expires and the slot becomes available again.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <Ionicons name="hand-left" size={24} color={theme.colors.primary} />
              <Text style={styles.featureTitle}>Guest Controls</Text>
            </View>
            <Text style={styles.featureText}>
              As host, you can kick guests, mute their mic, or disable their camera at any time during the stream.
            </Text>
          </View>
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
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  infoTitle: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: 4 },
  infoText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, lineHeight: 18 },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingInfo: { flex: 1, marginRight: theme.spacing.md },
  settingLabel: { fontSize: theme.typography.sizes.base, color: theme.colors.text, marginBottom: 4 },
  settingDescription: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  disabled: { opacity: 0.5 },
  settingCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cardLabel: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text, marginBottom: 4 },
  cardHint: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  input: {
    width: 60,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xl,
    textAlign: 'center',
    fontWeight: theme.typography.weights.bold,
  },
  guestsText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary },
  slowModeCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  slowModeLabel: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  slowModeInput: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  secondsText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  slowModeHint: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  linkLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  linkLabel: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  linkDescription: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
  featureCard: {
    padding: theme.spacing.lg,
    margin: theme.spacing.md,
    marginTop: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  featureHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  featureTitle: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  featureText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, lineHeight: 18 },
});
