import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService, UserSettings } from '../../../../services/settingsService';

export default function ChatControlsScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Partial<UserSettings>>({});
  const [slowModeSeconds, setSlowModeSeconds] = useState('3');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user?.id) return;
    const data = await settingsService.getSettings(user.id);
    if (data) {
      setSettings(data);
      if (data.slow_mode_seconds) {
        setSlowModeSeconds(data.slow_mode_seconds.toString());
      }
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!user?.id) return;
    setSettings(prev => ({ ...prev, [key]: value }));
    await settingsService.updateSettings(user.id, { [key]: value });
  };

  const updateSlowModeSeconds = () => {
    const seconds = parseInt(slowModeSeconds);
    if (isNaN(seconds) || seconds < 1 || seconds > 60) {
      Alert.alert('Invalid Value', 'Please enter a number between 1 and 60 seconds');
      return;
    }
    updateSetting('slow_mode_seconds', seconds);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat Controls</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="chatbubbles" size={24} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Live Chat Management</Text>
            <Text style={styles.infoText}>
              Control how viewers interact in your live stream chat. These settings help maintain a positive environment.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Live Chat</Text>
              <Text style={styles.settingDescription}>Allow viewers to send messages during streams</Text>
            </View>
            <Switch
              value={settings.enable_live_chat ?? true}
              onValueChange={(value) => updateSetting('enable_live_chat', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              Alert.alert(
                'Chat Mode',
                'Who can send messages in your live chat?',
                [
                  { text: 'Everyone', onPress: () => updateSetting('live_chat_mode', 'everyone') },
                  { text: 'Followers Only', onPress: () => updateSetting('live_chat_mode', 'followers') },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
            disabled={!settings.enable_live_chat}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, !settings.enable_live_chat && styles.disabled]}>Chat Mode</Text>
              <Text style={[styles.settingDescription, !settings.enable_live_chat && styles.disabled]}>
                {settings.live_chat_mode === 'everyone' ? 'Everyone can chat' : 'Followers only'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={settings.enable_live_chat ? theme.colors.textSecondary : theme.colors.border} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Slow Mode</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Slow Mode</Text>
              <Text style={styles.settingDescription}>Limit how often users can send messages</Text>
            </View>
            <Switch
              value={settings.enable_slow_mode ?? false}
              onValueChange={(value) => updateSetting('enable_slow_mode', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
              disabled={!settings.enable_live_chat}
            />
          </View>

          {settings.enable_slow_mode && (
            <View style={styles.slowModeCard}>
              <Text style={styles.slowModeLabel}>Message Cooldown (seconds)</Text>
              <View style={styles.slowModeInput}>
                <TextInput
                  style={styles.input}
                  value={slowModeSeconds}
                  onChangeText={setSlowModeSeconds}
                  keyboardType="number-pad"
                  maxLength={2}
                  onBlur={updateSlowModeSeconds}
                />
                <Text style={styles.secondsText}>seconds between messages</Text>
              </View>
              <Text style={styles.slowModeHint}>Users can send 1 message every {slowModeSeconds} seconds</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Moderation</Text>
          
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/profile/settings/comment-filters')}
          >
            <View style={styles.linkLeft}>
              <Ionicons name="filter" size={24} color={theme.colors.primary} />
              <View>
                <Text style={styles.linkLabel}>Comment Filters</Text>
                <Text style={styles.linkDescription}>Block offensive words and phrases</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/profile/moderators')}
          >
            <View style={styles.linkLeft}>
              <Ionicons name="people" size={24} color={theme.colors.primary} />
              <View>
                <Text style={styles.linkLabel}>My Moderators</Text>
                <Text style={styles.linkDescription}>Assign helpers to manage your chat</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
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
  slowModeCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  slowModeLabel: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  slowModeInput: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  input: {
    width: 60,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    textAlign: 'center',
    fontWeight: theme.typography.weights.bold,
  },
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
});
