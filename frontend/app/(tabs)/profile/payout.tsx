import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface PayoutRequest {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  payout_method: string;
  account_details: string;
  created_at: string;
  processed_at?: string;
}

const PAYOUT_METHODS = [
  { id: 'bank', name: 'Bank Transfer', icon: 'business', minAmount: 500 },
  { id: 'swish', name: 'Swish', icon: 'phone-portrait', minAmount: 100 },
  { id: 'paypal', name: 'PayPal', icon: 'logo-paypal', minAmount: 200 },
];

export default function PayoutScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [balance, setBalance] = useState(0);
  const [pendingPayout, setPendingPayout] = useState(0);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [accountDetails, setAccountDetails] = useState('');

  useEffect(() => {
    loadPayoutData();
  }, []);

  const loadPayoutData = async () => {
    if (!user?.id) return;

    try {
      // Get wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance, total_earned')
        .eq('user_id', user.id)
        .single();

      setBalance(wallet?.balance || 0);

      // Get payout history
      const { data: payouts } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setPayoutHistory(payouts || []);

      // Calculate pending payouts
      const pending = (payouts || [])
        .filter((p) => p.status === 'pending' || p.status === 'processing')
        .reduce((sum, p) => sum + p.amount, 0);
      setPendingPayout(pending);
    } catch (error) {
      console.error('Error loading payout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!selectedMethod || !amount || !accountDetails) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amountNum = parseInt(amount);
    const method = PAYOUT_METHODS.find((m) => m.id === selectedMethod);

    if (!method) return;

    if (amountNum < method.minAmount) {
      Alert.alert('Error', `Minimum payout for ${method.name} is ${method.minAmount} SEK`);
      return;
    }

    if (amountNum > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    setRequesting(true);

    try {
      // Create payout request
      const { error } = await supabase.from('payout_requests').insert({
        user_id: user?.id,
        amount: amountNum,
        payout_method: selectedMethod,
        account_details: accountDetails,
        status: 'pending',
      });

      if (error) throw error;

      // Deduct from wallet (hold funds)
      await supabase
        .from('wallets')
        .update({ balance: balance - amountNum })
        .eq('user_id', user?.id);

      Alert.alert('Success', 'Payout request submitted! You will receive your funds within 3-5 business days.');
      setShowForm(false);
      setAmount('');
      setAccountDetails('');
      setSelectedMethod(null);
      loadPayoutData();
    } catch (error) {
      console.error('Error requesting payout:', error);
      Alert.alert('Error', 'Failed to submit payout request');
    } finally {
      setRequesting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.colors.success;
      case 'pending': return theme.colors.warning;
      case 'processing': return theme.colors.info;
      case 'rejected': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const availableBalance = balance - pendingPayout;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payouts</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{availableBalance.toLocaleString()} SEK</Text>
          {pendingPayout > 0 && (
            <Text style={styles.pendingText}>{pendingPayout.toLocaleString()} SEK pending</Text>
          )}
          <TouchableOpacity
            style={[styles.requestButton, availableBalance < 100 && styles.requestButtonDisabled]}
            onPress={() => setShowForm(true)}
            disabled={availableBalance < 100}
          >
            <Ionicons name="cash-outline" size={20} color="#fff" />
            <Text style={styles.requestButtonText}>Request Payout</Text>
          </TouchableOpacity>
          {availableBalance < 100 && (
            <Text style={styles.minBalanceText}>Minimum 100 SEK required</Text>
          )}
        </View>

        {/* Payout Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Request Payout</Text>

            {/* Method Selection */}
            <Text style={styles.inputLabel}>Payout Method</Text>
            <View style={styles.methodsGrid}>
              {PAYOUT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodCard,
                    selectedMethod === method.id && styles.methodCardSelected,
                  ]}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <Ionicons
                    name={method.icon as any}
                    size={24}
                    color={selectedMethod === method.id ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[
                    styles.methodName,
                    selectedMethod === method.id && styles.methodNameSelected,
                  ]}>
                    {method.name}
                  </Text>
                  <Text style={styles.methodMin}>Min: {method.minAmount} SEK</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <Text style={styles.inputLabel}>Amount (SEK)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            {/* Account Details */}
            <Text style={styles.inputLabel}>
              {selectedMethod === 'bank' ? 'Bank Account Number' :
               selectedMethod === 'swish' ? 'Swish Number' :
               selectedMethod === 'paypal' ? 'PayPal Email' : 'Account Details'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter account details"
              placeholderTextColor={theme.colors.textSecondary}
              value={accountDetails}
              onChangeText={setAccountDetails}
            />

            {/* Buttons */}
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleRequestPayout}
                disabled={requesting}
              >
                {requesting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Payout History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout History</Text>
          {payoutHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No payouts yet</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {payoutHistory.map((payout) => (
                <View key={payout.id} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyAmount}>{payout.amount.toLocaleString()} SEK</Text>
                    <Text style={styles.historyMethod}>{payout.payout_method}</Text>
                    <Text style={styles.historyDate}>{formatDate(payout.created_at)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(payout.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(payout.status) }]}>
                      {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={theme.colors.info} />
          <Text style={styles.infoText}>
            Payouts are processed within 3-5 business days. A 5% processing fee applies to all withdrawals.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xxl + 10, paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1 },
  balanceCard: {
    backgroundColor: theme.colors.surface, margin: theme.spacing.md, padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.success,
  },
  balanceLabel: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary },
  balanceAmount: { fontSize: 48, fontWeight: theme.typography.weights.bold, color: theme.colors.success, marginVertical: theme.spacing.sm },
  pendingText: { fontSize: theme.typography.sizes.sm, color: theme.colors.warning, marginBottom: theme.spacing.md },
  requestButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.md,
  },
  requestButtonDisabled: { backgroundColor: theme.colors.textDisabled },
  requestButtonText: { color: '#fff', fontWeight: theme.typography.weights.bold, marginLeft: theme.spacing.sm },
  minBalanceText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  formCard: { backgroundColor: theme.colors.surface, margin: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg },
  formTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.lg },
  inputLabel: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  input: {
    backgroundColor: theme.colors.surfaceLight, borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontSize: theme.typography.sizes.base, color: theme.colors.text,
  },
  methodsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  methodCard: {
    flex: 1, alignItems: 'center', backgroundColor: theme.colors.surfaceLight,
    padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginHorizontal: 2, borderWidth: 2, borderColor: 'transparent',
  },
  methodCardSelected: { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}10` },
  methodName: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.text, marginTop: theme.spacing.xs },
  methodNameSelected: { color: theme.colors.primary },
  methodMin: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
  formButtons: { flexDirection: 'row', marginTop: theme.spacing.xl },
  cancelButton: { flex: 1, paddingVertical: theme.spacing.md, alignItems: 'center', marginRight: theme.spacing.sm },
  cancelButtonText: { color: theme.colors.textSecondary, fontWeight: theme.typography.weights.semibold },
  submitButton: { flex: 2, backgroundColor: theme.colors.success, paddingVertical: theme.spacing.md, alignItems: 'center', borderRadius: theme.borderRadius.md },
  submitButtonText: { color: '#fff', fontWeight: theme.typography.weights.bold },
  section: { padding: theme.spacing.md },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.md },
  emptyHistory: { backgroundColor: theme.colors.surface, padding: theme.spacing.xl, borderRadius: theme.borderRadius.lg, alignItems: 'center' },
  emptyText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  historyList: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg },
  historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  historyLeft: { flex: 1 },
  historyAmount: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  historyMethod: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
  historyDate: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.sm },
  statusText: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: `${theme.colors.info}15`,
    margin: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.xxl,
  },
  infoText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.info, marginLeft: theme.spacing.sm },
});
