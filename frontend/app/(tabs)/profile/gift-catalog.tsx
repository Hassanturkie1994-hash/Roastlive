import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Gift {
  id: string;
  name: string;
  tier: string;
  price: number;
  icon: string;
  format: string;
  sound?: boolean;
}

interface GiftsByTier {
  low: Gift[];
  mid: Gift[];
  high: Gift[];
  ultra: Gift[];
  nuclear: Gift[];
}

export default function EnhancedGiftCatalogScreen() {
  const router = useRouter();
  const [giftsByTier, setGiftsByTier] = useState<GiftsByTier | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [totalGifts, setTotalGifts] = useState(0);

  useEffect(() => {
    loadGiftCatalog();
  }, []);

  const loadGiftCatalog = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/coins/catalog`);
      const data = await response.json();
      setGiftsByTier(data.gifts_by_tier);
      setTotalGifts(data.total_gifts);
    } catch (error) {
      console.error('Load catalog error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: { [key: string]: string } = {
      low: '#4CAF50',
      mid: '#2196F3',
      high: '#9C27B0',
      ultra: '#FF9800',
      nuclear: '#F44336',
    };
    return colors[tier] || theme.colors.primary;
  };

  const getTierName = (tier: string) => {
    const names: { [key: string]: string } = {
      low: 'Low Tier',
      mid: 'Mid Tier',
      high: 'High Tier',
      ultra: 'Ultra Tier',
      nuclear: 'Nuclear Tier',
    };
    return names[tier] || tier;
  };

  const getFilteredGifts = () => {
    if (!giftsByTier) return [];
    
    if (selectedTier === 'all') {
      return Object.entries(giftsByTier).flatMap(([tier, gifts]) => 
        gifts.map(gift => ({ ...gift, tier }))
      );
    }
    
    return giftsByTier[selectedTier as keyof GiftsByTier] || [];
  };

  const renderGiftCard = (gift: Gift) => {
    const tierColor = getTierColor(gift.tier);
    
    return (
      <View key={gift.id} style={[styles.giftCard, { borderColor: tierColor }]}>
        <View style={styles.giftHeader}>
          <Text style={styles.giftIcon}>{gift.icon}</Text>
          {gift.sound && (
            <View style={styles.soundBadge}>
              <Ionicons name="musical-notes" size={12} color="#fff" />
            </View>
          )}
        </View>
        
        <Text style={styles.giftName}>{gift.name}</Text>
        
        <View style={[styles.tierBadge, { backgroundColor: `${tierColor}20` }]}>
          <Text style={[styles.tierText, { color: tierColor }]}>
            {getTierName(gift.tier).toUpperCase()}
          </Text>
        </View>

        <View style={styles.formatBadge}>
          <Text style={styles.formatText}>{gift.format.toUpperCase()}</Text>
        </View>
        
        <View style={[styles.priceTag, { backgroundColor: tierColor }]}>
          <Text style={styles.priceText}>{gift.price} 💎</Text>
        </View>
      </View>
    );
  };

  const renderTierFilter = () => {
    const tiers = ['all', 'low', 'mid', 'high', 'ultra', 'nuclear'];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {tiers.map((tier) => {
          const isSelected = selectedTier === tier;
          const tierColor = tier === 'all' ? theme.colors.primary : getTierColor(tier);
          
          return (
            <TouchableOpacity
              key={tier}
              style={[
                styles.filterButton,
                isSelected && { backgroundColor: tierColor },
              ]}
              onPress={() => setSelectedTier(tier)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  isSelected && styles.filterTextActive,
                ]}
              >
                {tier === 'all' ? 'All' : getTierName(tier)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gift Catalog</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  const filteredGifts = getFilteredGifts();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gift Catalog</Text>
        <View style={{ width: 40 }} />
      </View>

      {renderTierFilter()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalGifts}</Text>
            <Text style={styles.statLabel}>Total Gifts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Tiers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filteredGifts.length}</Text>
            <Text style={styles.statLabel}>Showing</Text>
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Buy coins in the Coin Store to send these gifts during live streams!
          </Text>
        </View>

        {/* Gifts Grid */}
        <View style={styles.giftsGrid}>
          {filteredGifts.map((gift) => renderGiftCard(gift))}
        </View>

        {/* Legend */}
        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>Animation Formats</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>LOTTIE - Smooth vector animations</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>MP4 - Premium video effects with sound</Text>
          </View>
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
  filterContainer: {
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: theme.colors.border,
  },
  filterText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.primary}15`,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 12,
    lineHeight: 18,
  },
  giftsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  giftCard: {
    width: '47%',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    margin: '1.5%',
    borderWidth: 2,
    alignItems: 'center',
  },
  giftHeader: {
    position: 'relative',
    marginBottom: 8,
  },
  giftIcon: {
    fontSize: 48,
  },
  soundBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  tierText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  formatBadge: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  formatText: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  priceTag: {
    width: '100%',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  priceText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  legendSection: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
