import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

// Gift Tiers
export type GiftTier = 'basic' | 'mid' | 'high' | 'ultra' | 'nuclear';

export interface Gift {
  id: string;
  name: string;
  emoji: string;
  tier: GiftTier;
  cost: number;
  animation_type: 'simple' | 'burst' | 'shower' | 'takeover';
  battle_points?: number;
  description: string;
}

// Gift Catalog
export const GIFT_CATALOG: Gift[] = [
  // Basic Tier (1-50 coins)
  { id: 'clap', name: 'Clap', emoji: '👏', tier: 'basic', cost: 5, animation_type: 'simple', battle_points: 1, description: 'Show appreciation' },
  { id: 'laugh', name: 'Laugh', emoji: '😂', tier: 'basic', cost: 10, animation_type: 'simple', battle_points: 2, description: 'That was funny!' },
  { id: 'fire', name: 'Fire', emoji: '🔥', tier: 'basic', cost: 20, animation_type: 'simple', battle_points: 4, description: 'That burn was hot!' },
  { id: 'heart', name: 'Heart', emoji: '❤️', tier: 'basic', cost: 30, animation_type: 'simple', battle_points: 6, description: 'Spread the love' },
  { id: 'skull', name: 'Skull', emoji: '💀', tier: 'basic', cost: 50, animation_type: 'simple', battle_points: 10, description: 'I\'m dead!' },
  
  // Mid Tier (100-500 coins)
  { id: 'mic_drop', name: 'Mic Drop', emoji: '🎤', tier: 'mid', cost: 100, animation_type: 'burst', battle_points: 25, description: 'Devastating roast!' },
  { id: 'crown', name: 'Crown', emoji: '👑', tier: 'mid', cost: 200, animation_type: 'burst', battle_points: 50, description: 'Roast royalty' },
  { id: 'trophy', name: 'Trophy', emoji: '🏆', tier: 'mid', cost: 300, animation_type: 'burst', battle_points: 75, description: 'Champion move!' },
  { id: 'rocket', name: 'Rocket', emoji: '🚀', tier: 'mid', cost: 500, animation_type: 'shower', battle_points: 125, description: 'To the moon!' },
  
  // High Tier (1000-2000 coins)
  { id: 'diamond', name: 'Diamond', emoji: '💎', tier: 'high', cost: 1000, animation_type: 'shower', battle_points: 250, description: 'Precious roast' },
  { id: 'tornado', name: 'Tornado', emoji: '🌪️', tier: 'high', cost: 1500, animation_type: 'shower', battle_points: 400, description: 'Devastating storm!' },
  { id: 'bomb', name: 'Bomb', emoji: '💣', tier: 'high', cost: 2000, animation_type: 'shower', battle_points: 500, description: 'BOOM! Total destruction' },
  
  // Ultra Tier (5000-10000 coins)
  { id: 'nuke', name: 'Nuke', emoji: '☢️', tier: 'ultra', cost: 5000, animation_type: 'takeover', battle_points: 1250, description: 'Nuclear roast!' },
  { id: 'galaxy', name: 'Galaxy', emoji: '🌌', tier: 'ultra', cost: 7500, animation_type: 'takeover', battle_points: 2000, description: 'Universal destruction' },
  { id: 'supernova', name: 'Supernova', emoji: '🌟', tier: 'ultra', cost: 10000, animation_type: 'takeover', battle_points: 2500, description: 'Stellar explosion!' },
  
  // Nuclear Tier (25000+ coins) - Screen takeover
  { id: 'black_hole', name: 'Black Hole', emoji: '🕳️', tier: 'nuclear', cost: 25000, animation_type: 'takeover', battle_points: 7500, description: 'Everything gets sucked in!' },
  { id: 'big_bang', name: 'Big Bang', emoji: '💥', tier: 'nuclear', cost: 50000, animation_type: 'takeover', battle_points: 15000, description: 'Universe-creating roast!' },
];

interface GiftPickerProps {
  visible: boolean;
  onClose: () => void;
  streamId: string;
  recipientId: string;
  recipientName: string;
  isBattleMode?: boolean;
  battleTeam?: 'team_a' | 'team_b';
  onGiftSent?: (gift: Gift) => void;
}

