import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

const { width } = Dimensions.get('window');

// Complete gift catalog with all 45 gifts organized by tier
export const GIFT_CATALOG = {
  LOW: {
    name: 'Low tiers',
    priceRange: '1-10 SEK',
    color: '#4CAF50',
    gifts: [
      { id: 'boo', name: 'Boo', icon: '👻', price: 1, format: 'lottie' },
      { id: 'flying_tomato', name: 'Flying Tomato', icon: '🍅', price: 2, format: 'lottie' },
      { id: 'laugh_track', name: 'Laugh Track', icon: '😂', price: 3, format: 'lottie' },
      { id: 'facepalm', name: 'Facepalm', icon: '🤦', price: 3, format: 'lottie' },
      { id: 'crickets', name: 'Crickets', icon: '🦗', price: 4, format: 'lottie' },
      { id: 'yawn', name: 'Yawn', icon: '🥱', price: 5, format: 'lottie' },
      { id: 'clown', name: 'Clown', icon: '🤡', price: 5, format: 'lottie' },
      { id: 'trash', name: 'Trash', icon: '🗑️', price: 6, format: 'lottie' },
      { id: 'skull', name: 'Skull', icon: '💀', price: 7, format: 'lottie' },
      { id: 'poop', name: 'Poop', icon: '💩', price: 8, format: 'lottie' },
      { id: 'eye_roll', name: 'Eye Roll', icon: '🙄', price: 9, format: 'lottie' },
      { id: 'snore', name: 'Snore', icon: '😴', price: 10, format: 'lottie' },
    ],
  },
  MID: {
    name: 'Mid tiers',
    priceRange: '20-100 SEK',
    color: '#2196F3',
    gifts: [
      { id: 'mic_drop', name: 'Mic Drop', icon: '🎙️', price: 20, format: 'lottie' },
      { id: 'airhorn', name: 'Airhorn', icon: '📢', price: 25, format: 'lottie' },
      { id: 'laugh_explosion', name: 'Laugh Explosion', icon: '💥', price: 30, format: 'lottie' },
      { id: 'roast_bell', name: 'Roast Bell', icon: '🔔', price: 35, format: 'lottie' },
      { id: 'fire', name: 'Fire', icon: '🔥', price: 39, format: 'lottie' },
      { id: 'explosion', name: 'Explosion', icon: '💣', price: 50, format: 'lottie' },
      { id: 'shocked', name: 'Shocked', icon: '😱', price: 60, format: 'lottie' },
      { id: 'savage', name: 'Savage', icon: '😈', price: 70, format: 'lottie' },
      { id: 'salt_shaker', name: 'Salt Shaker', icon: '🧂', price: 80, format: 'lottie' },
      { id: 'tea_spill', name: 'Tea Spill', icon: '☕', price: 90, format: 'lottie' },
      { id: 'cringe', name: 'Cringe', icon: '😬', price: 100, format: 'lottie' },
    ],
  },
  HIGH: {
    name: 'high tiers',
    priceRange: '150-500 SEK',
    color: '#9C27B0',
    gifts: [
      { id: 'flame_thrower', name: 'Flame Thrower', icon: '🔥', price: 150, format: 'lottie' },
      { id: 'diss_stamp', name: 'Diss Stamp', icon: '📝', price: 175, format: 'lottie' },
      { id: 'judge_gavel', name: 'Judge Gavel', icon: '🧑‍⚖️', price: 200, format: 'lottie' },
      { id: 'roast_crown', name: 'Roast Crown', icon: '👑', price: 250, format: 'lottie' },
      { id: 'knockout_punch', name: 'Knockout Punch', icon: '🥊', price: 300, format: 'lottie' },
      { id: 'bomb', name: 'Bomb', icon: '💣', price: 350, format: 'lottie' },
      { id: 'lightning_strike', name: 'Lightning Strike', icon: '⚡', price: 400, format: 'lottie' },
      { id: 'roast_trophy', name: 'Roast Trophy', icon: '🏆', price: 450, format: 'lottie' },
      { id: 'roast_hammer', name: 'Roast Hammer', icon: '🔨', price: 475, format: 'lottie' },
      { id: 'roast_sword', name: 'Roast Sword', icon: '⚔️', price: 490, format: 'lottie' },
      { id: 'roast_shield', name: 'Roast Shield', icon: '🛡️', price: 500, format: 'lottie' },
    ],
  },
  ULTRA: {
    name: 'ultra tiers',
    priceRange: '700-1500 SEK',
    color: '#FF5722',
    gifts: [
      { id: 'screen_shake', name: 'Screen Shake', icon: '📱', price: 700, format: 'mp4', blocksOthers: true },
      { id: 'slow_motion_roast', name: 'Slow Motion Roast', icon: '🎬', price: 850, format: 'mp4', blocksOthers: true },
      { id: 'spotlight_shame', name: 'Spotlight Shame', icon: '🔦', price: 1000, format: 'mp4', blocksOthers: true },
      { id: 'silence_button', name: 'Silence Button', icon: '🤐', price: 1100, format: 'mp4', blocksOthers: true },
      { id: 'time_freeze', name: 'Time Freeze', icon: '⏱️', price: 1200, format: 'mp4', blocksOthers: true },
      { id: 'roast_nuke', name: 'Roast Nuke', icon: '☢️', price: 1300, format: 'mp4', blocksOthers: true },
      { id: 'shame_bell', name: 'Shame Bell', icon: '🔔', price: 1400, format: 'mp4', blocksOthers: true },
      { id: 'roast_meteor', name: 'Roast Meteor', icon: '☄️', price: 1500, format: 'mp4', blocksOthers: true },
    ],
  },
  NUCLEAR: {
    name: 'nuclear tiers',
    priceRange: '2000-4500 SEK',
    color: '#F44336',
    gifts: [
      { id: 'funeral_music', name: 'Funeral Music', icon: '⚰️', price: 2000, format: 'mp4', cinematic: true },
      { id: 'crowd_riot', name: 'Crowd Riot', icon: '🚨', price: 2500, format: 'mp4', cinematic: true },
      { id: 'roast_execution', name: 'Roast Execution', icon: '👀', price: 3000, format: 'mp4', cinematic: true },
      { id: 'you_are_done', name: "You're Done", icon: '👋', price: 3500, format: 'mp4', cinematic: true },
      { id: 'roast_apocalypse', name: 'Roast Apocalypse', icon: '🌋', price: 4000, format: 'mp4', cinematic: true },
      { id: 'roast_dragon', name: 'Roast Dragon', icon: '🐉', price: 4500, format: 'mp4', cinematic: true },
    ],
  },
};

