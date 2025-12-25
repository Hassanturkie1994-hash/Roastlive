import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

export default function VIPDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    loadClub();
  }, []);

  const loadClub = async () => {
    if (!user?.id) return;

    const { data: clubData } = await supabase
      .from('vip_clubs')
      .select('*')
      .eq('creator_id', user.id)
      .single();

    if (clubData) {
      setClub(clubData);

      const { data: membersData } = await supabase
        .from('club_subscriptions')
        .select(`
          *,
          user:profiles (username, avatar_url)
        `)
        .eq('club_id', clubData.id)
        .eq('is_active', true);

      setMembers(membersData || []);
      setStats({
        totalMembers: clubData.member_count || 0,
        activeMembers: membersData?.length || 0,
        monthlyRevenue: (clubData.price_monthly || 0) * (membersData?.length || 0),
      });
    }
  };

  const sendAnnouncement = () => {
    router.push('/vip/announcement');
  };

  if (!club) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VIP Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>You don't have a VIP club yet</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/vip/create')}
          >
            <Text style={styles.createButtonText}>Create VIP Club</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VIP Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView>
        {/* Club Info */}
        <View style={styles.clubCard}>
          <Text style={styles.clubName}>{club.name}</Text>
          <View style={[styles.badgePreview, { backgroundColor: club.badge_color }]}>
            <Text style={styles.badgeText}>{club.badge_text}</Text>
          </View>
          <Text style={styles.priceText}>{club.price_monthly} SEK/month</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={32} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats.activeMembers}</Text>
            <Text style={styles.statLabel}>Active Members</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={32} color={theme.colors.success} />
            <Text style={styles.statValue}>{stats.monthlyRevenue}</Text>
            <Text style={styles.statLabel}>Monthly Revenue</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.actionButton} onPress={sendAnnouncement}>
          <Ionicons name="megaphone" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Send Announcement</Text>
        </TouchableOpacity>

        {/* Members List */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          {members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <Text style={styles.memberName}>@{member.user?.username}</Text>
              <Text style={styles.memberDate}>
                Joined: {new Date(member.subscribed_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
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
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  clubCard: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
  },
  clubName: { fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.md },
  badgePreview: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.sm, marginBottom: theme.spacing.md },
  badgeText: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.bold, color: '#fff' },
  priceText: { fontSize: theme.typography.sizes.lg, color: theme.colors.gold },
  statsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg },
  statCard: { flex: 1, backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg, alignItems: 'center', marginHorizontal: theme.spacing.xs },
  statValue: { fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginTop: theme.spacing.sm },
  statLabel: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginTop: theme.spacing.xs, textAlign: 'center' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  actionButtonText: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: '#fff', marginLeft: theme.spacing.sm },
  membersSection: { paddingHorizontal: theme.spacing.md },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.md },
  memberCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.sm },
  memberName: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  memberDate: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginTop: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl },
  emptyText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, marginTop: theme.spacing.md, marginBottom: theme.spacing.xl },
  createButton: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.lg, borderRadius: theme.borderRadius.full },
  createButtonText: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: '#fff' },
});
