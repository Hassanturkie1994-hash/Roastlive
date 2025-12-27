import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService, UserSettings } from '../../../../services/settingsService';

export default function AccessibilityMotionScreen() {
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Motion & Effects</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={24} color={theme.colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Motion Sensitivity</Text>
            <Text style={styles.warningText}>
              These settings help reduce motion and visual effects that may cause discomfort for users with motion sensitivity or photosensitivity.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motion Controls</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Reduce Motion</Text>
              <Text style={styles.settingDescription}>Minimize animations and transitions</Text>
            </View>
            <Switch
              value={settings.reduce_motion ?? false}
              onValueChange={(value) => updateSetting('reduce_motion', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>Vibration feedback for interactions</Text>
            </View>
            <Switch
              value={settings.haptic_feedback ?? true}
              onValueChange={(value) => updateSetting('haptic_feedback', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>What Gets Reduced?</Text>
            <Text style={styles.infoText}>
              When enabled, Reduce Motion will reduce or disable auto-play on videos, parallax effects, page transitions, animated gift effects, and replace intense animations with simple fades.
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
  warningCard: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.warning}10`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  warningTitle: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: theme.colors.warning, marginBottom: 4 },
  warningText: { fontSize: theme.typography.sizes.sm, color: theme.colors.text, lineHeight: 18 },
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
  infoCard: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
  },
  infoTitle: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.xs },
  infoText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, lineHeight: 20 },
});
