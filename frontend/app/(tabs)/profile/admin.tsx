import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reporter?: { username: string };
  reported_user?: { username: string };
}

interface BannedUser {
  id: string;
  user_id: string;
  reason: string;
  banned_until?: string;
  is_permanent: boolean;
  created_at: string;
  user?: { username: string; email: string };
}

export default function AdminPanel() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'reports' | 'bans' | 'stats'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeStreams: 0,
    totalGifts: 0,
    pendingReports: 0,
  });
  const [banUserId, setBanUserId] = useState('');
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const { data } = await supabase
          .from('reports')
          .select(`
            *,
            reporter:profiles!reporter_id(username),
            reported_user:profiles!reported_user_id(username)
          `)
          .order('created_at', { ascending: false })
          .limit(50);
        setReports(data || []);
      } else if (activeTab === 'bans') {
        const { data } = await supabase
          .from('banned_users')
          .select(`
            *,
            user:profiles!user_id(username)
          `)
          .order('created_at', { ascending: false });
        setBannedUsers(data || []);
      } else {
        // Load stats
        const [users, streams, gifts, pendingReports] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('streams').select('*', { count: 'exact', head: true }).eq('is_live', true),
          supabase.from('gift_transactions').select('*', { count: 'exact', head: true }),
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        ]);
        setStats({
          totalUsers: users.count || 0,
          activeStreams: streams.count || 0,
          totalGifts: gifts.count || 0,
          pendingReports: pendingReports.count || 0,
        });
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
    try {
      await supabase
        .from('reports')
        .update({ status: action, resolved_by: user?.id, resolved_at: new Date().toISOString() })
        .eq('id', reportId);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update report');
    }
  };

  const handleBanUser = async () => {
    if (!banUserId || !banReason) {
      Alert.alert('Error', 'Please enter user ID and reason');
      return;
    }
    try {
      await supabase.from('banned_users').insert({
        user_id: banUserId,
        reason: banReason,
        banned_by: user?.id,
        is_permanent: true,
      });
      setBanUserId('');
      setBanReason('');
      loadData();
      Alert.alert('Success', 'User has been banned');
    } catch (error) {
      Alert.alert('Error', 'Failed to ban user');
    }
  };

  const handleUnbanUser = async (banId: string) => {
    try {
      await supabase.from('banned_users').delete().eq('id', banId);
      loadData();
      Alert.alert('Success', 'User has been unbanned');
    } catch (error) {
      Alert.alert('Error', 'Failed to unban user');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return theme.colors.warning;
      case 'resolved': return theme.colors.success;
      case 'dismissed': return theme.colors.textSecondary;
      default: return theme.colors.text;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['reports', 'bans', 'stats'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === 'reports' ? 'flag' : tab === 'bans' ? 'ban' : 'stats-chart'}
              size={20}
              color={activeTab === tab ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <View>
              {reports.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
                  <Text style={styles.emptyTitle}>No Pending Reports</Text>
                </View>
              ) : (
                reports.map((report) => (
                  <View key={report.id} style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                        <Text style={styles.statusText}>{report.status}</Text>
                      </View>
                      <Text style={styles.reportDate}>{formatDate(report.created_at)}</Text>
                    </View>
                    <Text style={styles.reportType}>{report.content_type}</Text>
                    <Text style={styles.reportReason}>{report.reason}</Text>
                    <View style={styles.reportUsers}>
                      <Text style={styles.reportUserText}>
                        Reporter: @{report.reporter?.username || 'Unknown'}
                      </Text>
                      <Text style={styles.reportUserText}>
                        Reported: @{report.reported_user?.username || 'Unknown'}
                      </Text>
                    </View>
                    {report.status === 'pending' && (
                      <View style={styles.reportActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.resolveButton]}
                          onPress={() => handleResolveReport(report.id, 'resolved')}
                        >
                          <Text style={styles.actionButtonText}>Resolve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.dismissButton]}
                          onPress={() => handleResolveReport(report.id, 'dismissed')}
                        >
                          <Text style={styles.actionButtonText}>Dismiss</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* Bans Tab */}
          {activeTab === 'bans' && (
            <View>
              {/* Ban User Form */}
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
                  <Ionicons name="ban" size={20} color="#fff" />
                  <Text style={styles.banButtonText}>Ban User</Text>
                </TouchableOpacity>
              </View>

              {/* Banned Users List */}
              <Text style={styles.sectionTitle}>Banned Users ({bannedUsers.length})</Text>
              {bannedUsers.map((ban) => (
                <View key={ban.id} style={styles.banCard}>
                  <View style={styles.banInfo}>
                    <Text style={styles.banUsername}>@{ban.user?.username || 'Unknown'}</Text>
                    <Text style={styles.banReason}>{ban.reason}</Text>
                    <Text style={styles.banDate}>{formatDate(ban.created_at)}</Text>
                  </View>
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

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="people" size={32} color={theme.colors.primary} />
                <Text style={styles.statValue}>{stats.totalUsers}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="radio" size={32} color={theme.colors.live} />
                <Text style={styles.statValue}>{stats.activeStreams}</Text>
                <Text style={styles.statLabel}>Active Streams</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="gift" size={32} color={theme.colors.gold} />
                <Text style={styles.statValue}>{stats.totalGifts}</Text>
                <Text style={styles.statLabel}>Gifts Sent</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="flag" size={32} color={theme.colors.warning} />
                <Text style={styles.statValue}>{stats.pendingReports}</Text>
                <Text style={styles.statLabel}>Pending Reports</Text>
              </View>
            </View>
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
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  activeTab: {
    backgroundColor: theme.colors.primaryLight,
  },
  tabText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  activeTabText: {
    color: theme.colors.primary,
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
  reportCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    textTransform: 'uppercase',
  },
  reportDate: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  reportType: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  reportReason: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  reportUsers: {
    marginBottom: theme.spacing.md,
  },
  reportUserText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  reportActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  resolveButton: {
    backgroundColor: theme.colors.success,
  },
  dismissButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  actionButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  banButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  banButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
  banCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  banInfo: {
    flex: 1,
  },
  banUsername: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  banReason: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  banDate: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textDisabled,
    marginTop: theme.spacing.xs,
  },
  unbanButton: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  unbanButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statValue: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});
