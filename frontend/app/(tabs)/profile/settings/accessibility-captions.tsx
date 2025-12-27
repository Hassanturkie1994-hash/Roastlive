import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService, UserSettings } from '../../../../services/settingsService';

export default function AccessibilityCaptionsScreen() {
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
        <Text style={styles.headerTitle}>Captions & Audio</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Captions</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Always Show Captions</Text>
              <Text style={styles.settingDescription}>Automatically display captions on all videos when available</Text>
            </View>
            <Switch
              value={settings.caption_always_on ?? false}
              onValueChange={(value) => updateSetting('caption_always_on', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="accessibility" size={24} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Accessibility Features</Text>
            <Text style={styles.infoText}>
              Captions help everyone enjoy content, including those with hearing impairments or in sound-sensitive environments.
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <Text style={styles.featureTitle}>Auto-Generated Captions</Text>
          </View>
          <Text style={styles.featureText}>
            Roast Live automatically generates captions for live streams using AI. Captions appear in real-time and can be toggled on/off.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <Ionicons name="language" size={24} color={theme.colors.primary} />
            <Text style={styles.featureTitle}>Multi-Language Support</Text>
          </View>
          <Text style={styles.featureText}>
            Captions can be auto-translated to your preferred language. Select your language in Language & Region settings.
          </Text>
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
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  infoTitle: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: 4 },
  infoText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, lineHeight: 18 },
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
