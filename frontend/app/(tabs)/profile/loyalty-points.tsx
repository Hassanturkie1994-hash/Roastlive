import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Reward {
  id: string;
  name: string;
  cost: number;
  icon: string;
}

export default function LoyaltyPointsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [rank, setRank] = useState('Bronze');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load balance
      const balanceResponse = await fetch(`${BACKEND_URL}/api/loyalty/balance/${user?.id}`);
      const balanceData = await balanceResponse.json();
      setBalance(balanceData.balance || 0);
      setRank(balanceData.rank || 'Bronze');

      // Load rewards
      const rewardsResponse = await fetch(`${BACKEND_URL}/api/loyalty/rewards`);
      const rewardsData = await rewardsResponse.json();
      setRewards(rewardsData.rewards || []);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (reward: Reward) => {
    if (balance < reward.cost) {
      Alert.alert('Insufficient Points', `You need ${reward.cost - balance} more points to redeem this reward.`);
      return;
    }

    Alert.alert(
      'Redeem Reward',
      `Redeem ${reward.name} for ${reward.cost} points?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            setRedeeming(reward.id);
            try {
              const response = await fetch(`${BACKEND_URL}/api/loyalty/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: user?.id,
                  reward_id: reward.id,
                  cost: reward.cost,
                }),
              });

              const data = await response.json();

              if (response.ok) {
                Alert.alert('Success! 🎉', `You redeemed ${reward.name}!`, [
                  { text: 'OK', onPress: loadData },
                ]);
              } else {
                Alert.alert('Redemption Failed', data.detail || 'Please try again');
              }
            } catch (error) {
              console.error('Redeem error:', error);
              Alert.alert('Error', 'Failed to redeem reward');
            } finally {
              setRedeeming(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loyalty Points</Text>
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
        <Text style={styles.headerTitle}>Loyalty Points</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="star" size={24} color={theme.colors.warning} />
            <Text style={styles.balanceLabel}>Current Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>{balance.toLocaleString()} pts</Text>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>{rank} Tier</Text>
          </View>
        </View>

        {/* How to Earn */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Earn Points</Text>
          <View style={styles.earnItem}>
            <Ionicons name="eye" size={20} color={theme.colors.primary} />
            <Text style={styles.earnText}>Watch streams (10 pts per 10 min)</Text>
          </View>
          <View style={styles.earnItem}>
            <Ionicons name="chatbubble" size={20} color={theme.colors.primary} />
            <Text style={styles.earnText}>Send messages (1 pt each)</Text>
          </View>
          <View style={styles.earnItem}>
            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
            <Text style={styles.earnText}>Daily login (50 pts)</Text>
          </View>
          <View style={styles.earnItem}>
            <Ionicons name="heart" size={20} color={theme.colors.primary} />
            <Text style={styles.earnText}>Send reactions (2 pts each)</Text>
          </View>
        </View>

        {/* Available Rewards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>
          {rewards.map((reward) => {
            const canAfford = balance >= reward.cost;
            const isRedeeming = redeeming === reward.id;

            return (
              <TouchableOpacity
                key={reward.id}
                style={[
                  styles.rewardCard,
                  !canAfford && styles.rewardCardDisabled,
                ]}
                onPress={() => handleRedeem(reward)}
                disabled={!canAfford || isRedeeming}
                activeOpacity={0.7}
              >
                <View style={styles.rewardIcon}>
                  <Text style={styles.rewardIconText}>{reward.icon}</Text>
                </View>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardName}>{reward.name}</Text>
                  <View style={styles.rewardCost}>
                    <Ionicons name="star" size={14} color={theme.colors.warning} />
                    <Text style={styles.rewardCostText}>{reward.cost} pts</Text>
                  </View>
                </View>
                {isRedeeming ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <Ionicons
                    name={canAfford ? 'arrow-forward-circle' : 'lock-closed'}
                    size={24}
                    color={canAfford ? theme.colors.primary : theme.colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
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
    padding: 24,
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
    fontSize: 40,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  rankBadge: {
    backgroundColor: `${theme.colors.warning}20`,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.warning,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  earnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  earnText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 12,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rewardCardDisabled: {
    opacity: 0.5,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rewardIconText: {
    fontSize: 24,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  rewardCost: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardCostText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
});