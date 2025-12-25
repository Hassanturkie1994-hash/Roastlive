import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

export default function Live() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'discover' | 'following'>('discover');

  const handleGoLive = () => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }
    router.push('/(tabs)/live/broadcast');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        <View style={styles.emptyState}>
          <View style={styles.liveIcon}>
            <Ionicons name="radio" size={64} color={theme.colors.primary} />
            <View style={styles.liveDot} />
          </View>
          <Text style={styles.emptyTitle}>No Live Streams</Text>
          <Text style={styles.emptyText}>
            Be the first to go live and start a roast battle!
          </Text>
        </View>
      </ScrollView>

      {/* Go Live Button */}
      <TouchableOpacity style={styles.goLiveButton} onPress={handleGoLive}>
        <View style={styles.goLiveIconContainer}>
          <Ionicons name="videocam" size={28} color={theme.colors.text} />
        </View>
        <Text style={styles.goLiveText}>Go Live</Text>
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    paddingTop: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  searchButton: {
    padding: theme.spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl * 2,
  },
  liveIcon: {
    position: 'relative',
    marginBottom: theme.spacing.lg,
  },
  liveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.live,
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  goLiveButton: {
    position: 'absolute',
    bottom: theme.spacing.xl + 70,
    right: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  goLiveIconContainer: {
    marginRight: theme.spacing.sm,
  },
  goLiveText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
});
