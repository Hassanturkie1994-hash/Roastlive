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

export default function SupportDashboard() {
  const router = useRouter();
  const { role, permissions, loading: roleLoading } = useAdminRole();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    if (!roleLoading && (!role || !permissions.canViewReports)) {
      Alert.alert('Access Denied', 'You do not have support permissions');
      router.back();
      return;
    }
    if (!roleLoading) {
      loadReports();
    }
  }, [roleLoading, activeTab]);

  const loadReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_reports')
        .select(`
          *,
          reporter:profiles!reporter_id(username),
          reported_user:profiles!reported_user_id(username)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (activeTab === 'pending') {
        query = query.eq('status', 'pending');
      }

      const { data } = await query;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(
    (report) =>
      report.reporter?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reported_user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'resolved':
        return theme.colors.success;
      case 'dismissed':
        return theme.colors.textSecondary;
      default:
        return theme.colors.text;
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Dashboard</Text>
        <View style={[styles.roleBadge, { backgroundColor: theme.colors.support }]}>
          <Text style={styles.roleBadgeText}>SUP</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search reports..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All Reports
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reports List */}
      <ScrollView style={styles.content}>
        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No reports found</Text>
          </View>
        ) : (
          filteredReports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                  <Text style={styles.statusText}>{report.status}</Text>
                </View>
                <Text style={styles.reportDate}>
                  {new Date(report.created_at).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.reportType}>
                <Ionicons
                  name={report.content_type === 'user' ? 'person' : 'document-text'}
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.reportTypeText}>{report.content_type}</Text>
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

              {!permissions.canResolveReports && (
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle" size={16} color={theme.colors.info} />
                  <Text style={styles.infoText}>
                    Contact a moderator or admin to resolve this report
                  </Text>
                </View>
              )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.semibold,
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
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
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  reportType: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}20`,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  reportTypeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
    textTransform: 'uppercase',
    fontWeight: theme.typography.weights.bold,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.info}20`,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.info,
    marginLeft: theme.spacing.xs,
  },
});
