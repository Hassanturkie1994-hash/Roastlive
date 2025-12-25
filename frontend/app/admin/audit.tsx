import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminRole } from '../../hooks/useAdminRole';
import { supabase } from '../../lib/supabase';

interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  target_user_id?: string;
  reason?: string;
  created_at: string;
  admin?: { username: string };
  target_user?: { username: string };
}

export default function AuditTrailScreen() {
  const router = useRouter();
  const { permissions, loading: roleLoading } = useAdminRole();
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !permissions.canViewLogs) {
      Alert.alert('Access Denied', 'You do not have permission to view audit logs');
      router.back();
      return;
    }
    if (!roleLoading) {
      loadAuditLog();
    }
  }, [roleLoading]);

  const loadAuditLog = async () => {
    try {
      const { data } = await supabase
        .from('admin_audit_log')
        .select(`
          *,
          admin:profiles!admin_id(username),
          target_user:profiles!target_user_id(username)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      setAuditLog(data || []);
    } catch (error) {
      console.error('Load audit log error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ban': return 'ban';
      case 'unban': return 'checkmark-circle';
      case 'timeout': return 'time';
      case 'delete_content': return 'trash';
      case 'resolve_report': return 'checkmark';
      case 'assign_role': return 'person-add';
      case 'approve_payout': return 'cash';
      case 'reject_payout': return 'close-circle';
      default: return 'help';
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('ban') || action.includes('delete')) return theme.colors.error;
    if (action.includes('approve') || action.includes('resolve')) return theme.colors.success;
    return theme.colors.warning;
  };

  const renderAuditEntry = ({ item }: { item: AuditEntry }) => (
    <View style={styles.auditCard}>
      <View style={[styles.actionIcon, { backgroundColor: `${getActionColor(item.action)}20` }]}>
        <Ionicons name={getActionIcon(item.action) as any} size={20} color={getActionColor(item.action)} />
      </View>
      <View style={styles.auditInfo}>
        <Text style={styles.actionText}>
          {item.action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </Text>
        <Text style={styles.detailsText}>
          By: @{item.admin?.username || 'Unknown'}
          {item.target_user && ` → Target: @${item.target_user.username}`}
        </Text>
        {item.reason && <Text style={styles.reasonText}>Reason: {item.reason}</Text>}
        <Text style={styles.timeText}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  if (loading || roleLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audit Trail</Text>
        <TouchableOpacity onPress={loadAuditLog}>
          <Ionicons name="refresh" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={auditLog}
        renderItem={renderAuditEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No audit entries</Text>
          </View>
        }
      />
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
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  list: { padding: theme.spacing.md },
  auditCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  auditInfo: { flex: 1 },
  actionText: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  detailsText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
  reasonText: { fontSize: theme.typography.sizes.sm, color: theme.colors.text, marginTop: 4 },
  timeText: { fontSize: theme.typography.sizes.xs, color: theme.colors.textDisabled, marginTop: 4 },
  emptyState: { alignItems: 'center', padding: theme.spacing.xxl, marginTop: theme.spacing.xxl },
  emptyText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
});
