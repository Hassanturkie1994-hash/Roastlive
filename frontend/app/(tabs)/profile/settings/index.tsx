import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';

export default function SettingsIndexScreen() {
  const { user, signOut } = useAuth();

  const settingSections = [
    {
      title: 'Privacy & Safety',
      icon: 'shield-checkmark' as const,
      items: [
        { label: 'Privacy Settings', route: '/profile/settings/privacy', icon: 'lock-closed' as const },
        { label: 'Blocked Users', route: '/profile/settings/blocked-users', icon: 'ban' as const },
        { label: 'Muted Users', route: '/profile/settings/muted-users', icon: 'volume-mute' as const },
        { label: 'Comment Filters', route: '/profile/settings/comment-filters', icon: 'filter' as const },
        { label: 'Safety Center', route: '/profile/settings/safety', icon: 'information-circle' as const },
      ]
    },
    {
      title: 'Account',
      icon: 'person' as const,
      items: [
        { label: 'Edit Profile', route: '/profile/edit', icon: 'create' as const },
        { label: 'Password & Security', route: '/profile/settings/security', icon: 'key' as const },
        { label: 'Connected Accounts', route: '/profile/settings/connected-accounts', icon: 'link' as const },
        { label: 'Active Sessions', route: '/profile/settings/sessions', icon: 'phone-portrait' as const },
        { label: 'Language & Region', route: '/profile/settings/language', icon: 'globe' as const },
      ]
    },
    {
      title: 'Notifications',
      icon: 'notifications' as const,
      items: [
        { label: 'Push Notifications', route: '/profile/settings/notifications', icon: 'notifications-outline' as const },
        { label: 'Do Not Disturb', route: '/profile/settings/dnd', icon: 'moon' as const },
        { label: 'Email Preferences', route: '/profile/settings/email-notifications', icon: 'mail' as const },
      ]
    },
    {
      title: 'Live Streaming',
      icon: 'videocam' as const,
      items: [
        { label: 'Stream Settings', route: '/profile/settings/stream-settings', icon: 'settings' as const },
        { label: 'My Moderators', route: '/profile/moderators', icon: 'people' as const },
        { label: 'Chat Controls', route: '/profile/settings/chat-controls', icon: 'chatbubbles' as const },
        { label: 'Guest & Invite Settings', route: '/profile/settings/guest-settings', icon: 'person-add' as const },
      ]
    },
    {
      title: 'Content & Sharing',
      icon: 'share-social' as const,
      items: [
        { label: 'Content Visibility', route: '/profile/settings/content-visibility', icon: 'eye' as const },
        { label: 'Download & Remix', route: '/profile/settings/download-permissions', icon: 'download' as const },
        { label: 'Sharing Preferences', route: '/profile/settings/sharing', icon: 'share' as const },
      ]
    },
    {
      title: 'Monetization',
      icon: 'cash' as const,
      items: [
        { label: 'Wallet & Payments', route: '/profile/wallet', icon: 'wallet' as const },
        { label: 'Gift Settings', route: '/profile/settings/gift-settings', icon: 'gift' as const },
        { label: 'Payout Preferences', route: '/profile/settings/payouts', icon: 'card' as const },
        { label: 'VIP Clubs', route: '/profile/vip-club-dashboard', icon: 'star' as const },
      ]
    },
    {
      title: 'Accessibility',
      icon: 'accessibility' as const,
      items: [
        { label: 'Display & Text', route: '/profile/settings/accessibility-display', icon: 'text' as const },
        { label: 'Captions & Audio', route: '/profile/settings/accessibility-captions', icon: 'closed-captioning' as const },
        { label: 'Motion & Effects', route: '/profile/settings/accessibility-motion', icon: 'eye-off' as const },
      ]
    },
    {
      title: 'Data & Storage',
      icon: 'folder' as const,
      items: [
        { label: 'Download Your Data', route: '/profile/settings/data-export', icon: 'cloud-download' as const },
        { label: 'Screen Time', route: '/profile/settings/screen-time', icon: 'time' as const },
        { label: 'Clear Cache', route: '/profile/settings/cache', icon: 'trash' as const },
      ]
    },
    {
      title: 'Support',
      icon: 'help-circle' as const,
      items: [
        { label: 'Help Center', route: '/profile/help', icon: 'help-buoy' as const },
        { label: 'Terms of Service', route: '/profile/terms', icon: 'document-text' as const },
        { label: 'Privacy Policy', route: '/profile/privacy', icon: 'shield' as const },
        { label: 'About', route: '/profile/settings/about', icon: 'information' as const },
      ]
    },
  ];

  const handleLogout = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingSections.map((section, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={styles.settingItem}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name={item.icon} size={22} color={theme.colors.textSecondary} />
                  <Text style={styles.settingLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={22} color={theme.colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Roast Live v1.0.0</Text>
          <Text style={styles.footerText}>@{user?.user_metadata?.username || 'user'}</Text>
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
  section: { marginBottom: theme.spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionTitle: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase' },
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
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  settingLabel: { fontSize: theme.typography.sizes.base, color: theme.colors.text },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    margin: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    backgroundColor: `${theme.colors.error}15`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  logoutText: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.error },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  footerText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
});
