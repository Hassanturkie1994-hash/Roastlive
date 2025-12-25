import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const COMMUNITY_RULES = [
  {
    title: '🎭 Roasting is Entertainment',
    description: 'Roasting must be mutual and consensual. Both parties agree to participate in good faith for entertainment purposes.',
  },
  {
    title: '🚫 No Hate Speech',
    description: 'No targeting based on race, ethnicity, religion, gender, sexual orientation, disability, or other protected characteristics.',
  },
  {
    title: '⚠️ No Real Threats',
    description: 'No genuine threats of violence, doxxing, swatting, or any actions that could cause real-world harm.',
  },
  {
    title: '🔞 Age-Appropriate Content',
    description: 'No explicit sexual content, nudity, or content inappropriate for the platform\'s age rating.',
  },
  {
    title: '🛡️ Respect Boundaries',
    description: 'If someone asks to stop or shows genuine distress, the roasting stops. "No" means no.',
  },
  {
    title: '📵 No Harassment Outside Streams',
    description: 'What happens in the battle stays in the battle. No continuing harassment in DMs or on other platforms.',
  },
  {
    title: '💰 Fair Play',
    description: 'No manipulation of battles, vote manipulation, or exploiting bugs for unfair advantages.',
  },
  {
    title: '🎬 Original Content',
    description: 'Don\'t copy others\' material. Be original. Plagiarism isn\'t roasting, it\'s just lazy.',
  },
];

export default function CommunityRulesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!accepted) {
      Alert.alert('Please Accept', 'You must accept the community rules to continue.');
      return;
    }

    setLoading(true);
    try {
      // Update user profile with rules acceptance
      const { error } = await supabase
        .from('profiles')
        .update({
          rules_accepted: true,
          rules_accepted_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error accepting rules:', error);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🔥</Text>
          <Text style={styles.logoText}>Roast Live</Text>
        </View>
        <Text style={styles.headerTitle}>Community Rules</Text>
        <Text style={styles.headerSubtitle}>
          Please read and accept our community guidelines before streaming
        </Text>
      </View>

      {/* Rules List */}
      <ScrollView style={styles.rulesContainer} showsVerticalScrollIndicator={false}>
        {COMMUNITY_RULES.map((rule, index) => (
          <View key={index} style={styles.ruleCard}>
            <Text style={styles.ruleTitle}>{rule.title}</Text>
            <Text style={styles.ruleDescription}>{rule.description}</Text>
          </View>
        ))}

        {/* Consequences */}
        <View style={styles.consequencesCard}>
          <Ionicons name="warning" size={24} color={theme.colors.warning} />
          <Text style={styles.consequencesTitle}>Rule Violations</Text>
          <Text style={styles.consequencesText}>
            Breaking these rules may result in:
          </Text>
          <View style={styles.consequencesList}>
            <Text style={styles.consequenceItem}>• Stream termination</Text>
            <Text style={styles.consequenceItem}>• Temporary suspension</Text>
            <Text style={styles.consequenceItem}>• Permanent ban</Text>
            <Text style={styles.consequenceItem}>• Loss of earnings</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Accept Section */}
      <View style={styles.acceptSection}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAccepted(!accepted)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Ionicons name="checkmark" size={18} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read and agree to the Community Rules
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, !accepted && styles.acceptButtonDisabled]}
          onPress={handleAccept}
          disabled={!accepted || loading}
        >
          <Text style={styles.acceptButtonText}>
            {loading ? 'Saving...' : 'Accept & Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing.xxl + 20,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  logoEmoji: {
    fontSize: 32,
    marginRight: theme.spacing.sm,
  },
  logoText: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  rulesContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
  ruleCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  ruleTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  ruleDescription: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  consequencesCard: {
    backgroundColor: `${theme.colors.warning}15`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  consequencesTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.warning,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  consequencesText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  consequencesList: {
    alignSelf: 'flex-start',
  },
  consequenceItem: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  acceptSection: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: theme.colors.textDisabled,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
});
