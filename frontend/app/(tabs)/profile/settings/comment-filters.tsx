import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService } from '../../../../services/settingsService';

interface CommentFilter {
  id: string;
  keyword: string;
  filter_type: 'block' | 'hold_for_review';
  created_at: string;
}

export default function CommentFiltersScreen() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<CommentFilter[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    if (!user?.id) return;
    const data = await settingsService.getCommentFilters(user.id) as any;
    setFilters(data);
    setLoading(false);
  };

  const handleAddFilter = async () => {
    if (!newKeyword.trim() || !user?.id) return;

    const success = await settingsService.addCommentFilter(user.id, newKeyword.trim());
    if (success) {
      setNewKeyword('');
      loadFilters();
    }
  };

  const handleRemoveFilter = (filterId: string, keyword: string) => {
    Alert.alert(
      'Remove Filter',
      `Remove "${keyword}" from filters?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await settingsService.removeCommentFilter(filterId);
            if (success) {
              setFilters(prev => prev.filter(f => f.id !== filterId));
            }
          }
        }
      ]
    );
  };

  const renderFilter = ({ item }: { item: CommentFilter }) => (
    <View style={styles.filterItem}>
      <View style={styles.filterLeft}>
        <Ionicons name="close-circle" size={20} color={theme.colors.error} />
        <Text style={styles.filterKeyword}>{item.keyword}</Text>
      </View>
      <TouchableOpacity onPress={() => handleRemoveFilter(item.id, item.keyword)}>
        <Ionicons name="trash" size={20} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comment Filters</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="shield" size={24} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Block comments containing specific words or phrases. Filtered comments won't appear on your content.
          </Text>
        </View>

        {/* Add Filter */}
        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>Add Blocked Word/Phrase</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter word or phrase..."
              placeholderTextColor={theme.colors.textSecondary}
              value={newKeyword}
              onChangeText={setNewKeyword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.addButton, !newKeyword.trim() && styles.addButtonDisabled]}
              onPress={handleAddFilter}
              disabled={!newKeyword.trim()}
            >
              <Ionicons name="add" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter List */}
        <View style={styles.filtersSection}>
          <Text style={styles.sectionTitle}>
            Filtered Keywords ({filters.length})
          </Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : filters.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="filter" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No filters yet</Text>
              <Text style={styles.emptySubtext}>Add words or phrases to block</Text>
            </View>
          ) : (
            <FlatList
              data={filters}
              renderItem={renderFilter}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: { padding: theme.spacing.sm },
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
  },
  infoText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.text, lineHeight: 18 },
  addSection: { padding: theme.spacing.md },
  sectionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.md,
  },
  inputContainer: { flexDirection: 'row', gap: theme.spacing.sm },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.base,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { backgroundColor: theme.colors.border, opacity: 0.5 },
  filtersSection: { padding: theme.spacing.md },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  filterLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 },
  filterKeyword: { fontSize: theme.typography.sizes.base, color: theme.colors.text },
  emptyState: { alignItems: 'center', padding: theme.spacing.xl, gap: theme.spacing.sm },
  emptyText: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  emptySubtext: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  loadingText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, textAlign: 'center', padding: theme.spacing.xl },
});
