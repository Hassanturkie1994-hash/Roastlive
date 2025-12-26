import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description?: string;
  created_at: string;
}

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    if (!user?.id) return;
    try {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wallet) {
        setBalance(wallet.balance || 0);
        setTotalEarned(wallet.total_earned || 0);
      }

      const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(txs || []);
    } catch (error) {
      console.error('Load wallet error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return 'arrow-down-circle';
      case 'withdrawal': return 'arrow-up-circle';
      case 'gift_sent': return 'gift';
      case 'gift_received': return 'gift-outline';
      case 'payout': return 'cash';
      default: return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'gift_received': return theme.colors.success;
      case 'withdrawal':
      case 'gift_sent':
      case 'payout': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={[styles.transactionIcon, { backgroundColor: `${getTransactionColor(item.type)}20` }]}>
        <Ionicons name={getTransactionIcon(item.type) as any} size={24} color={getTransactionColor(item.type)} />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionType}>
          {item.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </Text>
        <Text style={styles.transactionDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.description && (
          <Text style={styles.transactionDesc}>{item.description}</Text>
        )}
      </View>
      <View style={styles.transactionAmount}>
        <Text style={[styles.amountText, { color: getTransactionColor(item.type) }]}>
          {item.type.includes('received') || item.type === 'deposit' ? '+' : '-'}{item.amount} SEK
        </Text>
        <Text style={styles.balanceText}>Balance: {item.balance_after} SEK</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity onPress={loadWallet}>
          <Ionicons name="refresh" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceValue}>{balance} SEK</Text>
          <Text style={styles.totalEarned}>Total Earned: {totalEarned} SEK</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="add-circle" size={32} color={theme.colors.success} />
            <Text style={styles.actionText}>Top Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/wallet/payout')}>
            <Ionicons name="cash" size={32} color={theme.colors.primary} />
            <Text style={styles.actionText}>Payout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="gift" size={32} color={theme.colors.gold} />
            <Text style={styles.actionText}>Gifts</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No transactions yet</Text>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  balanceCard: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  balanceValue: { fontSize: 48, fontWeight: theme.typography.weights.bold, color: theme.colors.primary, marginBottom: theme.spacing.sm },
  totalEarned: { fontSize: theme.typography.sizes.sm, color: theme.colors.success },
  actionsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  actionText: { fontSize: theme.typography.sizes.xs, color: theme.colors.text, marginTop: theme.spacing.xs },
  historySection: { paddingHorizontal: theme.spacing.md },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.md },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  transactionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  transactionInfo: { flex: 1 },
  transactionType: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  transactionDate: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginTop: 2 },
  transactionDesc: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginTop: 2 },
  transactionAmount: { alignItems: 'flex-end' },
  amountText: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold },
  balanceText: { fontSize: theme.typography.sizes.xs, color: theme.colors.textDisabled, marginTop: 2 },
  emptyText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, textAlign: 'center', padding: theme.spacing.xl },
});
