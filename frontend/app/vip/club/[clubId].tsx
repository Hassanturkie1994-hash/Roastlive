import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  price_yearly: number;
  perks: string[];
  badge_emoji: string;
  member_count: number;
  created_at: string;
}

interface ClubMember {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  joined_at: string;
  tier: 'monthly' | 'yearly';
}

export default function VIPClubScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { clubId } = useLocalSearchParams();
  
  const [club, setClub] = useState<VIPClub | null>(null);
  const [creator, setCreator] = useState<any>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [memberTier, setMemberTier] = useState<'monthly' | 'yearly' | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadClubData();
  }, [clubId]);

  const loadClubData = async () => {
    try {
      // Get club details
      const { data: clubData, error: clubError } = await supabase
        .from('vip_clubs')
        .select('*')
        .eq('id', clubId)
        .maybeSingle();

      if (clubError) throw clubError;
      setClub(clubData);

      // Get creator profile
      const { data: creatorData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clubData.creator_id)
        .maybeSingle();
      setCreator(creatorData);

      // Check if user is member
      if (user?.id) {
        const { data: membership } = await supabase
          .from('vip_memberships')
          .select('*')
          .eq('club_id', clubId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (membership) {
          setIsMember(true);
          setMemberTier(membership.tier);
        }
      }

      // Get recent members
      const { data: membersData } = await supabase
        .from('vip_memberships')
        .select(`
          id,
          user_id,
          tier,
          joined_at,
          profiles:user_id (username, avatar_url)
        `)
        .eq('club_id', clubId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false })
        .limit(20);

      if (membersData) {
        setMembers(membersData.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          username: m.profiles?.username || 'Unknown',
          avatar_url: m.profiles?.avatar_url,
          joined_at: m.joined_at,
          tier: m.tier,
        })));
      }
    } catch (error) {
      console.error('Error loading club:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (tier: 'monthly' | 'yearly') => {
    if (!user?.id || !club) return;

    const price = tier === 'monthly' ? club.price_monthly : club.price_yearly;

    Alert.alert(
      'Join VIP Club',
      `Subscribe for ${price} SEK/${tier === 'monthly' ? 'month' : 'year'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            setJoining(true);
            try {
              const { error } = await supabase.from('vip_memberships').insert({
                club_id: clubId,
                user_id: user.id,
                tier,
                is_active: true,
                expires_at: new Date(
                  Date.now() + (tier === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000
                ).toISOString(),
              });

              if (error) throw error;

              setIsMember(true);
              setMemberTier(tier);
              Alert.alert('Welcome!', `You're now a VIP member of ${club.name}!`);
              loadClubData();
            } catch (error) {
              console.error('Error joining:', error);
              Alert.alert('Error', 'Failed to join club');
            } finally {
              setJoining(false);
            }
          },
        },
      ]
    );
  };

  const handleLeave = async () => {
    if (!user?.id) return;

    Alert.alert(
      'Leave Club',
      'Are you sure you want to cancel your VIP membership?',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('vip_memberships')
                .update({ is_active: false })
                .eq('club_id', clubId)
                .eq('user_id', user.id);

              setIsMember(false);
              setMemberTier(null);
              loadClubData();
            } catch (error) {
              console.error('Error leaving:', error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.vip} />
      </View>
    );
  }

  if (!club) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Club not found</Text>
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
        <Text style={styles.headerTitle}>VIP Club</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Club Banner */}
        <View style={styles.banner}>
          <Text style={styles.clubEmoji}>{club.badge_emoji}</Text>
          <Text style={styles.clubName}>{club.name}</Text>
          <Text style={styles.clubCreator}>by @{creator?.username || 'Unknown'}</Text>
          
          {isMember && (
            <View style={styles.memberBadge}>
              <Ionicons name="star" size={16} color="#000" />
              <Text style={styles.memberBadgeText}>
                VIP {memberTier === 'yearly' ? '(Yearly)' : '(Monthly)'}
              </Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{club.member_count || members.length}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{club.price_monthly}</Text>
            <Text style={styles.statLabel}>SEK/month</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{club.perks?.length || 0}</Text>
            <Text style={styles.statLabel}>Perks</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{club.description}</Text>
        </View>

        {/* Perks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VIP Perks</Text>
          {club.perks?.map((perk, index) => (
            <View key={index} style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.vip} />
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
        </View>

        {/* Pricing */}
        {!isMember && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Plan</Text>
            <View style={styles.pricingCards}>
              <TouchableOpacity
                style={styles.pricingCard}
                onPress={() => handleJoin('monthly')}
                disabled={joining}
              >
                <Text style={styles.pricingLabel}>Monthly</Text>
                <Text style={styles.pricingPrice}>{club.price_monthly} SEK</Text>
                <Text style={styles.pricingPeriod}>/month</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pricingCard, styles.pricingCardPopular]}
                onPress={() => handleJoin('yearly')}
                disabled={joining}
              >
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>SAVE 20%</Text>
                </View>
                <Text style={styles.pricingLabel}>Yearly</Text>
                <Text style={styles.pricingPrice}>{club.price_yearly} SEK</Text>
                <Text style={styles.pricingPeriod}>/year</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Members</Text>
          <View style={styles.membersGrid}>
            {members.slice(0, 10).map((member) => (
              <View key={member.id} style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {member.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.username}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Leave Button */}
        {isMember && (
          <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
            <Text style={styles.leaveButtonText}>Cancel Membership</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  errorText: { color: theme.colors.error, fontSize: theme.typography.sizes.lg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xxl + 10, paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1 },
  banner: {
    alignItems: 'center', padding: theme.spacing.xl,
    backgroundColor: theme.colors.vip, borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  clubEmoji: { fontSize: 64, marginBottom: theme.spacing.sm },
  clubName: { fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: '#000' },
  clubCreator: { fontSize: theme.typography.sizes.base, color: '#333', marginTop: theme.spacing.xs },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#000',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full, marginTop: theme.spacing.md,
  },
  memberBadgeText: { color: theme.colors.vip, fontWeight: theme.typography.weights.bold, marginLeft: theme.spacing.xs },
  statsRow: {
    flexDirection: 'row', backgroundColor: theme.colors.surface,
    margin: theme.spacing.md, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  statLabel: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
  section: { padding: theme.spacing.md },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.md },
  description: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, lineHeight: 22 },
  perkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  perkText: { fontSize: theme.typography.sizes.base, color: theme.colors.text, marginLeft: theme.spacing.sm },
  pricingCards: { flexDirection: 'row', justifyContent: 'space-between' },
  pricingCard: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: theme.colors.border,
  },
  pricingCardPopular: { borderColor: theme.colors.vip, borderWidth: 2 },
  saveBadge: { position: 'absolute', top: -10, backgroundColor: theme.colors.vip, paddingHorizontal: theme.spacing.sm, paddingVertical: 2, borderRadius: theme.borderRadius.sm },
  saveBadgeText: { fontSize: 10, fontWeight: theme.typography.weights.bold, color: '#000' },
  pricingLabel: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  pricingPrice: { fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  pricingPeriod: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  membersGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  memberItem: { width: '20%', alignItems: 'center', marginBottom: theme.spacing.md },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  memberName: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' },
  leaveButton: { margin: theme.spacing.md, padding: theme.spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.error, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.xxl },
  leaveButtonText: { color: theme.colors.error, fontWeight: theme.typography.weights.semibold },
});
