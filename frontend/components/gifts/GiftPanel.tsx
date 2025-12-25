import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { giftService, Gift } from '../../services/giftService';
import { useAuth } from '../../contexts/AuthContext';
import GiftDetailModal from './GiftDetailModal';

const { width, height } = Dimensions.get('window');

interface GiftPanelProps {
  visible: boolean;
  onClose: () => void;
  onSendGift: (gift: Gift) => void;
  streamId: string;
  receiverId: string;
}

const TIER_COLORS = {
  LOW: '#4CAF50',
  MID: '#2196F3',
  HIGH: '#9C27B0',
  ULTRA: '#FF5722',
  NUCLEAR: '#F44336',
};

const TIER_NAMES = {
  LOW: 'Low tiers',
  MID: 'Mid tiers',
  HIGH: 'High tiers',
  ULTRA: 'Ultra tiers',
  NUCLEAR: 'Nuclear tiers',
};

export default function GiftPanel({
  visible,
  onClose,
  onSendGift,
  streamId,
  receiverId,
}: GiftPanelProps) {
  const { user } = useAuth();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selectedTier, setSelectedTier] = useState<Gift['tier']>('LOW');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      loadGifts();
      loadBalance();
    }
  }, [visible]);

  const loadGifts = async () => {
    setLoading(true);
    const allGifts = await giftService.getGifts();
    setGifts(allGifts);
    setLoading(false);
  };

  const loadBalance = async () => {
    if (user?.id) {
      const bal = await giftService.getWalletBalance(user.id);
      setBalance(bal);
    }
  };

  const handleSendGift = async (gift: Gift) => {
    if (balance < gift.price) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${gift.price} SEK but only have ${balance} SEK. Would you like to top up?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Top Up', onPress: () => {/* Navigate to wallet */} },
        ]
      );
      return;
    }

    Alert.alert(
      'Send Gift',
      `Send ${gift.name} for ${gift.price} SEK?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            const result = await giftService.sendGift(
              streamId,
              user!.id,
              receiverId,
              gift
            );
            setSending(false);

            if (result.success) {
              setBalance(prev => prev - gift.price);
              onSendGift(gift);
              onClose();
            } else {
              Alert.alert('Error', result.error || 'Failed to send gift');
            }
          },
        },
      ]
    );
  };

  const filteredGifts = gifts.filter(g => g.tier === selectedTier);
  const tiers: Gift['tier'][] = ['LOW', 'MID', 'HIGH', 'ULTRA', 'NUCLEAR'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Send a Gift</Text>
              <Text style={styles.balanceText}>Balance: {balance} SEK</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Tier Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tierTabs}
            contentContainerStyle={styles.tierTabsContent}
          >
            {tiers.map((tier) => (
              <TouchableOpacity
                key={tier}
                style={[
                  styles.tierTab,
                  selectedTier === tier && {
                    backgroundColor: TIER_COLORS[tier],
                  },
                ]}
                onPress={() => setSelectedTier(tier)}
              >
                <Text
                  style={[
                    styles.tierTabText,
                    selectedTier === tier && styles.tierTabTextActive,
                  ]}
                >
                  {TIER_NAMES[tier]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Gift Grid */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <ScrollView style={styles.giftScroll}>
              <View style={styles.giftGrid}>
                {filteredGifts.map((gift) => {
                  const canAfford = balance >= gift.price;
                  return (
                    <TouchableOpacity
                      key={gift.id}
                      style={[
                        styles.giftCard,
                        !canAfford && styles.giftCardDisabled,
                      ]}
                      onPress={() => canAfford && handleSendGift(gift)}
                      disabled={!canAfford || sending}
                    >
                      <Text style={styles.giftIcon}>{gift.icon}</Text>
                      <Text style={styles.giftName} numberOfLines={1}>
                        {gift.name}
                      </Text>
                      <Text
                        style={[
                          styles.giftPrice,
                          { color: TIER_COLORS[gift.tier] },
                        ]}
                      >
                        {gift.price} SEK
                      </Text>
                      {gift.format === 'mp4' && (
                        <View style={styles.formatBadge}>
                          <Text style={styles.formatBadgeText}>MP4</Text>
                        </View>
                      )}
                      {gift.is_cinematic && (
                        <View
                          style={[
                            styles.formatBadge,
                            { backgroundColor: theme.colors.gold },
                          ]}
                        >
                          <Text style={styles.formatBadgeText}>EPIC</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {sending && (
            <View style={styles.sendingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.sendingText}>Sending gift...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const CARD_WIDTH = (width - 80) / 3;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    height: height * 0.7,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  balanceText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gold,
    marginTop: theme.spacing.xs,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  tierTabs: {
    flexGrow: 0,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tierTabsContent: {
    paddingHorizontal: theme.spacing.md,
  },
  tierTab: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
  },
  tierTabText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  tierTabTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftScroll: {
    flex: 1,
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
  },
  giftCard: {
    width: CARD_WIDTH,
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    margin: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  giftCardDisabled: {
    opacity: 0.4,
  },
  giftIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  giftName: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  giftPrice: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  formatBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formatBadgeText: {
    fontSize: 8,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  sendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendingText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginTop: theme.spacing.md,
  },
});