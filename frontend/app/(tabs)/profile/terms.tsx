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

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.date}>Last updated: December 2024</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing and using Roast Live, you accept and agree to be bound by these Terms of Service.
        </Text>

        <Text style={styles.sectionTitle}>2. Age Requirement</Text>
        <Text style={styles.paragraph}>
          You must be at least 18 years old to use Roast Live. By using the service, you confirm that you meet this age requirement.
        </Text>

        <Text style={styles.sectionTitle}>3. User Conduct</Text>
        <Text style={styles.paragraph}>
          Users must engage in respectful roast battles and entertainment. Harassment, hate speech, threats, and inappropriate content are strictly prohibited.
        </Text>

        <Text style={styles.sectionTitle}>4. Content Policy</Text>
        <Text style={styles.paragraph}>
          All content must comply with our Community Rules. Content that violates our policies may be removed, and accounts may be suspended or terminated.
        </Text>

        <Text style={styles.sectionTitle}>5. Virtual Goods & Payments</Text>
        <Text style={styles.paragraph}>
          Virtual gifts are digital goods with no real-world value. All purchases are final and non-refundable except as required by law.
        </Text>

        <Text style={styles.sectionTitle}>6. Creator Earnings</Text>
        <Text style={styles.paragraph}>
          Creators may earn revenue from gifts and VIP subscriptions. Roast Live retains a platform fee from all transactions.
        </Text>

        <Text style={styles.sectionTitle}>7. Moderation</Text>
        <Text style={styles.paragraph}>
          We use AI and human moderation to enforce our policies. Repeated violations may result in permanent account suspension.
        </Text>

        <Text style={styles.sectionTitle}>8. Privacy</Text>
        <Text style={styles.paragraph}>
          Your privacy is important to us. Please review our Privacy Policy to understand how we collect and use your information.
        </Text>

        <Text style={styles.sectionTitle}>9. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
        </Text>

        <Text style={styles.sectionTitle}>10. Contact</Text>
        <Text style={styles.paragraph}>
          For questions about these terms, please contact us at support@roastlive.com
        </Text>

        <View style={{ height: 40 }} />
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
    padding: theme.spacing.lg,
  },
  date: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  paragraph: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
});