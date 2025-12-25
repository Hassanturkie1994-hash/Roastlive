import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

interface Report {
  id: string;
  reporter_username: string;
  reported_username: string;
  report_type: string;
  reason: string;
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  created_at: string;
}

export default function AdminReportsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'open' | 'in_review' | 'closed'>('all');
  const [reports] = useState<Report[]>([]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return theme.colors.error;
      case 'in_review': return theme.colors.warning;
      case 'resolved': return theme.colors.success;
      case 'closed': return theme.colors.textSecondary;
      default: return theme.colors.text;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'stream': return 'videocam';
      case 'profile': return 'person';
      case 'message': return 'chatbubble';
      case 'post': return 'image';
      case 'story': return 'time';
      default: return 'flag';
    }
  };

  const renderReport = ({ item }: { item: Report }) => (
    <TouchableOpacity style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={[styles.typeIcon, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Ionicons name={getTypeIcon(item.report_type) as any} size={20} color={getStatusColor(item.status)} />
        </View>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>
            {item.reporter_username} reported {item.reported_username}
          </Text>
          <Text style={styles.reportReason}>{item.reason}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'open', 'in_review', 'closed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={reports}
        renderItem={renderReport}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent=(
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.success} />
            <Text style={styles.emptyText}>No {filter === 'all' ? '' : filter} reports</Text>
          </View>
        )
      />
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
  filterContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  list: {
    padding: theme.spacing.md,
  },
  reportCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  reportReason: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});