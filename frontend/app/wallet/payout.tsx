import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function PayoutRequestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!paymentDetails.trim()) {
      Alert.alert('Error', 'Please enter payment details');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('payout_requests').insert({
        user_id: user?.id,
        amount: parseInt(amount),
        payment_method: paymentMethod,
        payment_details: { details: paymentDetails },
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert('Success', 'Payout request submitted! An admin will review it shortly.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit payout request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Payout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={theme.colors.info} />
          <Text style={styles.infoText}>
            Payout requests are reviewed by admins within 2-3 business days. Minimum payout is 100 SEK.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Amount (SEK)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            placeholderTextColor={theme.colors.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.methodButtons}>
            {['bank_transfer', 'paypal', 'stripe'].map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.methodButton,
                  paymentMethod === method && styles.methodButtonActive,
                ]}
                onPress={() => setPaymentMethod(method)}
              >
                <Text style={[
                  styles.methodText,
                  paymentMethod === method && styles.methodTextActive,
                ]}>
                  {method.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Payment Details</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Bank account, PayPal email, etc."
            placeholderTextColor={theme.colors.textSecondary}
            value={paymentDetails}
            onChangeText={setPaymentDetails}
            multiline
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Text>
          </TouchableOpacity>
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
    paddingTop: theme.spacing.xxl + 10,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1, padding: theme.spacing.md },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.info}20`,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
  },
  infoText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.info, marginLeft: theme.spacing.sm },
  form: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
  label: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text, marginBottom: theme.spacing.sm },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  methodButtons: { flexDirection: 'row', marginBottom: theme.spacing.lg },
  methodButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  methodButtonActive: { backgroundColor: theme.colors.primaryLight },
  methodText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  methodTextActive: { color: theme.colors.primary, fontWeight: theme.typography.weights.bold },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  submitButtonText: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: '#fff' },
});
