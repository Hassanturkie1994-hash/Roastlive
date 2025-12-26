import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { GIFTS, GiftTier } from '../../constants/gifts';

interface GiftPickerModalProps {
  visible: boolean;
  streamId: string;
  recipientId: string;
  recipientName: string;
  onClose: () => void;
  onGiftSent?: (gift: any) => void;
}

export default function GiftPickerModal({
  visible,
  streamId,
  recipientId,
  recipientName,
  onClose,
  onGiftSent,
}: GiftPickerModalProps) {
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<GiftTier>('low');
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadBalance();
    }
  }, [visible]);

  const loadBalance = async () => {
    try {
      const { data } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user?.id)
        .single();

      setUserBalance(data?.balance || 0);
    } catch (error) {
      console.error('Load balance error:', error);
    }
  };

  const sendGift = async (gift: any) => {
    if (userBalance < gift.cost) {
      Alert.alert('Insufficient Balance', `You need ${gift.cost} coins to send this gift.`);
      return;
    }

    setLoading(true);
    try {
      // Deduct from sender
      const { error: walletError } = await supabase.rpc('update_wallet_balance', {
        p_user_id: user?.id,
        p_amount: -gift.cost,
      });

      if (walletError) throw walletError;

      // Credit to recipient (70% of cost)
      const recipientAmount = Math.floor(gift.cost * 0.7);
      await supabase.rpc('update_wallet_balance', {
        p_user_id: recipientId,
        p_amount: recipientAmount,
      });

      // Record transaction
      const { error: txError } = await supabase.from('gift_transactions').insert({
        stream_id: streamId,
        sender_id: user?.id,
        recipient_id: recipientId,
        gift_id: gift.id,
        gift_name: gift.name,
        gift_emoji: gift.emoji,
        cost: gift.cost,
      });

      if (txError) throw txError;

      // Add to chat
      await supabase.from('stream_messages').insert({
        stream_id: streamId,
        user_id: user?.id,
        username: user?.email?.split('@')[0] || 'Anonymous',
        message: `sent ${gift.emoji} ${gift.name}!`,
        type: 'gift',
      });

      // Award XP to recipient
      const { awardXP } = await import('../../services/xpService');
      await awardXP(recipientId, 5, 'Gift Received', streamId);

      // Update balance locally
      setUserBalance(userBalance - gift.cost);
      
      onGiftSent?.(gift);
      Alert.alert('Gift Sent! 🎁', `You sent ${gift.name} to ${recipientName}!`);
    } catch (error: any) {
      console.error('Send gift error:', error);
      Alert.alert('Error', error.message || 'Failed to send gift');
    } finally {
      setLoading(false);
    }
  };

  const tierGifts = GIFTS.filter((g) => g.tier === selectedTier);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Send Gift to {recipientName}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Balance */}
        <View style={styles.balanceCard}>
          <Ionicons name="wallet" size={24} color={theme.colors.gold} />
          <Text style={styles.balanceText}>{userBalance.toLocaleString()} coins</Text>
          <TouchableOpacity style={styles.topUpButton}>
            <Text style={styles.topUpText}>Top Up</Text>
          </TouchableOpacity>
        </View>

        {/* Tier Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tierTabs}>
          {(['low', 'mid', 'high', 'ultra', 'nuclear'] as GiftTier[]).map((tier) => (
            <TouchableOpacity
              key={tier}
              style={[styles.tierTab, selectedTier === tier && styles.tierTabActive]}
              onPress={() => setSelectedTier(tier)}
            >
              <Text
                style={[styles.tierTabText, selectedTier === tier && styles.tierTabTextActive]}
              >
                {tier.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Gifts Grid */}
        <ScrollView style={styles.giftsContainer} contentContainerStyle={styles.giftsGrid}>
          {tierGifts.map((gift) => (
            <TouchableOpacity
              key={gift.id}
              style={styles.giftCard}
              onPress={() => sendGift(gift)}
              disabled={loading || userBalance < gift.cost}
            >
              <Text style={styles.giftEmoji}>{gift.emoji}</Text>
              <Text style={styles.giftName} numberOfLines={1}>
                {gift.name}
              </Text>
              <View
                style={[
                  styles.costBadge,
                  userBalance < gift.cost && styles.costBadgeInsufficient,
                ]}
              >
                <Ionicons name="flash" size={12} color="#fff" />
                <Text style={styles.costText}>{gift.cost}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
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
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    flex: 1,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  balanceText: {
    flex: 1,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  topUpButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  topUpText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  tierTabs: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  tierTab: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
  },
  tierTabActive: {
    backgroundColor: theme.colors.primary,
  },
  tierTabText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
  },
  tierTabTextActive: {
    color: '#fff',
  },
  giftsContainer: {
    flex: 1,
  },
  giftsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  giftCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    marginRight: '2.5%',
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftEmoji: {
    fontSize: 36,
    marginBottom: theme.spacing.xs,
  },
  giftName: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  costBadgeInsufficient: {
    backgroundColor: theme.colors.textDisabled,
  },
  costText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});
