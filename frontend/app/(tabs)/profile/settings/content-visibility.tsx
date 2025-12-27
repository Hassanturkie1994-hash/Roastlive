import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService, UserSettings } from '../../../../services/settingsService';

export default function ContentVisibilityScreen() {
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

  const selectDefaultAudience = () => {
    Alert.alert(
      'Default Post Audience',
      'Who can see your posts by default?',
      [
        { text: 'Public (Everyone)', onPress: () => updateSetting('default_post_audience', 'public') },
        { text: 'Followers Only', onPress: () => updateSetting('default_post_audience', 'followers') },
        { text: 'Private (Only Me)', onPress: () => updateSetting('default_post_audience', 'private') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const contentSettings = [
    {
      title: 'Default Audience',
      items: [
        {
          label: 'Default Post Audience',
          description: settings.default_post_audience === 'public' ? 'Public' : settings.default_post_audience === 'followers' ? 'Followers Only' : 'Private',
          action: selectDefaultAudience,
        },
      ]
    },
    {
      title: 'Content Permissions',
      items: [
        {
          label: 'Allow Sharing',
          description: 'Others can share your content',
          key: 'allow_shares' as keyof UserSettings,
        },
        {
          label: 'Allow Downloads',
          description: 'Users can download your videos',
          key: 'allow_downloads' as keyof UserSettings,
        },
        {
          label: 'Allow Duets',
          description: 'Others can create duets with your videos',
          key: 'allow_duets' as keyof UserSettings,
        },
        {
          label: 'Allow Stitches',
          description: 'Others can stitch your content',
          key: 'allow_stitches' as keyof UserSettings,
        },
        {
          label: 'Allow Audio Reuse',
          description: 'Others can use your original audio',
          key: 'allow_audio_reuse' as keyof UserSettings,
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
        <Text style={styles.headerTitle}>Content Visibility</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Control how others can interact with and share your content
          </Text>
        </View>

        {contentSettings.map((section, sectionIndex) => (
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
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  infoText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.text },
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
});
