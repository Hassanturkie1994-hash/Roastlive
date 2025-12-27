import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface CoinBundle {
  id: string;
  name: string;
  coins: number;
  bonus_coins: number;
  price_usd: number;
  icon: string;
  savings: number;
  badge?: string;
}

interface Wallet {
  balance: number;
  total_earned: number;
  total_spent: number;
}

export default function CoinStoreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [bundles, setBundles] = useState<CoinBundle[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load coin bundles
      const bundlesResponse = await fetch(`${BACKEND_URL}/api/coins/bundles`);
      const bundlesData = await bundlesResponse.json();
      setBundles(bundlesData.bundles || []);

      // Load wallet balance
      if (user?.id) {
        await loadWallet();
      }
    } catch (error) {
      console.error('Load data error:', error);
      Alert.alert('Error', 'Failed to load coin store');
    } finally {
      setLoading(false);
    }
  };

  const loadWallet = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/coins/balance/${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setWallet(data);
      }
    } catch (error) {
      console.error('Load wallet error:', error);
    }
  };

  const handlePurchase = async (bundle: CoinBundle) => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to purchase coins');
      return;
    }

    Alert.alert(
      'Purchase Coins',
      `Purchase ${bundle.name} for $${bundle.price_usd.toFixed(2)}?\n\nYou'll receive: ${bundle.coins + bundle.bonus_coins} coins`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            setPurchasing(bundle.id);
            try {
              const response = await fetch(`${BACKEND_URL}/api/coins/purchase`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_id: user.id,
                  bundle_id: bundle.id,
                }),
              });

              const data = await response.json();

              if (response.ok) {
                Alert.alert(
                  'Purchase Successful! 🎉',
                  `${data.coins_added} coins added to your wallet\n${data.mock_mode ? '(Test Mode)' : ''}`,
                  [{ text: 'OK', onPress: loadWallet }]
                );
              } else {
                Alert.alert('Purchase Failed', data.detail || 'Please try again');
              }
            } catch (error) {
              console.error('Purchase error:', error);
              Alert.alert('Error', 'Failed to process purchase');
            } finally {
              setPurchasing(null);
            }
          },
        },
      ]
    );
  };

  const getBundleColor = (bundleId: string) => {
    const colors: { [key: string]: string } = {
      starter: '#667eea',
      basic: '#764ba2',
      popular: '#f093fb',
      premium: '#4facfe',
      whale: '#43e97b',
      nuclear: '#fa709a',
    };
    return colors[bundleId] || theme.colors.primary;
  };

  const renderBundle = (bundle: CoinBundle) => {
    const totalCoins = bundle.coins + bundle.bonus_coins;
    const isPurchasing = purchasing === bundle.id;
    const bundleColor = getBundleColor(bundle.id);

    return (
      <TouchableOpacity
        key={bundle.id}
        style={[styles.bundleCard, { borderColor: bundleColor }]}
        onPress={() => handlePurchase(bundle)}
        disabled={isPurchasing}
        activeOpacity={0.7}
      >
        {bundle.badge && (
          <View style={[styles.badge, { backgroundColor: bundleColor }]}>
            <Text style={styles.badgeText}>{bundle.badge}</Text>
          </View>
        )}

        <View style={styles.bundleHeader}>
          <Text style={styles.bundleIcon}>{bundle.icon}</Text>
          <Text style={styles.bundleName}>{bundle.name}</Text>
        </View>

        <View style={styles.bundleContent}>
          <View style={styles.coinsInfo}>
            <Text style={styles.coinsAmount}>{totalCoins.toLocaleString()}</Text>
            <Text style={styles.coinsLabel}>COINS</Text>
          </View>

          {bundle.bonus_coins > 0 && (
            <View style={[styles.bonusTag, { backgroundColor: `${bundleColor}20` }]}>
              <Text style={[styles.bonusText, { color: bundleColor }]}>
                +{bundle.bonus_coins} BONUS
              </Text>
            </View>
          )}

          {bundle.savings > 0 && (
            <Text style={[styles.savings, { color: bundleColor }]}>
              Save {bundle.savings}%
            </Text>
          )}
        </View>

        <View style={[styles.purchaseButton, { backgroundColor: bundleColor }]}>
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.priceText}>${bundle.price_usd.toFixed(2)}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Coin Store</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coin Store</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Balance */}
        {wallet && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Ionicons name="wallet" size={24} color={theme.colors.primary} />
              <Text style={styles.balanceLabel}>Current Balance</Text>
            </View>
            <Text style={styles.balanceAmount}>{wallet.balance.toLocaleString()} 💎</Text>
            <Text style={styles.balanceSubtext}>
              Total Earned: {wallet.total_earned.toLocaleString()} • Spent: {wallet.total_spent.toLocaleString()}
            </Text>
          </View>
        )}

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Use coins to send gifts during live streams and support your favorite creators!
          </Text>
        </View>

        {/* Coin Bundles */}
        <Text style={styles.sectionTitle}>💎 Coin Bundles</Text>
        <View style={styles.bundlesGrid}>
          {bundles.map((bundle) => renderBundle(bundle))}
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Why Buy Coins?</Text>
          <View style={styles.featureItem}>
            <Ionicons name="gift" size={24} color={theme.colors.primary} />
            <Text style={styles.featureText}>Send exclusive gifts to streamers</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="trophy" size={24} color={theme.colors.success} />
            <Text style={styles.featureText}>Appear on top gifter leaderboards</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="star" size={24} color={theme.colors.warning} />
            <Text style={styles.featureText}>Unlock special reactions & effects</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="heart" size={24} color={theme.colors.error} />
            <Text style={styles.featureText}>Support your favorite creators</Text>
          </View>
        </View>

        {/* Test Mode Notice */}
        <View style={styles.testModeNotice}>
          <Ionicons name="flask" size={16} color={theme.colors.warning} />
          <Text style={styles.testModeText}>
            🧪 Test Mode: No real charges will be made
          </Text>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: theme.colors.card,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  balanceSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.primary}15`,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  bundlesGrid: {
    paddingHorizontal: 16,
  },
  bundleCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bundleHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bundleIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  bundleName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  bundleContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  coinsInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  coinsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  coinsLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  bonusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  bonusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  savings: {
    fontSize: 14,
    fontWeight: '600',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  featuresSection: {
    marginTop: 24,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 12,
  },
  testModeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: `${theme.colors.warning}15`,
    borderRadius: 8,
  },
  testModeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
});
