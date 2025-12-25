import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAdminRole } from '../../../hooks/useAdminRole';
import { supabase } from '../../../lib/supabase';

interface SettingItem {
  id: string;
  icon: string;
  label: string;
  route?: string;
  action?: () => void;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  color?: string;
  badge?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme: themeMode, toggleTheme } = useTheme();
  const { role, isAdmin } = useAdminRole();
  const [notifications, setNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { id: 'edit-profile', icon: 'person-outline', label: 'Edit Profile', route: '/(tabs)/profile/edit' },
        { id: 'change-password', icon: 'key-outline', label: 'Change Password', route: '/(tabs)/profile/change-password' },
        { id: 'wallet', icon: 'wallet-outline', label: 'Wallet & Payments', route: '/(tabs)/profile/wallet', color: theme.colors.gold },
        { id: 'vip-clubs', icon: 'star-outline', label: 'VIP Clubs', route: '/(tabs)/profile/vip-clubs', color: theme.colors.vip },
      ],
    },
    {
      title: 'Streaming',
      items: [
        { id: 'stream-dashboard', icon: 'analytics-outline', label: 'Stream Dashboard', route: '/(tabs)/profile/stream-dashboard' },
        { id: 'stream-settings', icon: 'settings-outline', label: 'Stream Settings', route: '/(tabs)/profile/stream-settings' },
        { id: 'moderators', icon: 'shield-outline', label: 'My Moderators', route: '/(tabs)/profile/moderators' },
        { id: 'gift-store', icon: 'gift-outline', label: 'Gift Store', route: '/(tabs)/profile/gift-store', color: theme.colors.gold },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          id: 'notifications',
          icon: 'notifications-outline',
          label: 'Push Notifications',
          hasToggle: true,
          toggleValue: notifications,
          onToggle: setNotifications,
        },
        {
          id: 'dark-mode',
          icon: themeMode === 'dark' ? 'moon' : 'sunny',
          label: 'Dark Mode',
          hasToggle: true,
          toggleValue: themeMode === 'dark',
          onToggle: () => toggleTheme(),
        },
        {
          id: 'private-account',
          icon: 'lock-closed-outline',
          label: 'Private Account',
          hasToggle: true,
          toggleValue: privateAccount,
          onToggle: setPrivateAccount,
        },
      ],
    },
    {
      title: 'Safety & Privacy',
      items: [
        { id: 'blocked-users', icon: 'ban-outline', label: 'Blocked Users', route: '/(tabs)/profile/blocked-users' },
        { id: 'community-rules', icon: 'book-outline', label: 'Community Rules', route: '/(tabs)/profile/rules' },
        { id: 'report', icon: 'flag-outline', label: 'Report a Problem', route: '/(tabs)/profile/report', color: theme.colors.warning },
      ],
    },
    {
      title: 'Support',
      items: [
        { id: 'help', icon: 'help-circle-outline', label: 'Help Center', route: '/(tabs)/profile/help' },
        { id: 'gift-info', icon: 'information-circle-outline', label: 'Gift Information', route: '/(tabs)/profile/gift-info' },
        { id: 'terms', icon: 'document-text-outline', label: 'Terms of Service', route: '/(tabs)/profile/terms' },
        { id: 'privacy', icon: 'shield-checkmark-outline', label: 'Privacy Policy', route: '/(tabs)/profile/privacy' },
      ],
    },
    {
      title: 'Admin',
      items: [
        { id: 'admin-panel', icon: 'construct-outline', label: 'Admin Panel', route: '/(tabs)/profile/admin', badge: 'STAFF' },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={() => {
        if (item.route) router.push(item.route as any);
        if (item.action) item.action();
      }}
      disabled={item.hasToggle}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, item.color && { backgroundColor: `${item.color}20` }]}>
          <Ionicons name={item.icon as any} size={22} color={item.color || theme.colors.text} />
        </View>
        <Text style={styles.settingLabel}>{item.label}</Text>
        {item.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
      </View>
      {item.hasToggle ? (
        <Switch
          value={item.toggleValue}
          onValueChange={item.onToggle}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor="#fff"
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(renderSettingItem)}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Roast Live v1.0.0</Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xxl + 10,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionContent: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  settingLabel: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    marginHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  signOutText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
  },
  versionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textDisabled,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});
