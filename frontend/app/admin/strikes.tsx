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
import { theme } from '../../constants/theme';

interface Strike {
  id: string;
  user_id: string;
  username: string;
  creator_username: string;
  strike_level: number;
  violation_type: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export default function AIStrikesViewerScreen() {
  const router = useRouter();
  const [strikes] = useState<Strike[]>([]);

  const getStrikeLevelColor = (level: number) => {
    switch (level) {
      case 1: return theme.colors.warning;
      case 2: return '#FF9800';
      case 3: return '#FF5722';
      case 4: return theme.colors.error;
      default: return theme.colors.text;
    }
  };

  const getStrikeLevelText = (level: number) => {
    switch (level) {
      case 1: return 'Warning';
      case 2: return 'Timeout';
      case 3: return 'Stream Ban (24h)';
      case 4: return 'Permanent Ban';
      default: return 'Strike';
    }
  };

  const renderStrike = ({ item }: { item: Strike }) => (
    <View style={styles.strikeCard}>
      <View style={[styles.strikeLevel, { backgroundColor: getStrikeLevelColor(item.strike_level) }]}>
        <Text style={styles.strikeLevelText}>{item.strike_level}</Text>
      </View>
      <View style={styles.strikeInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.strikeType}>{getStrikeLevelText(item.strike_level)}</Text>
        <Text style={styles.creatorText}>In {item.creator_username}'s streams</Text>
        <Text style={styles.expiryText}>
          {item.is_active ? `Expires: ${item.expires_at}` : 'Expired'}
        </Text>
      </View>
      {item.is_active && (
        <View style={styles.activeBadge}>
          <Text style={styles.activeText}>ACTIVE</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Strikes</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
        <Text style={styles.infoText}>
          Strike system: 1=Warning, 2=Timeout, 3=24h Ban, 4=Permanent Ban. Strikes expire after 30 days.
        </Text>
      </View>

      <FlatList
        data={strikes}
        renderItem={renderStrike}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={64} color={theme.colors.success} />
            <Text style={styles.emptyText}>No active strikes</Text>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}15`,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    lineHeight: 18,
  },
  list: {
    padding: theme.spacing.md,
  },
  strikeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  strikeLevel: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  strikeLevelText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  strikeInfo: {
    flex: 1,
  },
  username: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  strikeType: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.error,
    marginTop: 2,
  },
  creatorText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  expiryText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  activeText: {
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