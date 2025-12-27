import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService, UserSettings } from '../../../../services/settingsService';

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Partial<UserSettings>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user?.id) return;
    const data = await settingsService.getSettings(user.id);
    if (data) setSettings(data);
    setLoading(false);
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!user?.id) return;
    setSettings(prev => ({ ...prev, [key]: value }));
    await settingsService.updateSettings(user.id, { [key]: value });
  };

  const notificationSettings = [
    {
      title: 'Push Notifications',
      items: [
        { label: 'Enable Push Notifications', description: 'Receive notifications on this device', key: 'notifications_enabled' as keyof UserSettings },
        { label: 'Likes', description: 'When someone likes your content', key: 'push_likes' as keyof UserSettings },
        { label: 'Comments', description: 'When someone comments on your content', key: 'push_comments' as keyof UserSettings },
        { label: 'New Followers', description: 'When someone follows you', key: 'push_followers' as keyof UserSettings },
        { label: 'Mentions', description: 'When someone mentions you', key: 'push_mentions' as keyof UserSettings },
        { label: 'Direct Messages', description: 'New DM notifications', key: 'push_dms' as keyof UserSettings },
        { label: 'Live Stream Alerts', description: 'When followed creators go live', key: 'push_live_alerts' as keyof UserSettings },
        { label: 'Gifts Received', description: 'When you receive gifts', key: 'push_gifts' as keyof UserSettings },
      ]
    },
    {
      title: 'Notification Style',
      items: [
        { label: 'Sound', description: 'Play sound for notifications', key: 'notification_sound' as keyof UserSettings },
        { label: 'Vibration', description: 'Vibrate on notifications', key: 'notification_vibration' as keyof UserSettings },
      ]
    },
    {
      title: 'Email Notifications',
      items: [
        { label: 'Email Notifications', description: 'Receive important updates via email', key: 'email_notifications' as keyof UserSettings },
        { label: 'Newsletter', description: 'Product updates and tips', key: 'email_newsletter' as keyof UserSettings },
      ]
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {notificationSettings.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingDescription}>{item.description}</Text>
                </View>
                <Switch
                  value={settings[item.key] as boolean ?? true}
                  onValueChange={(value) => updateSetting(item.key, value)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.surface}
                  disabled={item.key !== 'notifications_enabled' && !settings.notifications_enabled}
                />
              </View>
            ))}
          </View>
        ))}

        <TouchableOpacity
          style={styles.dndButton}
          onPress={() => router.push('/profile/settings/dnd')}
        >
          <View style={styles.dndLeft}>
            <Ionicons name="moon" size={22} color={theme.colors.primary} />
            <View>
              <Text style={styles.dndLabel}>Do Not Disturb Schedule</Text>
              <Text style={styles.dndDescription}>Set quiet hours</Text>
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
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1 },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
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
  dndButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    margin: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dndLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  dndLabel: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  dndDescription: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
});
