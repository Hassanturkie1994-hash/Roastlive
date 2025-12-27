import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { settingsService, UserSettings } from '../../../services/settingsService';

export default function StreamSettingsScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Partial<UserSettings>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user?.id) return;
    const data = await settingsService.getSettings(user.id);
    if (data) setSettings(data);
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!user?.id) return;
    setSettings(prev => ({ ...prev, [key]: value }));
    await settingsService.updateSettings(user.id, { [key]: value });
  };

  const selectVisibility = () => {
    Alert.alert(
      'Default Stream Visibility',
      'Who can watch your live streams by default?',
      [
        { text: 'Public (Everyone)', onPress: () => updateSetting('default_stream_visibility', 'public') },
        { text: 'Followers Only', onPress: () => updateSetting('default_stream_visibility', 'followers') },
        { text: 'Private (Invited Only)', onPress: () => updateSetting('default_stream_visibility', 'private') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const selectChatMode = () => {
    Alert.alert(
      'Live Chat Mode',
      'Who can chat in your live streams?',
      [
        { text: 'Everyone', onPress: () => updateSetting('live_chat_mode', 'everyone') },
        { text: 'Followers Only', onPress: () => updateSetting('live_chat_mode', 'followers') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const selectQuality = () => {
    Alert.alert(
      'Stream Quality',
      'Choose your preferred streaming quality',
      [
        { text: 'Auto (Recommended)', onPress: () => updateSetting('stream_quality', 'auto') },
        { text: 'High Quality', onPress: () => updateSetting('stream_quality', 'high') },
        { text: 'Medium Quality', onPress: () => updateSetting('stream_quality', 'medium') },
        { text: 'Low (Data Saver)', onPress: () => updateSetting('stream_quality', 'low') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const streamSettings = [
    {
      title: 'Stream Defaults',
      items: [
        {
          label: 'Default Visibility',
          description: settings.default_stream_visibility === 'public' ? 'Public' : settings.default_stream_visibility === 'followers' ? 'Followers Only' : 'Private',
          action: selectVisibility,
        },
        {
          label: 'Stream Quality',
          description: settings.stream_quality === 'auto' ? 'Auto' : settings.stream_quality === 'high' ? 'High' : settings.stream_quality === 'medium' ? 'Medium' : 'Low',
          action: selectQuality,
        },
      ]
    },
    {
      title: 'Chat Controls',
      items: [
        {
          label: 'Enable Live Chat',
          description: 'Allow viewers to send messages',
          key: 'enable_live_chat' as keyof UserSettings,
        },
        {
          label: 'Chat Mode',
          description: settings.live_chat_mode === 'everyone' ? 'Everyone' : 'Followers Only',
          action: selectChatMode,
        },
        {
          label: 'Slow Mode',
          description: 'Limit chat message frequency',
          key: 'enable_slow_mode' as keyof UserSettings,
        },
      ]
    },
    {
      title: 'Guest & Interactions',
      items: [
        {
          label: 'Allow Guest Requests',
          description: 'Viewers can request to join your stream',
          key: 'allow_guest_requests' as keyof UserSettings,
        },
        {
          label: 'Enable Gifts',
          description: 'Viewers can send you gifts during live',
          key: 'enable_gifts_in_live' as keyof UserSettings,
        },
      ]
    },
    {
      title: 'Recording',
      items: [
        {
          label: 'Save Live Replays',
          description: 'Automatically save streams for later viewing',
          key: 'save_live_replays' as keyof UserSettings,
        },
      ]
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stream Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {streamSettings.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingDescription}>{item.description}</Text>
                </View>
                {item.action ? (
                  <TouchableOpacity onPress={item.action}>
                    <View style={styles.selectButton}>
                      <Text style={styles.selectButtonText}>{item.description}</Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <Switch
                    value={settings[item.key!] as boolean ?? true}
                    onValueChange={(value) => updateSetting(item.key!, value)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={theme.colors.surface}
                  />
                )}
              </View>
            ))}
          </View>
        ))}

        <TouchableOpacity
          style={styles.moderatorsButton}
          onPress={() => router.push('/profile/moderators')}
        >
          <View style={styles.moderatorsLeft}>
            <Ionicons name="people" size={24} color={theme.colors.primary} />
            <View>
              <Text style={styles.moderatorsLabel}>Manage Moderators</Text>
              <Text style={styles.moderatorsDescription}>Assign helpers for your streams</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
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
  selectButton: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  selectButtonText: { fontSize: theme.typography.sizes.sm, color: theme.colors.primary },
  moderatorsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  moderatorsLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  moderatorsLabel: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  moderatorsDescription: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
});
