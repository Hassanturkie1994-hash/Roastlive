import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface WalletTransaction {
  id: string;
  type: 'deposit' | 'gift_sent' | 'gift_received' | 'payout' | 'refund';
  amount: number;
  balance_after: number;
  description?: string;
  created_at: string;
}

const COIN_PACKAGES = [
  { id: 'starter', coins: 100, price: 0.99, bonus: 0 },
  { id: 'basic', coins: 500, price: 4.99, bonus: 50 },
  { id: 'popular', coins: 1000, price: 9.99, bonus: 150, popular: true },
  { id: 'value', coins: 2500, price: 19.99, bonus: 500 },
  { id: 'premium', coins: 5000, price: 39.99, bonus: 1500 },
  { id: 'mega', coins: 10000, price: 79.99, bonus: 4000 },
];

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    if (!user?.id) return;

    try {
      // Get wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') throw walletError;

      if (wallet) {
        setBalance(wallet.balance);
        setTotalEarned(wallet.total_earned);
        setTotalSpent(wallet.total_spent);

        // Get transactions
        const { data: txns, error: txnError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', wallet.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (txnError) throw txnError;
        setTransactions(txns || []);
      } else {
        // Create wallet if doesn't exist
        await supabase.from('wallets').insert({ user_id: user.id, balance: 0 });
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePurchase = async (pkg: typeof COIN_PACKAGES[0]) => {
    // Demo: Add coins directly (In production, integrate Stripe/Apple Pay)
    const totalCoins = pkg.coins + pkg.bonus;

    Alert.alert(
      'Demo Purchase',
      `This would purchase ${totalCoins.toLocaleString()} coins for $${pkg.price}. Adding coins for demo.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Coins',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('add_wallet_balance', {
                p_user_id: user?.id,
                p_amount: totalCoins,
                p_type: 'deposit',
              });

              if (error) throw error;
              loadWalletData();
              Alert.alert('Success', `${totalCoins.toLocaleString()} coins added!`);
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'Failed to add coins');
            }
          },
        },
      ]
    );
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return { name: 'add-circle', color: theme.colors.success };
      case 'gift_sent': return { name: 'gift', color: theme.colors.error };
      case 'gift_received': return { name: 'gift', color: theme.colors.success };
      case 'payout': return { name: 'cash', color: theme.colors.warning };
      case 'refund': return { name: 'refresh-circle', color: theme.colors.info };
      default: return { name: 'help-circle', color: theme.colors.textSecondary };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

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
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadWalletData();
          }} />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet" size={32} color={theme.colors.gold} />
            <Text style={styles.balanceLabel}>Your Balance</Text>
          </View>
          <View style={styles.balanceRow}>
            <Ionicons name="logo-bitcoin" size={36} color={theme.colors.gold} />
            <Text style={styles.balanceAmount}>{balance.toLocaleString()}</Text>
          </View>
          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <Text style={styles.statLabel}>Total Earned</Text>
              <Text style={[styles.statValue, { color: theme.colors.success }]}>
                +{totalEarned.toLocaleString()}
              </Text>
            </View>
            <View style={styles.balanceStatDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={[styles.statValue, { color: theme.colors.error }]}>
                -{totalSpent.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Buy Coins Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buy Coins</Text>
          <View style={styles.packagesGrid}>
            {COIN_PACKAGES.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={[styles.packageCard, pkg.popular && styles.packageCardPopular]}
                onPress={() => handlePurchase(pkg)}
              >
                {pkg.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                  </View>
                )}
                <View style={styles.packageCoinsRow}>
                  <Ionicons name="logo-bitcoin" size={16} color={theme.colors.gold} />
                  <Text style={styles.packageCoins}>{pkg.coins.toLocaleString()}</Text>
                </View>
                {pkg.bonus > 0 && (
                  <Text style={styles.packageBonus}>+{pkg.bonus} bonus</Text>
                )}
                <Text style={styles.packagePrice}>${pkg.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map((txn) => {
                const icon = getTransactionIcon(txn.type);
                const isPositive = txn.amount > 0;
                return (
                  <View key={txn.id} style={styles.transactionItem}>
                    <View style={[styles.transactionIcon, { backgroundColor: `${icon.color}20` }]}>
                      <Ionicons name={icon.name as any} size={20} color={icon.color} />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionType}>
                        {txn.type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Text>
                      <Text style={styles.transactionDate}>{formatDate(txn.created_at)}</Text>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      isPositive ? styles.amountPositive : styles.amountNegative,
                    ]}>
                      {isPositive ? '+' : ''}{txn.amount.toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={theme.colors.info} />
          <Text style={styles.infoText}>
            Coins can be used to send gifts to streamers. Creators earn 70% of gift value.
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
    borderRadius: theme.borderRadius.xl, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.gold,
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  balanceLabel: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, marginLeft: theme.spacing.sm },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg },
  balanceAmount: { fontSize: 48, fontWeight: theme.typography.weights.bold, color: theme.colors.gold, marginLeft: theme.spacing.sm },
  balanceStats: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatDivider: { width: 1, height: 30, backgroundColor: theme.colors.border },
  statLabel: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginBottom: 4 },
  statValue: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold },
  section: { padding: theme.spacing.md },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.md },
  packagesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  packageCard: {
    width: '48%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md, marginBottom: theme.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border,
  },
  packageCardPopular: { borderColor: theme.colors.gold, borderWidth: 2 },
  popularBadge: { position: 'absolute', top: -10, backgroundColor: theme.colors.gold, paddingHorizontal: theme.spacing.sm, paddingVertical: 2, borderRadius: theme.borderRadius.sm },
  popularBadgeText: { fontSize: 10, fontWeight: theme.typography.weights.bold, color: '#000' },
  packageCoinsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  packageCoins: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginLeft: 4 },
  packageBonus: { fontSize: theme.typography.sizes.sm, color: theme.colors.success, fontWeight: theme.typography.weights.semibold, marginBottom: theme.spacing.sm },
  packagePrice: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.primary },
  transactionsList: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg },
  transactionItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  transactionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  transactionInfo: { flex: 1, marginLeft: theme.spacing.md },
  transactionType: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  transactionDate: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
  transactionAmount: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold },
  amountPositive: { color: theme.colors.success },
  amountNegative: { color: theme.colors.error },
  emptyTransactions: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: `${theme.colors.info}15`, margin: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.xxl },
  infoText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.info, marginLeft: theme.spacing.sm },
});
