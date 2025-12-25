import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

const RULES = [
  {
    title: 'What is Allowed',
    icon: 'checkmark-circle',
    color: theme.colors.success,
    items: [
      'Playful roasts, jokes, and comedy',
      'Competitive banter between performers',
      'Mild profanity used in comedic context',
      'Pop culture references and memes',
      'Sarcastic or ironic statements',
      'Drama for entertainment purposes',
      'Satire and parody',
      'Friendly verbal duels',
    ],
  },
  {
    title: 'What is Prohibited',
    icon: 'close-circle',
    color: theme.colors.error,
    items: [
      'Hate speech targeting race, religion, gender, sexuality, or disability',
      'Genuine threats of violence or harm',
      'Harassment or bullying (not playful roasts)',
      'Sexual content involving minors',
      'Personal information sharing (doxxing)',
      'Spam or scam content',
      'Graphic violence descriptions',
      'Self-harm encouragement',
      'Impersonation of others',
      'Copyright infringement',
    ],
  },
];

const CONSEQUENCES = [
  { level: 'First violation', action: 'Warning (30 days)', icon: 'warning' },
  { level: 'Second violation', action: 'Timeout (10 minutes)', icon: 'time' },
  { level: 'Third violation', action: 'Stream ban (24 hours)', icon: 'ban' },
  { level: 'Fourth violation', action: 'Permanent ban', icon: 'skull' },
];

export default function RulesScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Rules</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Intro */}
        <View style={styles.introCard}>
          <Text style={styles.introEmoji}>🔥</Text>
          <Text style={styles.introTitle}>Welcome to Roast Live</Text>
          <Text style={styles.introText}>
            Roast Live is a platform for comedy, entertainment, and friendly roast battles.
            We encourage humor and banter, but there are lines that cannot be crossed.
          </Text>
        </View>

        {/* Rules Sections */}
        {RULES.map((section, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon as any} size={24} color={section.color} />
              <Text style={[styles.sectionTitle, { color: section.color }]}>
                {section.title}
              </Text>
            </View>
            <View style={styles.rulesList}>
              {section.items.map((item, idx) => (
                <View key={idx} style={styles.ruleItem}>
                  <View style={[styles.bullet, { backgroundColor: section.color }]} />
                  <Text style={styles.ruleText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Consequences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={24} color={theme.colors.warning} />
            <Text style={[styles.sectionTitle, { color: theme.colors.warning }]}>
              Strike System
            </Text>
          </View>
          <Text style={styles.strikeInfo}>
            Violations are tracked per creator's stream. Strikes reset after 30 days of good behavior.
          </Text>
          <View style={styles.consequencesList}>
            {CONSEQUENCES.map((item, index) => (
              <View key={index} style={styles.consequenceItem}>
                <View style={styles.consequenceLevel}>
                  <Ionicons name={item.icon as any} size={20} color={theme.colors.text} />
                  <Text style={styles.levelText}>{item.level}</Text>
                </View>
                <Text style={styles.actionText}>{item.action}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* AI Moderation Notice */}
        <View style={styles.aiNotice}>
          <Ionicons name="hardware-chip" size={24} color={theme.colors.primary} />
          <View style={styles.aiNoticeContent}>
            <Text style={styles.aiNoticeTitle}>AI-Powered Moderation</Text>
            <Text style={styles.aiNoticeText}>
              Our AI system automatically reviews chat messages and content in real-time
              to maintain a safe environment. Violations may result in automatic actions.
            </Text>
          </View>
        </View>

        {/* Report Section */}
        <View style={styles.reportSection}>
          <Text style={styles.reportTitle}>See Something Wrong?</Text>
          <Text style={styles.reportText}>
            Help us keep Roast Live safe by reporting violations.
          </Text>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => router.push('/(tabs)/profile/report')}
          >
            <Ionicons name="flag" size={20} color="#fff" />
            <Text style={styles.reportButtonText}>Report Content</Text>
          </TouchableOpacity>
        </View>

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
    padding: theme.spacing.md,
  },
  introCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  introEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  introTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  introText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    marginLeft: theme.spacing.sm,
  },
  rulesList: {
    marginTop: theme.spacing.sm,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: theme.spacing.sm,
  },
  ruleText: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    lineHeight: 20,
  },
  strikeInfo: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  consequencesList: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  consequenceLevel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  actionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  aiNotice: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  aiNoticeContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  aiNoticeTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  aiNoticeText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    lineHeight: 18,
  },
  reportSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  reportTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  reportText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  reportButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
});
