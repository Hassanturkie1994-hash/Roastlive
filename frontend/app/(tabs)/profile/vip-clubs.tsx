import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface VIPClub {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  price_monthly: number;
  benefits: string[];
  member_count: number;
  is_active: boolean;
  creator?: {
    username: string;
    avatar_url?: string;
  };
}

export default function VIPClubsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [clubs, setClubs] = useState<VIPClub[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'subscribed'>('discover');

  useEffect(() => {
    loadClubs();
    loadMySubscriptions();
  }, []);

  const loadClubs = async () => {
    try {
      const { data, error } = await supabase
        .from('vip_clubs')
        .select(`
          *,
          creator:profiles!creator_id(username, avatar_url)
        `)
        .eq('is_active', true)
        .order('member_count', { ascending: false });

      if (!error && data) {
        setClubs(data);
      }
    } catch (error) {
      console.error('Load clubs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMySubscriptions = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('vip_subscriptions')
        .select('club_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!error && data) {
        setMySubscriptions(data.map(s => s.club_id));
      }
    } catch (error) {
      console.error('Load subscriptions error:', error);
    }
  };

  const handleSubscribe = async (clubId: string, price: number) => {
    // In production, this would trigger IAP
    try {
      await supabase.from('vip_subscriptions').insert({
        user_id: user?.id,
        club_id: clubId,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      
      // Update member count
      await supabase.rpc('increment_vip_member_count', { club_id: clubId });
      
      setMySubscriptions([...mySubscriptions, clubId]);
      alert('Successfully subscribed!');
    } catch (error) {
      console.error('Subscribe error:', error);
      alert('Subscription failed');
    }
  };

  const filteredClubs = activeTab === 'subscribed'
    ? clubs.filter(c => mySubscriptions.includes(c.id))
    : clubs;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VIP Clubs</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Ionicons
            name="compass"
            size={20}
            color={activeTab === 'discover' ? theme.colors.vip : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscribed' && styles.activeTab]}
          onPress={() => setActiveTab('subscribed')}
        >
          <Ionicons
            name="star"
            size={20}
            color={activeTab === 'subscribed' ? theme.colors.vip : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'subscribed' && styles.activeTabText]}>
            My Clubs
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.vip} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {filteredClubs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={64} color={theme.colors.textDisabled} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'subscribed' ? 'No Subscriptions' : 'No Clubs Found'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'subscribed'
                  ? 'Subscribe to creators to access exclusive content'
                  : 'VIP clubs will appear here'}
              </Text>
            </View>
          ) : (
            filteredClubs.map((club) => (
              <View key={club.id} style={styles.clubCard}>
                <View style={styles.clubHeader}>
                  <View style={styles.creatorInfo}>
                    <View style={styles.avatarContainer}>
                      {club.creator?.avatar_url ? (
                        <Image source={{ uri: club.creator.avatar_url }} style={styles.avatar} />
                      ) : (
                        <Ionicons name="person" size={24} color={theme.colors.text} />
                      )}
                      <View style={styles.vipBadge}>
                        <Ionicons name="star" size={10} color="#fff" />
                      </View>
                    </View>
                    <View>
                      <Text style={styles.clubName}>{club.name}</Text>
                      <Text style={styles.creatorName}>by @{club.creator?.username}</Text>
                    </View>
                  </View>
                  <View style={styles.memberCount}>
                    <Ionicons name="people" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.memberCountText}>{club.member_count}</Text>
                  </View>
                </View>

                <Text style={styles.clubDescription}>{club.description}</Text>

                <View style={styles.benefitsList}>
                  <Text style={styles.benefitsTitle}>Member Benefits:</Text>
                  {(club.benefits || []).slice(0, 3).map((benefit, idx) => (
                    <View key={idx} style={styles.benefitItem}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.vip} />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.clubFooter}>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Monthly</Text>
                    <Text style={styles.priceAmount}>${club.price_monthly}</Text>
                  </View>
                  {mySubscriptions.includes(club.id) ? (
                    <View style={styles.subscribedBadge}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.subscribedText}>Subscribed</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.subscribeButton}
                      onPress={() => handleSubscribe(club.id, club.price_monthly)}
                    >
                      <Text style={styles.subscribeButtonText}>Join VIP</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
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
  tabBar: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.xs,
    backgroundColor: theme.colors.background,
  },
  activeTab: {
    backgroundColor: 'rgba(156, 39, 176, 0.15)',
  },
  tabText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  activeTabText: {
    color: theme.colors.vip,
    fontWeight: theme.typography.weights.semibold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  clubCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.vip,
  },
  clubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  vipBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.vip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  clubName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  creatorName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCountText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  clubDescription: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  benefitsList: {
    marginBottom: theme.spacing.md,
  },
  benefitsTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  benefitText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  clubFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  priceLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  priceAmount: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.vip,
  },
  subscribeButton: {
    backgroundColor: theme.colors.vip,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  subscribeButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  subscribedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  subscribedText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.xs,
  },
});