export default function GiftPicker({
  visible,
  onClose,
  streamId,
  recipientId,
  recipientName,
  isBattleMode = false,
  battleTeam,
  onGiftSent,
}: GiftPickerProps) {
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<GiftTier>('basic');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadBalance();
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const loadBalance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setBalance(data?.balance || 0);
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendGift = async (gift: Gift) => {
    if (!user?.id) return;
    if (balance < gift.cost) {
      Alert.alert('Insufficient Balance', `You need ${gift.cost - balance} more coins to send this gift.`);
      return;
    }

    setSending(true);
    setSelectedGift(gift);

    try {
      // Deduct from wallet
      const { error: walletError } = await supabase.rpc('deduct_wallet_balance', {
        p_user_id: user.id,
        p_amount: gift.cost,
      });

      if (walletError) throw walletError;

      // Record the gift transaction
      const { error: giftError } = await supabase.from('gift_transactions').insert({
        stream_id: streamId,
        sender_id: user.id,
        recipient_id: recipientId,
        gift_id: gift.id,
        gift_name: gift.name,
        gift_emoji: gift.emoji,
        cost: gift.cost,
        battle_points: gift.battle_points,
        battle_team: battleTeam,
      });

      if (giftError) throw giftError;

      // Add gift to chat
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      await supabase.from('stream_messages').insert({
        stream_id: streamId,
        user_id: user.id,
        username: profile?.username || 'Anonymous',
        message: `sent ${gift.emoji} ${gift.name} to ${recipientName}!`,
        type: 'gift',
      });

      // Update balance locally
      setBalance((prev) => prev - gift.cost);

      // Vibrate and callback
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 100, 50, 100]);
      }

      onGiftSent?.(gift);

      // Close after animation
      setTimeout(() => {
        setSending(false);
        setSelectedGift(null);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error sending gift:', error);
      Alert.alert('Error', 'Failed to send gift. Please try again.');
      setSending(false);
      setSelectedGift(null);
    }
  };

  const getTierGifts = () => GIFT_CATALOG.filter((g) => g.tier === selectedTier);

  const getTierColor = (tier: GiftTier) => {
    switch (tier) {
      case 'basic': return theme.colors.textSecondary;
      case 'mid': return theme.colors.info;
      case 'high': return theme.colors.success;
      case 'ultra': return theme.colors.primary;
      case 'nuclear': return theme.colors.error;
    }
  };

  const renderGift = ({ item }: { item: Gift }) => {
    const canAfford = balance >= item.cost;
    const isSelected = selectedGift?.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.giftItem,
          !canAfford && styles.giftItemDisabled,
          isSelected && styles.giftItemSelected,
        ]}
        onPress={() => canAfford && sendGift(item)}
        disabled={!canAfford || sending}
      >
        <Text style={styles.giftEmoji}>{item.emoji}</Text>
        <Text style={styles.giftName}>{item.name}</Text>
        <View style={styles.giftCostContainer}>
          <Ionicons name="logo-bitcoin" size={12} color={theme.colors.gold} />
          <Text style={[styles.giftCost, !canAfford && styles.giftCostDisabled]}>
            {item.cost.toLocaleString()}
          </Text>
        </View>
        {isBattleMode && item.battle_points && (
          <Text style={styles.battlePoints}>+{item.battle_points} pts</Text>
        )}
        {isSelected && sending && (
          <View style={styles.sendingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        
        <Animated.View
          style={[
            styles.container,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Send Gift</Text>
              <Text style={styles.recipientName}>to {recipientName}</Text>
            </View>
            
            <View style={styles.balanceContainer}>
              <Ionicons name="wallet" size={18} color={theme.colors.gold} />
              <Text style={styles.balanceText}>
                {loading ? '...' : balance.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Tier Tabs */}
          <View style={styles.tierTabs}>
            {(['basic', 'mid', 'high', 'ultra', 'nuclear'] as GiftTier[]).map((tier) => (
              <TouchableOpacity
                key={tier}
                style={[
                  styles.tierTab,
                  selectedTier === tier && [
                    styles.tierTabActive,
                    { borderBottomColor: getTierColor(tier) },
                  ],
                ]}
                onPress={() => setSelectedTier(tier)}
              >
                <Text
                  style={[
                    styles.tierTabText,
                    selectedTier === tier && { color: getTierColor(tier) },
                  ]}
                >
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Gift Grid */}
          <FlatList
            data={getTierGifts()}
            keyExtractor={(item) => item.id}
            renderItem={renderGift}
            numColumns={3}
            contentContainerStyle={styles.giftGrid}
            showsVerticalScrollIndicator={false}
          />

          {/* Battle Mode Indicator */}
          {isBattleMode && (
            <View style={styles.battleModeBar}>
              <Ionicons name="flame" size={16} color={theme.colors.error} />
              <Text style={styles.battleModeText}>
                Gifts convert to battle points for {battleTeam === 'team_a' ? 'Team A' : 'Team B'}!
              </Text>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: height * 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  recipientName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  balanceText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.gold,
    marginLeft: theme.spacing.xs,
  },
  tierTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tierTab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tierTabActive: {
    borderBottomWidth: 2,
  },
  tierTabText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
  },
  giftGrid: {
    padding: theme.spacing.md,
  },
  giftItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    margin: 4,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    minWidth: (width - 48) / 3 - 8,
    maxWidth: (width - 48) / 3 - 8,
  },
  giftItemDisabled: {
    opacity: 0.4,
  },
  giftItemSelected: {
    backgroundColor: theme.colors.primary,
  },
  giftEmoji: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  giftName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  giftCostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftCost: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.gold,
    marginLeft: 2,
  },
  giftCostDisabled: {
    color: theme.colors.textDisabled,
  },
  battlePoints: {
    fontSize: 10,
    color: theme.colors.success,
    marginTop: 2,
    fontWeight: theme.typography.weights.semibold,
  },
  sendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
  },
  battleModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.error}20`,
    padding: theme.spacing.sm,
  },
  battleModeText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error,
    marginLeft: theme.spacing.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  closeButton: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  closeButtonText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
});
