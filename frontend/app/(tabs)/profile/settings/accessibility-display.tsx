import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService, UserSettings } from '../../../../services/settingsService';

export default function AccessibilityDisplayScreen() {
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

  const selectTextSize = () => {
    Alert.alert(
      'Text Size',
      'Choose your preferred text size',
      [
        { text: 'Small', onPress: () => updateSetting('text_size', 'small') },
        { text: 'Medium', onPress: () => updateSetting('text_size', 'medium') },
        { text: 'Large', onPress: () => updateSetting('text_size', 'large') },
        { text: 'Extra Large', onPress: () => updateSetting('text_size', 'xlarge') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const selectTheme = () => {
    Alert.alert(
      'App Theme',
      'Choose your preferred theme',
      [
        { text: 'Light', onPress: () => updateSetting('theme', 'light') },
        { text: 'Dark', onPress: () => updateSetting('theme', 'dark') },
        { text: 'System Default', onPress: () => updateSetting('theme', 'system') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const displaySettings = [
    {
      title: 'Display',
      items: [
        {
          label: 'App Theme',
          description: settings.theme === 'light' ? 'Light' : settings.theme === 'dark' ? 'Dark' : 'System Default',
          action: selectTheme,
        },
        {
          label: 'Text Size',
          description: settings.text_size === 'small' ? 'Small' : settings.text_size === 'large' ? 'Large' : settings.text_size === 'xlarge' ? 'Extra Large' : 'Medium',
          action: selectTextSize,
        },
      ]
    },
    {
      title: 'Visual Accessibility',
      items: [
        {
          label: 'High Contrast',
          description: 'Increase contrast for better visibility',
          key: 'high_contrast' as keyof UserSettings,
        },
        {
          label: 'Color Blind Mode',
          description: 'Adjust colors for color vision deficiency',
          key: 'color_blind_mode' as keyof UserSettings,
        },
        {
          label: 'Reduce Motion',
          description: 'Minimize animations and effects',
          key: 'reduce_motion' as keyof UserSettings,
        },
      ]
    },
    {
      title: 'Haptics',
      items: [
        {
          label: 'Haptic Feedback',
          description: 'Vibration feedback for interactions',
          key: 'haptic_feedback' as keyof UserSettings,
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
        <Text style={styles.headerTitle}>Display & Accessibility</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {displaySettings.map((section, sectionIndex) => (
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
                    value={settings[item.key!] as boolean ?? false}
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
});
