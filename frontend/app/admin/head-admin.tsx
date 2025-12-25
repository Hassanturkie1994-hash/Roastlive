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
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAdminRole } from '../../hooks/useAdminRole';
import { supabase } from '../../lib/supabase';

interface ReportStats {
  open: number;
  inReview: number;
  closed: number;
  total: number;
}

interface DashboardStats {
  reports: ReportStats;
  liveStreams: number;
  penalties: number;
  vipSubscribers: number;
  todayTransactions: number;
}

export default function HeadAdminDashboard() {
  const router = useRouter();
  const { role, permissions, loading: roleLoading } = useAdminRole();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    reports: { open: 0, inReview: 0, closed: 0, total: 0 },
    liveStreams: 0,
    penalties: 0,
    vipSubscribers: 0,
    todayTransactions: 0,
  });

  useEffect(() => {
    if (!roleLoading && role !== 'head_admin') {
      Alert.alert('Access Denied', 'You do not have Head Admin permissions');
      router.back();
      return;
    }
    if (!roleLoading) {
      loadStats();
    }
  }, [roleLoading]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [pendingReports, inReviewReports, closedReports, streams, bans, vip, transactions] =
        await Promise.all([
          supabase.from('user_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('user_reports').select('*', { count: 'exact', head: true }).eq('status', 'in_review'),
          supabase.from('user_reports').select('*', { count: 'exact', head: true }).in('status', ['resolved', 'dismissed']),
          supabase.from('streams').select('*', { count: 'exact', head: true }).eq('is_live', true),
          supabase.from('banned_users').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('club_subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase
            .from('wallet_transactions')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        ]);

      setStats({
        reports: {
          open: pendingReports.count || 0,
          inReview: inReviewReports.count || 0,
          closed: closedReports.count || 0,
          total: (pendingReports.count || 0) + (inReviewReports.count || 0) + (closedReports.count || 0),
        },
        liveStreams: streams.count || 0,
        penalties: bans.count || 0,
        vipSubscribers: vip.count || 0,
        todayTransactions: transactions.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Head Admin Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: `${theme.colors.error}20` }]}>
            <Ionicons name="flag" size={32} color={theme.colors.error} />
            <Text style={styles.statValue}>{stats.reports.open}</Text>
            <Text style={styles.statLabel}>Open Reports</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: `${theme.colors.primary}20` }]}>
            <Ionicons name="videocam" size={32} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats.liveStreams}</Text>
            <Text style={styles.statLabel}>Live Streams</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: `${theme.colors.warning}20` }]}>
            <Ionicons name="ban" size={32} color={theme.colors.warning} />
            <Text style={styles.statValue}>{stats.penalties}</Text>
            <Text style={styles.statLabel}>Active Penalties</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: `${theme.colors.vip}20` }]}>
            <Ionicons name="star" size={32} color={theme.colors.vip} />
            <Text style={styles.statValue}>{stats.vipSubscribers}</Text>
            <Text style={styles.statLabel}>VIP Members</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="flag-outline" size={24} color={theme.colors.error} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manage Reports</Text>
              <Text style={styles.actionDescription}>{stats.reports.open} pending review</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="people-outline" size={24} color={theme.colors.primary} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Live Monitoring</Text>
              <Text style={styles.actionDescription}>{stats.liveStreams} active streams</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="shield-outline" size={24} color={theme.colors.warning} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>User Penalties</Text>
              <Text style={styles.actionDescription}>{stats.penalties} users under penalty</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="mail-outline" size={24} color={theme.colors.primary} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Send Messages</Text>
              <Text style={styles.actionDescription}>Official warnings & notices</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Admin Management</Text>
              <Text style={styles.actionDescription}>Manage admin roles & permissions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
  },
  statCard: {
    width: '48%',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    margin: '1%',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  statLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  section: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  actionContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  actionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  actionDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});