export default function GiftStoreScreen() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState('LOW');

  const tiers = Object.keys(GIFT_CATALOG);
  const currentTier = GIFT_CATALOG[selectedTier as keyof typeof GIFT_CATALOG];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gift Store</Text>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tier Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tierTabs}>
        {tiers.map((tier) => {
          const tierData = GIFT_CATALOG[tier as keyof typeof GIFT_CATALOG];
          return (
            <TouchableOpacity
              key={tier}
              style={[
                styles.tierTab,
                selectedTier === tier && { backgroundColor: tierData.color },
              ]}
              onPress={() => setSelectedTier(tier)}
            >
              <Text
                style={[
                  styles.tierTabText,
                  selectedTier === tier && styles.tierTabTextActive,
                ]}
              >
                {tierData.name}
              </Text>
              <Text style={styles.tierPriceRange}>{tierData.priceRange}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tier Info */}
      <View style={[styles.tierInfo, { backgroundColor: `${currentTier.color}20` }]}>
        <View style={[styles.tierBadge, { backgroundColor: currentTier.color }]}>
          <Text style={styles.tierBadgeText}>{selectedTier}</Text>
        </View>
        <View style={styles.tierDetails}>
          <Text style={styles.tierName}>{currentTier.name}</Text>
          <Text style={styles.tierGiftCount}>{currentTier.gifts.length} gifts available</Text>
        </View>
        <Text style={[styles.tierPrice, { color: currentTier.color }]}>
          {currentTier.priceRange}
        </Text>
      </View>

      {/* Gift Grid */}
      <ScrollView style={styles.giftList}>
        <View style={styles.giftGrid}>
          {currentTier.gifts.map((gift) => (
            <TouchableOpacity key={gift.id} style={styles.giftCard}>
              <View style={styles.giftIconContainer}>
                <Text style={styles.giftIcon}>{gift.icon}</Text>
                {gift.blocksOthers && (
                  <View style={styles.specialBadge}>
                    <Text style={styles.specialBadgeText}>BLOCKS</Text>
                  </View>
                )}
                {gift.cinematic && (
                  <View style={[styles.specialBadge, { backgroundColor: theme.colors.gold }]}>
                    <Text style={styles.specialBadgeText}>EPIC</Text>
                  </View>
                )}
              </View>
              <Text style={styles.giftName} numberOfLines={1}>{gift.name}</Text>
              <View style={styles.giftPriceRow}>
                <Ionicons name="flash" size={12} color={currentTier.color} />
                <Text style={[styles.giftPrice, { color: currentTier.color }]}>
                  {gift.price} SEK
                </Text>
              </View>
              <Text style={styles.giftFormat}>{gift.format.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Animation Types</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
            <Text style={styles.legendText}>Lottie - Lightweight, can be spammed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
            <Text style={styles.legendText}>MP4 - High quality video animation</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
            <Text style={styles.legendText}>Blocks - Prevents other gifts temporarily</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.gold }]} />
            <Text style={styles.legendText}>Cinematic - Full timeline takeover</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const CARD_SIZE = (width - theme.spacing.md * 4) / 3;

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
    paddingTop: theme.spacing.xxl + 10,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  infoButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierTabs: {
    flexGrow: 0,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  tierTab: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.xs,
    alignItems: 'center',
  },
  tierTabText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  tierTabTextActive: {
    color: '#fff',
  },
  tierPriceRange: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  tierBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  tierDetails: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  tierName: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  tierGiftCount: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  tierPrice: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  giftList: {
    flex: 1,
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
  },
  giftCard: {
    width: CARD_SIZE,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    margin: theme.spacing.xs,
    alignItems: 'center',
  },
  giftIconContainer: {
    position: 'relative',
    marginBottom: theme.spacing.sm,
  },
  giftIcon: {
    fontSize: 36,
  },
  specialBadge: {
    position: 'absolute',
    top: -8,
    right: -16,
    backgroundColor: theme.colors.error,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  specialBadgeText: {
    fontSize: 6,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  giftName: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  giftPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftPrice: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    marginLeft: 2,
  },
  giftFormat: {
    fontSize: 8,
    color: theme.colors.textDisabled,
    marginTop: 2,
  },
  legend: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  legendTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: theme.spacing.sm,
  },
  legendText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
});
