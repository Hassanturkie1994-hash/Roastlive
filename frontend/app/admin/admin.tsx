import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAdminRole } from '../../hooks/useAdminRole';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { role, permissions, loading: roleLoading } = useAdminRole();
  const [activeTab, setActiveTab] = useState<'reports' | 'bans' | 'analytics'>('reports');
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [banUserId, setBanUserId] = useState('');
  const [banReason, setBanReason] = useState('');
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    resolvedToday: 0,
    activeBans: 0,
    totalUsers: 0,
    activeStreams: 0,
  });

  useEffect(() => {
    if (!roleLoading && (!role || !permissions.canBanUsers)) {
      Alert.alert('Access Denied', 'You do not have Admin permissions');
      router.back();
      return;
    }
    if (!roleLoading) {
      loadData();
    }
  }, [roleLoading, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const { data } = await supabase
          .from('user_reports')
          .select(`
            *,
            reporter:profiles!reporter_id(username),
            reported_user:profiles!reported_user_id(username)
          `)
          .order('created_at', { ascending: false })
          .limit(30);
        setReports(data || []);
      } else if (activeTab === 'bans') {
        const { data } = await supabase
          .from('banned_users')
          .select(`
            *,
            user:profiles!user_id(username, email)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        setBannedUsers(data || []);
      } else if (activeTab === 'analytics') {
        const [total, pending, resolved, bans, users, streams] = await Promise.all([
          supabase.from('user_reports').select('*', { count: 'exact', head: true }),
          supabase.from('user_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase
            .from('user_reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'resolved')
            .gte('resolved_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('banned_users').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('streams').select('*', { count: 'exact', head: true }).eq('is_live', true),
        ]);
        setStats({
          totalReports: total.count || 0,
          pendingReports: pending.count || 0,
          resolvedToday: resolved.count || 0,
          activeBans: bans.count || 0,
          totalUsers: users.count || 0,
          activeStreams: streams.count || 0,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!permissions.canBanUsers) {
      Alert.alert('Permission Denied');
      return;
    }
    if (!banUserId || !banReason) {
      Alert.alert('Error', 'Please provide user ID and reason');
      return;
    }
    try {
      await supabase.from('banned_users').insert({
        user_id: banUserId,
        reason: banReason,
        banned_by: user?.id,
        is_permanent: true,
        is_active: true,
      });
      Alert.alert('Success', 'User banned');
      setBanUserId('');
      setBanReason('');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to ban user');
    }
  };

  const handleUnbanUser = async (banId: string) => {
    try {
      await supabase.from('banned_users').update({ is_active: false }).eq('id', banId);
      Alert.alert('Success', 'User unbanned');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to unban user');
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
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={[styles.roleBadge, { backgroundColor: theme.colors.admin }]}>
          <Text style={styles.roleBadgeText}>ADMIN</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {(['reports', 'bans', 'analytics'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'reports' && (
          <View>
            <Text style={styles.sectionTitle}>All Reports</Text>
            {reports.length === 0 ? (
              <Text style={styles.emptyText}>No reports</Text>
            ) : (
              reports.map((report: any) => (
                <View key={report.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{report.content_type}</Text>
                  <Text style={styles.cardText}>{report.reason}</Text>
                  <Text style={styles.cardSubtext}>Status: {report.status}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'bans' && (
          <View>
            <View style={styles.banForm}>
              <Text style={styles.sectionTitle}>Ban User</Text>
              <TextInput
                style={styles.input}
                placeholder="User ID"
                placeholderTextColor={theme.colors.textSecondary}
                value={banUserId}
                onChangeText={setBanUserId}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Reason"
                placeholderTextColor={theme.colors.textSecondary}
                value={banReason}
                onChangeText={setBanReason}
                multiline
              />
              <TouchableOpacity style={styles.banButton} onPress={handleBanUser}>
                <Text style={styles.banButtonText}>Ban User</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Banned Users</Text>
            {bannedUsers.map((ban: any) => (
              <View key={ban.id} style={styles.card}>
                <Text style={styles.cardTitle}>@{ban.user?.username}</Text>
                <Text style={styles.cardText}>{ban.reason}</Text>
                <TouchableOpacity
                  style={styles.unbanButton}
                  onPress={() => handleUnbanUser(ban.id)}
                >
                  <Text style={styles.unbanButtonText}>Unban</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'analytics' && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="flag" size={32} color={theme.colors.warning} />
              <Text style={styles.statValue}>{stats.pendingReports}</Text>
              <Text style={styles.statLabel}>Pending Reports</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={32} color={theme.colors.success} />
              <Text style={styles.statValue}>{stats.resolvedToday}</Text>
              <Text style={styles.statLabel}>Resolved Today</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="ban" size={32} color={theme.colors.error} />
              <Text style={styles.statValue}>{stats.activeBans}</Text>
              <Text style={styles.statLabel}>Active Bans</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="people" size={32} color={theme.colors.primary} />
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  roleBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  roleBadgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  activeTab: { backgroundColor: theme.colors.primaryLight },
  tabText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  activeTabText: { color: theme.colors.primary, fontWeight: theme.typography.weights.semibold },
  content: { flex: 1, padding: theme.spacing.md },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  cardText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  cardSubtext: { fontSize: theme.typography.sizes.xs, color: theme.colors.textDisabled, marginTop: theme.spacing.xs },
  emptyText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.lg },
  banForm: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  banButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  banButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  unbanButton: {
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
  },
  unbanButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
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
});
