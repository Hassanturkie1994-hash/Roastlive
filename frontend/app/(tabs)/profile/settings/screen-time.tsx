import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService, UserSettings } from '../../../../services/settingsService';

export default function ScreenTimeScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Partial<UserSettings>>({});
  const [dailyUsage, setDailyUsage] = useState(0);

  useEffect(() => {
    loadSettings();
    loadDailyUsage();
  }, []);

  const loadSettings = async () => {
    if (!user?.id) return;
    const data = await settingsService.getSettings(user.id);
    if (data) setSettings(data);
  };

  const loadDailyUsage = async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const minutes = await settingsService.getDailyScreenTime(user.id, today);
    setDailyUsage(minutes);
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!user?.id) return;
    setSettings(prev => ({ ...prev, [key]: value }));
    await settingsService.updateSettings(user.id, { [key]: value });
  };

  const selectTimeLimit = () => {
    Alert.alert(
      'Daily Time Limit',
      'Set your daily screen time limit',
      [
        { text: 'No Limit', onPress: () => updateSetting('screen_time_limit_minutes', 0) },
        { text: '30 minutes', onPress: () => updateSetting('screen_time_limit_minutes', 30) },
        { text: '1 hour', onPress: () => updateSetting('screen_time_limit_minutes', 60) },
        { text: '2 hours', onPress: () => updateSetting('screen_time_limit_minutes', 120) },
        { text: '3 hours', onPress: () => updateSetting('screen_time_limit_minutes', 180) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Screen Time</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Today's Usage */}
        <View style={styles.usageCard}>
          <View style={styles.usageHeader}>
            <Ionicons name="time" size={32} color={theme.colors.primary} />
            <View style={styles.usageInfo}>
              <Text style={styles.usageLabel}>Today's Usage</Text>
              <Text style={styles.usageTime}>{formatTime(dailyUsage)}</Text>
            </View>
          </View>
          {settings.screen_time_limit_minutes && settings.screen_time_limit_minutes > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((dailyUsage / settings.screen_time_limit_minutes) * 100, 100)}%`,
                      backgroundColor: dailyUsage >= settings.screen_time_limit_minutes ? theme.colors.error : theme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.limitText}>
                Limit: {formatTime(settings.screen_time_limit_minutes)}
              </Text>
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screen Time Management</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Screen Time Limit</Text>
              <Text style={styles.settingDescription}>Get reminded when you reach your daily limit</Text>
            </View>
            <Switch
              value={settings.screen_time_enabled ?? false}
              onValueChange={(value) => updateSetting('screen_time_enabled', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={selectTimeLimit}
            disabled={!settings.screen_time_enabled}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, !settings.screen_time_enabled && styles.disabled]}>Daily Time Limit</Text>
              <Text style={[styles.settingDescription, !settings.screen_time_enabled && styles.disabled]}>
                {settings.screen_time_limit_minutes === 0 || !settings.screen_time_limit_minutes 
                  ? 'No Limit' 
                  : formatTime(settings.screen_time_limit_minutes)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={settings.screen_time_enabled ? theme.colors.textSecondary : theme.colors.border} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Screen time tracking helps you build healthy habits. You'll receive a gentle reminder when approaching your limit.
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
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1 },
  usageCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  usageHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  usageInfo: { flex: 1 },
  usageLabel: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  usageTime: { fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginTop: 4 },
  progressContainer: { marginTop: theme.spacing.md },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  limitText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, textAlign: 'right' },
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
  },
  infoText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.text },
});
