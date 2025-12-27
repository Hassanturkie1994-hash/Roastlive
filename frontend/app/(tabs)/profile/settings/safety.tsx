import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';

export default function SafetyScreen() {
  const safetyTools = [
    {
      title: 'Report Content',
      description: 'Report inappropriate streams, videos, or users',
      icon: 'flag' as const,
      action: () => Alert.alert('Report', 'Long press on any content to report it'),
    },
    {
      title: 'Block Users',
      description: 'Manage your blocked users list',
      icon: 'ban' as const,
      action: () => router.push('/profile/settings/blocked-users'),
    },
    {
      title: 'Privacy Settings',
      description: 'Control who can see and interact with you',
      icon: 'lock-closed' as const,
      action: () => router.push('/profile/settings/privacy'),
    },
    {
      title: 'Comment Filters',
      description: 'Block offensive words and phrases',
      icon: 'filter' as const,
      action: () => router.push('/profile/settings/comment-filters'),
    },
    {
      title: 'Account Security',
      description: 'Password, 2FA, and active sessions',
      icon: 'shield-checkmark' as const,
      action: () => router.push('/profile/settings/security'),
    },
  ];

  const guidelineLinks = [
    { label: 'Community Guidelines', url: 'https://roastlive.app/guidelines' },
    { label: 'Report Abuse', url: 'https://roastlive.app/report' },
    { label: 'Safety Tips', url: 'https://roastlive.app/safety-tips' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Center</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.heroCard}>
          <Ionicons name="shield-checkmark" size={64} color={theme.colors.primary} />
          <Text style={styles.heroTitle}>Your Safety Matters</Text>
          <Text style={styles.heroText}>
            Roast Live is committed to creating a safe and positive environment. Use these tools to protect yourself and others.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Tools</Text>
          {safetyTools.map((tool, index) => (
            <TouchableOpacity key={index} style={styles.toolItem} onPress={tool.action}>
              <View style={styles.toolLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={tool.icon} size={24} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  <Text style={styles.toolDescription}>{tool.description}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          {guidelineLinks.map((link, index) => (
            <TouchableOpacity
              key={index}
              style={styles.linkItem}
              onPress={() => Linking.openURL(link.url)}
            >
              <Text style={styles.linkText}>{link.label}</Text>
              <Ionicons name="open" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.emergencyCard}>
          <Ionicons name="call" size={24} color={theme.colors.error} />
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>Need Immediate Help?</Text>
            <Text style={styles.emergencyText}>
              If you're in danger or experiencing abuse, contact local authorities immediately.
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
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1 },
  heroCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  heroTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  heroText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 22,
  },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  toolLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  toolDescription: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 4 },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  linkText: { fontSize: theme.typography.sizes.base, color: theme.colors.primary },
  emergencyCard: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.error}10`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  emergencyTitle: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: theme.colors.error, marginBottom: 4 },
  emergencyText: { fontSize: theme.typography.sizes.sm, color: theme.colors.text, lineHeight: 18 },
});
