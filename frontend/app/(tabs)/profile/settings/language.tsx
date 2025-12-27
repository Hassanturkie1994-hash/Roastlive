import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService, UserSettings } from '../../../../services/settingsService';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

const REGIONS = [
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'EU', name: 'Europe' },
  { code: 'GLOBAL', name: 'Global' },
];

export default function LanguageSettingsScreen() {
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

  const selectLanguage = () => {
    Alert.alert(
      'Select Language',
      'Choose your preferred app language',
      LANGUAGES.map(lang => ({
        text: `${lang.flag} ${lang.name}`,
        onPress: () => updateSetting('language', lang.code),
      })).concat({ text: 'Cancel', style: 'cancel' })
    );
  };

  const selectRegion = () => {
    Alert.alert(
      'Select Region',
      'Choose your content region preference',
      REGIONS.map(region => ({
        text: region.name,
        onPress: () => updateSetting('region', region.code),
      })).concat({ text: 'Cancel', style: 'cancel' })
    );
  };

  const currentLanguage = LANGUAGES.find(l => l.code === settings.language);
  const currentRegion = REGIONS.find(r => r.code === settings.region);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language & Region</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language</Text>
          <TouchableOpacity style={styles.settingItem} onPress={selectLanguage}>
            <View style={styles.settingLeft}>
              <Text style={styles.flag}>{currentLanguage?.flag || '🌍'}</Text>
              <View>
                <Text style={styles.settingLabel}>App Language</Text>
                <Text style={styles.settingDescription}>{currentLanguage?.name || 'English'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Region</Text>
          <TouchableOpacity style={styles.settingItem} onPress={selectRegion}>
            <View style={styles.settingLeft}>
              <Ionicons name="globe" size={24} color={theme.colors.primary} />
              <View>
                <Text style={styles.settingLabel}>Content Region</Text>
                <Text style={styles.settingDescription}>{currentRegion?.name || 'Global'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Region affects trending content and recommendations. You'll see more content from your selected region.
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
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
  flag: { fontSize: 32 },
  settingLabel: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  settingDescription: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 4 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
  },
  infoText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.text, lineHeight: 18 },
});
