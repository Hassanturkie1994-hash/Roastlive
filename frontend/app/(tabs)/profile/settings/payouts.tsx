import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';

export default function PayoutSettingsScreen() {
  const { user } = useAuth();
  const [payoutMethod, setPayoutMethod] = useState<'paypal' | 'bank' | 'stripe'>('paypal');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');

  const savePayoutSettings = () => {
    if (payoutMethod === 'paypal' && !paypalEmail) {
      Alert.alert('Error', 'Please enter your PayPal email');
      return;
    }

    if (payoutMethod === 'bank' && (!accountHolderName || !accountNumber || !routingNumber)) {
      Alert.alert('Error', 'Please fill in all bank details');
      return;
    }

    // In production: save to user_settings or separate payout_info table
    Alert.alert('Success', 'Payout settings saved successfully');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout Preferences</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="cash" size={24} color={theme.colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Withdraw Your Earnings</Text>
            <Text style={styles.infoText}>
              Set up your payout method to withdraw earnings from gifts, tips, and VIP subscriptions.
            </Text>
          </View>
        </View>

        {/* Payout Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout Method</Text>
          
          <TouchableOpacity
            style={[styles.methodCard, payoutMethod === 'paypal' && styles.methodCardSelected]}
            onPress={() => setPayoutMethod('paypal')}
          >
            <View style={styles.methodLeft}>
              <Ionicons name="logo-paypal" size={32} color={payoutMethod === 'paypal' ? theme.colors.primary : theme.colors.textSecondary} />
              <View>
                <Text style={styles.methodName}>PayPal</Text>
                <Text style={styles.methodDescription}>Fast & secure, 2-3 business days</Text>
              </View>
            </View>
            {payoutMethod === 'paypal' && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, payoutMethod === 'bank' && styles.methodCardSelected]}
            onPress={() => setPayoutMethod('bank')}
          >
            <View style={styles.methodLeft}>
              <Ionicons name="business" size={32} color={payoutMethod === 'bank' ? theme.colors.primary : theme.colors.textSecondary} />
              <View>
                <Text style={styles.methodName}>Bank Transfer</Text>
                <Text style={styles.methodDescription}>Direct deposit, 3-5 business days</Text>
              </View>
            </View>
            {payoutMethod === 'bank' && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, payoutMethod === 'stripe' && styles.methodCardSelected]}
            onPress={() => setPayoutMethod('stripe')}
          >
            <View style={styles.methodLeft}>
              <Ionicons name="card" size={32} color={payoutMethod === 'stripe' ? theme.colors.primary : theme.colors.textSecondary} />
              <View>
                <Text style={styles.methodName}>Stripe</Text>
                <Text style={styles.methodDescription}>Instant payouts available</Text>
              </View>
            </View>
            {payoutMethod === 'stripe' && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            )}
          </TouchableOpacity>
        </View>

        {/* Payout Details Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout Details</Text>
          
          {payoutMethod === 'paypal' && (
            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>PayPal Email</Text>
              <TextInput
                style={styles.textInput}
                placeholder="your@email.com"
                placeholderTextColor={theme.colors.textSecondary}
                value={paypalEmail}
                onChangeText={setPaypalEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          {payoutMethod === 'bank' && (
            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="John Doe"
                placeholderTextColor={theme.colors.textSecondary}
                value={accountHolderName}
                onChangeText={setAccountHolderName}
              />

              <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Account Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="••••••1234"
                placeholderTextColor={theme.colors.textSecondary}
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="number-pad"
                secureTextEntry
              />

              <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Routing Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="123456789"
                placeholderTextColor={theme.colors.textSecondary}
                value={routingNumber}
                onChangeText={setRoutingNumber}
                keyboardType="number-pad"
              />
            </View>
          )}

          {payoutMethod === 'stripe' && (
            <View style={styles.formCard}>
              <TouchableOpacity style={styles.stripeButton}>
                <Ionicons name="link" size={20} color={theme.colors.text} />
                <Text style={styles.stripeButtonText}>Connect Stripe Account</Text>
              </TouchableOpacity>
              <Text style={styles.stripeHint}>
                You'll be redirected to Stripe to securely link your account
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={savePayoutSettings}>
          <Text style={styles.saveButtonText}>Save Payout Settings</Text>
        </TouchableOpacity>

        <View style={styles.minimumCard}>
          <Ionicons name="information-circle" size={20} color={theme.colors.warning} />
          <Text style={styles.minimumText}>
            Minimum payout: $50. Payouts are processed on the 1st of each month.
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
  infoCard: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.success}10`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  infoTitle: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: 4 },
  infoText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, lineHeight: 18 },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  methodCardSelected: { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}05` },
  methodLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  methodName: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  methodDescription: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
  formCard: {
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  inputLabel: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  textInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.base,
  },
  stripeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  stripeButtonText: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  stripeHint: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: 'center' },
  saveButton: {
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  minimumCard: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.warning}10`,
    borderRadius: theme.borderRadius.lg,
  },
  minimumText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.text },
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
  settingCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cardLabel: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text, marginBottom: 4 },
  cardHint: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  input: {
    width: 60,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xl,
    textAlign: 'center',
    fontWeight: theme.typography.weights.bold,
  },
  guestsText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary },
  slowModeCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  slowModeLabel: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  slowModeInput: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  secondsText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  slowModeHint: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  linkLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  linkLabel: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  linkDescription: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
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
