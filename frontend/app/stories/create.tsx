import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface Penalty {
  id: string;
  user_id: string;
  username: string;
  penalty_type: 'warning' | 'timeout' | 'ban' | 'suspend';
  reason: string;
  duration_minutes?: number;
  expires_at?: string;
  is_active: boolean;
  issued_by_username: string;
  created_at: string;
}

export default function AdminPenaltiesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [penalties] = useState<Penalty[]>([]);

  const getPenaltyColor = (type: string) => {
    switch (type) {
      case 'warning': return theme.colors.warning;
      case 'timeout': return theme.colors.warning;
      case 'ban': return theme.colors.error;
      case 'suspend': return theme.colors.error;
      default: return theme.colors.text;
    }
  };

  const getPenaltyIcon = (type: string) => {
    switch (type) {
      case 'warning': return 'alert-circle';
      case 'timeout': return 'time';
      case 'ban': return 'ban';
      case 'suspend': return 'pause-circle';
      default: return 'flag';
    }
  };

  const renderPenalty = ({ item }: { item: Penalty }) => (
    <TouchableOpacity style={styles.penaltyCard}>
      <View style={[styles.penaltyIcon, { backgroundColor: `${getPenaltyColor(item.penalty_type)}20` }]}>
        <Ionicons name={getPenaltyIcon(item.penalty_type) as any} size={24} color={getPenaltyColor(item.penalty_type)} />
      </View>
      <View style={styles.penaltyInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.penaltyType}>{item.penalty_type.toUpperCase()}</Text>
        <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text>
        <Text style={styles.issuer}>By: {item.issued_by_username}</Text>
      </View>
      <View style={styles.penaltyStatus}>
        {item.is_active ? (
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.error }]}>
            <Text style={styles.statusText}>ACTIVE</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.textSecondary }]}>
            <Text style={styles.statusText}>EXPIRED</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Penalties</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {(['all', 'active', 'expired'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={penalties}
        renderItem={renderPenalty}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.success} />
            <Text style={styles.emptyText}>No {filter === 'all' ? '' : filter} penalties</Text>
          </View>
        }
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.xs,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: theme.spacing.md,
  },
  penaltyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  penaltyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  penaltyInfo: {
    flex: 1,
  },
  username: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  penaltyType: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.error,
    marginTop: 2,
  },
  reason: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  issuer: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  penaltyStatus: {
    marginLeft: theme.spacing.md,
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