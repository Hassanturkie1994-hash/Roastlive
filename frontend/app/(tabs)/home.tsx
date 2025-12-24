import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function Home() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ROAST LIVE</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome, {user?.user_metadata?.username || 'User'}!</Text>
          <Text style={styles.welcomeText}>Ready to join the roast? Browse live streams below.</Text>
        </View>

        {/* Live Now Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>Live Now</Text>
            </View>
          </View>
          <View style={styles.emptyState}>
            <Ionicons name="radio-outline" size={48} color={theme.colors.textDisabled} />
            <Text style={styles.emptyText}>No live streams at the moment</Text>
            <Text style={styles.emptySubtext}>Be the first to go live!</Text>
          </View>
        </View>

        {/* Trending Creators */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Creators</Text>
          <View style={styles.emptyState}>
            <Ionicons name="flame-outline" size={48} color={theme.colors.textDisabled} />
            <Text style={styles.emptyText}>Coming soon!</Text>
          </View>
        </View>
      </ScrollView>

      {/* Go Live Button */}
      <TouchableOpacity style={styles.goLiveButton}>
        <Ionicons name="videocam" size={24} color={theme.colors.text} />
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
    color: theme.colors.primary,
  },
  searchButton: {
    padding: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  welcomeTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  welcomeText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  section: {
    margin: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.live,
    marginRight: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textDisabled,
    marginTop: theme.spacing.xs,
  },
  goLiveButton: {
    position: 'absolute',
    bottom: theme.spacing.xl + 60,
    right: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  goLiveText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
});
