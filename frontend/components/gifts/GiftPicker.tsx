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

// Gift Tiers (Prices in SEK)
export type GiftTier = 'low' | 'mid' | 'high' | 'ultra' | 'nuclear';

export interface Gift {
  id: string;
  name: string;
  emoji: string;
  tier: GiftTier;
  cost: number; // SEK
  animation_type: 'simple' | 'burst' | 'shower' | 'takeover';
  battle_points: number;
}

// Gift Catalog - Roast Live Official Gifts
export const GIFT_CATALOG: Gift[] = [
  // LOW TIER (1–10 SEK)
  { id: 'boo', name: 'Boo', emoji: '👻', tier: 'low', cost: 1, animation_type: 'simple', battle_points: 1 },
  { id: 'flying_tomato', name: 'Flying Tomato', emoji: '🍅', tier: 'low', cost: 2, animation_type: 'simple', battle_points: 2 },
  { id: 'laugh_track', name: 'Laugh Track', emoji: '😆', tier: 'low', cost: 3, animation_type: 'simple', battle_points: 3 },
  { id: 'facepalm', name: 'Facepalm', emoji: '🤦', tier: 'low', cost: 4, animation_type: 'simple', battle_points: 4 },
  { id: 'crickets', name: 'Crickets', emoji: '🦗', tier: 'low', cost: 5, animation_type: 'simple', battle_points: 5 },
  { id: 'yawn', name: 'Yawn', emoji: '🥱', tier: 'low', cost: 6, animation_type: 'simple', battle_points: 6 },
  { id: 'clown', name: 'Clown', emoji: '🤡', tier: 'low', cost: 7, animation_type: 'simple', battle_points: 7 },
  { id: 'trash', name: 'Trash', emoji: '🗑️', tier: 'low', cost: 8, animation_type: 'simple', battle_points: 8 },
  { id: 'skull', name: 'Skull', emoji: '💀', tier: 'low', cost: 9, animation_type: 'simple', battle_points: 9 },
  { id: 'poop', name: 'Poop', emoji: '💩', tier: 'low', cost: 10, animation_type: 'simple', battle_points: 10 },
  { id: 'eye_roll', name: 'Eye Roll', emoji: '🙄', tier: 'low', cost: 5, animation_type: 'simple', battle_points: 5 },
  { id: 'snore', name: 'Snore', emoji: '😴', tier: 'low', cost: 5, animation_type: 'simple', battle_points: 5 },

  // MID TIER (20–100 SEK)
  { id: 'mic_drop', name: 'Mic Drop', emoji: '🎤', tier: 'mid', cost: 20, animation_type: 'burst', battle_points: 20 },
  { id: 'airhorn', name: 'Airhorn', emoji: '📢', tier: 'mid', cost: 30, animation_type: 'burst', battle_points: 30 },
  { id: 'laugh_explosion', name: 'Laugh Explosion', emoji: '🤣', tier: 'mid', cost: 40, animation_type: 'burst', battle_points: 40 },
  { id: 'roast_bell', name: 'Roast Bell', emoji: '🔔', tier: 'mid', cost: 50, animation_type: 'burst', battle_points: 50 },
  { id: 'fire', name: 'Fire', emoji: '🔥', tier: 'mid', cost: 60, animation_type: 'burst', battle_points: 60 },
  { id: 'explosion', name: 'Explosion', emoji: '💥', tier: 'mid', cost: 70, animation_type: 'burst', battle_points: 70 },
  { id: 'shocked', name: 'Shocked', emoji: '😱', tier: 'mid', cost: 80, animation_type: 'burst', battle_points: 80 },
  { id: 'savage', name: 'Savage', emoji: '😈', tier: 'mid', cost: 90, animation_type: 'burst', battle_points: 90 },
  { id: 'salt_shaker', name: 'Salt Shaker', emoji: '🧂', tier: 'mid', cost: 50, animation_type: 'burst', battle_points: 50 },
  { id: 'tea_spill', name: 'Tea Spill', emoji: '🍵', tier: 'mid', cost: 60, animation_type: 'burst', battle_points: 60 },
  { id: 'cringe', name: 'Cringe', emoji: '😬', tier: 'mid', cost: 100, animation_type: 'burst', battle_points: 100 },

  // HIGH TIER (150–500 SEK)
  { id: 'flame_thrower', name: 'Flame Thrower', emoji: '🔥', tier: 'high', cost: 150, animation_type: 'shower', battle_points: 150 },
  { id: 'diss_stamp', name: 'Diss Stamp', emoji: '📛', tier: 'high', cost: 200, animation_type: 'shower', battle_points: 200 },
  { id: 'roast_crown', name: 'Roast Crown', emoji: '👑', tier: 'high', cost: 250, animation_type: 'shower', battle_points: 250 },
  { id: 'knockout_punch', name: 'Knockout Punch', emoji: '🥊', tier: 'high', cost: 300, animation_type: 'shower', battle_points: 300 },
  { id: 'bomb', name: 'Bomb', emoji: '💣', tier: 'high', cost: 350, animation_type: 'shower', battle_points: 350 },
  { id: 'lightning_strike', name: 'Lightning Strike', emoji: '⚡', tier: 'high', cost: 400, animation_type: 'shower', battle_points: 400 },
  { id: 'roast_trophy', name: 'Roast Trophy', emoji: '🏆', tier: 'high', cost: 450, animation_type: 'shower', battle_points: 450 },
  { id: 'roast_hammer', name: 'Roast Hammer', emoji: '🔨', tier: 'high', cost: 350, animation_type: 'shower', battle_points: 350 },
  { id: 'roast_sword', name: 'Roast Sword', emoji: '⚔️', tier: 'high', cost: 400, animation_type: 'shower', battle_points: 400 },
  { id: 'roast_shield', name: 'Roast Shield', emoji: '🛡️', tier: 'high', cost: 500, animation_type: 'shower', battle_points: 500 },

  // ULTRA TIER (700–1500 SEK) — MP4 + TIMELINE
  { id: 'screen_shake', name: 'Screen Shake', emoji: '📳', tier: 'ultra', cost: 700, animation_type: 'takeover', battle_points: 700 },
  { id: 'slow_motion_roast', name: 'Slow Motion Roast', emoji: '🐌', tier: 'ultra', cost: 800, animation_type: 'takeover', battle_points: 800 },
  { id: 'spotlight_shame', name: 'Spotlight Shame', emoji: '🔦', tier: 'ultra', cost: 900, animation_type: 'takeover', battle_points: 900 },
  { id: 'silence_button', name: 'Silence Button', emoji: '🔇', tier: 'ultra', cost: 1000, animation_type: 'takeover', battle_points: 1000 },
  { id: 'time_freeze', name: 'Time Freeze', emoji: '⏸️', tier: 'ultra', cost: 1100, animation_type: 'takeover', battle_points: 1100 },
  { id: 'roast_nuke', name: 'Roast Nuke', emoji: '☢️', tier: 'ultra', cost: 1200, animation_type: 'takeover', battle_points: 1200 },
  { id: 'shame_bell', name: 'Shame Bell', emoji: '🔔', tier: 'ultra', cost: 1300, animation_type: 'takeover', battle_points: 1300 },
  { id: 'roast_meteor', name: 'Roast Meteor', emoji: '☄️', tier: 'ultra', cost: 1500, animation_type: 'takeover', battle_points: 1500 },

  // ULTRA NUCLEAR (2000–4000 SEK) — Full Screen Takeover
  { id: 'funeral_music', name: 'Funeral Music', emoji: '⚰️', tier: 'nuclear', cost: 2000, animation_type: 'takeover', battle_points: 2000 },
  { id: 'crowd_riot', name: 'Crowd Riot', emoji: '🎪', tier: 'nuclear', cost: 2500, animation_type: 'takeover', battle_points: 2500 },
  { id: 'roast_execution', name: 'Roast Execution', emoji: '🪓', tier: 'nuclear', cost: 3000, animation_type: 'takeover', battle_points: 3000 },
  { id: 'youre_done', name: "You're Done", emoji: '🚪', tier: 'nuclear', cost: 3500, animation_type: 'takeover', battle_points: 3500 },
  { id: 'roast_apocalypse', name: 'Roast Apocalypse', emoji: '🌋', tier: 'nuclear', cost: 3800, animation_type: 'takeover', battle_points: 3800 },
  { id: 'roast_dragon', name: 'Roast Dragon', emoji: '🐉', tier: 'nuclear', cost: 4000, animation_type: 'takeover', battle_points: 4000 },
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
  const [selectedTier, setSelectedTier] = useState<GiftTier>('low');
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
        .maybeSingle();

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
        .maybeSingle();

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
      case 'low': return theme.colors.textSecondary;
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
            {(['low', 'mid', 'high', 'ultra', 'nuclear'] as GiftTier[]).map((tier) => (
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
                  {tier === 'low' ? 'Low' : tier === 'nuclear' ? 'Nuclear' : tier.charAt(0).toUpperCase() + tier.slice(1)}
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
