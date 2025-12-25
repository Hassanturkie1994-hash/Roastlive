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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAdminRole } from '../../hooks/useAdminRole';
import { supabase } from '../../lib/supabase';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  content_type: string;
  reason: string;
  status: string;
  created_at: string;
  reporter?: { username: string };
  reported_user?: { username: string };
}

export default function ModeratorDashboard() {
  const router = useRouter();
  const { role, permissions, loading: roleLoading } = useAdminRole();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingReports: 0,
    resolvedToday: 0,
    flaggedContent: 0,
  });

  useEffect(() => {
    if (!roleLoading && (!role || !permissions.canViewReports)) {
      Alert.alert('Access Denied', 'You do not have moderator permissions');
      router.back();
      return;
    }
    if (!roleLoading) {
      loadData();
    }
  }, [roleLoading]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load pending reports
      const { data: reportsData } = await supabase
        .from('user_reports')
        .select(`
          *,
          reporter:profiles!reporter_id(username),
          reported_user:profiles!reported_user_id(username)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      setReports(reportsData || []);

      // Load stats
      const [pending, resolved, flagged] = await Promise.all([
        supabase.from('user_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('user_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'resolved')
          .gte('resolved_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_flagged', true),
      ]);

      setStats({
        pendingReports: pending.count || 0,
        resolvedToday: resolved.count || 0,
        flaggedContent: flagged.count || 0,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
    if (!permissions.canResolveReports) {
      Alert.alert('Permission Denied', 'You cannot resolve reports');
      return;
    }

    try {
      await supabase
        .from('user_reports')
        .update({
          status: action,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      Alert.alert('Success', `Report ${action}`);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update report');
    }
  };

  const handleDeleteContent = async (contentId: string, contentType: string) => {
    if (!permissions.canDeleteContent) {
      Alert.alert('Permission Denied', 'You cannot delete content');
      return;
    }

    Alert.alert(
      'Delete Content',
      'Are you sure you want to delete this content?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const table = contentType === 'post' ? 'posts' : 'stories';
              await supabase.from(table).update({ is_deleted: true }).eq('id', contentId);
              Alert.alert('Success', 'Content deleted');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete content');
            }
          },
        },
      ]
    );
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moderator Dashboard</Text>
        <View style={[styles.roleBadge, { backgroundColor: theme.colors.moderator }]}>
          <Text style={styles.roleBadgeText}>MOD</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: `${theme.colors.warning}20` }]}>
            <Ionicons name="flag" size={28} color={theme.colors.warning} />
            <Text style={styles.statValue}>{stats.pendingReports}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: `${theme.colors.success}20` }]}>
            <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
            <Text style={styles.statValue}>{stats.resolvedToday}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: `${theme.colors.error}20` }]}>
            <Ionicons name="alert-circle" size={28} color={theme.colors.error} />
            <Text style={styles.statValue}>{stats.flaggedContent}</Text>
            <Text style={styles.statLabel}>Flagged</Text>
          </View>
        </View>

        {/* Reports List */}
        <Text style={styles.sectionTitle}>Recent Reports</Text>
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.success} />
            <Text style={styles.emptyText}>No pending reports</Text>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.reportType}>
                  <Ionicons
                    name={report.content_type === 'user' ? 'person' : 'document-text'}
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.reportTypeText}>{report.content_type}</Text>
                </View>
                <Text style={styles.reportDate}>
                  {new Date(report.created_at).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.reportReason}>{report.reason}</Text>

              <View style={styles.reportUsers}>
                <Text style={styles.reportUserText}>
                  Reporter: @{report.reporter?.username || 'Unknown'}
                </Text>
                <Text style={styles.reportUserText}>
                  Reported: @{report.reported_user?.username || 'Unknown'}
                </Text>
              </View>

              <View style={styles.reportActions}>
                {permissions.canResolveReports && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.resolveButton]}
                      onPress={() => handleResolveReport(report.id, 'resolved')}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Resolve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.dismissButton]}
                      onPress={() => handleResolveReport(report.id, 'dismissed')}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Dismiss</Text>
                    </TouchableOpacity>
                  </>
                )}

                {permissions.canDeleteContent && report.content_type !== 'user' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteContent(report.content_id, report.content_type)}
                  >
                    <Ionicons name="trash" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
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
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  reportType: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}20`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  reportTypeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
    textTransform: 'uppercase',
    fontWeight: theme.typography.weights.bold,
  },
  reportDate: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  reportReason: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  reportUsers: {
    marginBottom: theme.spacing.md,
  },
  reportUserText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  reportActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  resolveButton: {
    backgroundColor: theme.colors.success,
  },
  dismissButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  actionButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.xs,
  },
});
