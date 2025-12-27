import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import Constants from 'expo-constants';

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="flame" size={64} color={theme.colors.primary} />
          </View>
          <Text style={styles.appName}>Roast Live</Text>
          <Text style={styles.version}>Version {Constants.expoConfig?.version || '1.0.0'}</Text>
          <Text style={styles.tagline}>Live Streaming & Battle Platform</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons name="people" size={24} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Made for Creators</Text>
              <Text style={styles.infoText}>Built by creators, for creators. Stream, battle, and earn.</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="trophy" size={24} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Compete & Win</Text>
              <Text style={styles.infoText}>Join battles, earn XP, climb the leaderboard.</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="cash" size={24} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Monetize Your Talent</Text>
              <Text style={styles.infoText}>Receive gifts, grow your VIP club, earn real money.</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/profile/terms')}>
            <Text style={styles.linkText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/profile/privacy')}>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Roast Live. All rights reserved.</Text>
          <Text style={styles.footerText}>Built with ❤️ for the creator community</Text>
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
  logoSection: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  appName: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  version: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  tagline: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary },
  infoSection: { padding: theme.spacing.md, gap: theme.spacing.md },
  infoItem: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  infoLabel: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text, marginBottom: 4 },
  infoText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, lineHeight: 18 },
  section: { marginTop: theme.spacing.lg },
  sectionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  linkText: { fontSize: theme.typography.sizes.base, color: theme.colors.text },
  footer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  footerText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
});
