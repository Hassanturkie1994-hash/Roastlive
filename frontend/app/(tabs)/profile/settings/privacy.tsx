import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService, UserSettings } from '../../../../services/settingsService';

export default function PrivacySettingsScreen() {
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

  const privacySettings = [
    {
      title: 'Account Privacy',
      items: [
        {
          label: 'Private Account',
          description: 'Only approved followers can see your content',
          key: 'is_private_account' as keyof UserSettings,
          type: 'switch' as const,
        },
        {
          label: 'Show in Search & Suggestions',
          description: 'Appear in search results and recommended users',
          key: 'appear_in_search' as keyof UserSettings,
          type: 'switch' as const,
        },
        {
          label: 'Show Activity Status',
          description: 'Let others see when you\'re online',
          key: 'show_activity_status' as keyof UserSettings,
          type: 'switch' as const,
        },
      ]
    },
    {
      title: 'Profile Visibility',
      items: [
        {
          label: 'Show Followers List',
          description: 'Display your followers on your profile',
          key: 'show_followers_list' as keyof UserSettings,
          type: 'switch' as const,
        },
        {
          label: 'Show Following List',
          description: 'Display who you follow on your profile',
          key: 'show_following_list' as keyof UserSettings,
          type: 'switch' as const,
        },
        {
          label: 'Show Liked Content',
          description: 'Display videos you\'ve liked on your profile',
          key: 'show_liked_content' as keyof UserSettings,
          type: 'switch' as const,
        },
      ]
    },
    {
      title: 'Interactions',
      items: [
        {
          label: 'Direct Messages',
          description: settings.dm_permissions === 'everyone' ? 'Everyone' : settings.dm_permissions === 'followers' ? 'Followers Only' : 'No One',
          key: 'dm_permissions' as keyof UserSettings,
          type: 'select' as const,
          options: ['everyone', 'followers', 'none'],
        },
        {
          label: 'Comments',
          description: settings.comment_permissions === 'everyone' ? 'Everyone' : settings.comment_permissions === 'followers' ? 'Followers Only' : 'No One',
          key: 'comment_permissions' as keyof UserSettings,
          type: 'select' as const,
          options: ['everyone', 'followers', 'none'],
        },
        {
          label: 'Mentions & Tags',
          description: settings.mention_permissions === 'everyone' ? 'Everyone' : settings.mention_permissions === 'followers' ? 'Followers Only' : 'No One',
          key: 'mention_permissions' as keyof UserSettings,
          type: 'select' as const,
          options: ['everyone', 'followers', 'none'],
        },
      ]
    },
    {
      title: 'Content Permissions',
      items: [
        {
          label: 'Allow Duets',
          description: 'Others can duet with your videos',
          key: 'allow_duets' as keyof UserSettings,
          type: 'switch' as const,
        },
        {
          label: 'Allow Stitches',
          description: 'Others can stitch your videos',
          key: 'allow_stitches' as keyof UserSettings,
          type: 'switch' as const,
        },
        {
          label: 'Allow Downloads',
          description: 'Others can download your content',
          key: 'allow_downloads' as keyof UserSettings,
          type: 'switch' as const,
        },
        {
          label: 'Allow Audio Reuse',
          description: 'Others can use your original audio',
          key: 'allow_audio_reuse' as keyof UserSettings,
          type: 'switch' as const,
        },
      ]
    },
  ];

  const showSelectDialog = (key: keyof UserSettings, options: string[]) => {
    Alert.alert(
      'Select Permission',
      'Who can interact with you?',
      options.map(option => ({
        text: option === 'everyone' ? 'Everyone' : option === 'followers' ? 'Followers Only' : 'No One',
        onPress: () => updateSetting(key, option),
      })).concat({ text: 'Cancel', style: 'cancel' })
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {privacySettings.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingDescription}>{item.description}</Text>
                </View>
                {item.type === 'switch' ? (
                  <Switch
                    value={settings[item.key] as boolean}
                    onValueChange={(value) => updateSetting(item.key, value)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={theme.colors.surface}
                  />
                ) : (
                  <TouchableOpacity onPress={() => showSelectDialog(item.key, item.options!)}>
                    <View style={styles.selectButton}>
                      <Text style={styles.selectButtonText}>{item.description}</Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ))}
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
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm, paddingTop: theme.spacing.md },
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
  loadingText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xl },
});
