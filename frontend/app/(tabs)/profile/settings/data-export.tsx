import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService } from '../../../../services/settingsService';

export default function DataExportScreen() {
  const { user } = useAuth();
  const [requesting, setRequesting] = useState(false);

  const handleRequestExport = async () => {
    Alert.alert(
      'Download Your Data',
      'We\'ll prepare a copy of your data including:\n\n• Profile information\n• Posts and videos\n• Comments and likes\n• Chat history\n• Stream replays\n\nThis may take a few hours. You\'ll receive an email when ready.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Export',
          onPress: async () => {
            if (!user?.id) return;
            setRequesting(true);
            const exportId = await settingsService.requestDataExport(user.id);
            setRequesting(false);
            
            if (exportId) {
              Alert.alert(
                'Export Requested',
                'Your data export has been queued. You\'ll receive an email when it\'s ready to download (usually within 24 hours).'
              );
            } else {
              Alert.alert('Error', 'Failed to request export. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Download Your Data</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Ionicons name="cloud-download" size={48} color={theme.colors.primary} style={{ alignSelf: 'center' }} />
          <Text style={styles.cardTitle}>Export Your Data</Text>
          <Text style={styles.cardDescription}>
            Request a copy of all your data from Roast Live. You'll receive:
          </Text>
          
          <View style={styles.list}>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.listText}>Profile information and settings</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.listText}>All your posts and videos</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.listText}>Comments and likes history</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.listText}>Chat and direct messages</Text>
            </View>
            <View style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.listText}>Stream replays and analytics</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.exportButton, requesting && styles.exportButtonDisabled]}
            onPress={handleRequestExport}
            disabled={requesting}
          >
            {requesting ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <>
                <Ionicons name="download" size={20} color={theme.colors.text} />
                <Text style={styles.exportButtonText}>Request Data Export</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>
            💡 The export process may take up to 24 hours. You'll receive an email with a download link when ready. The link will be valid for 7 days.
          </Text>
        </View>

        <View style={styles.warningCard}>
          <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Privacy Protected</Text>
            <Text style={styles.warningText}>
              Your data export is encrypted and only accessible to you. The download link is unique and expires after 7 days.
            </Text>
          </View>
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
  headerTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1, padding: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  list: { gap: theme.spacing.md, marginBottom: theme.spacing.xl },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  listText: { fontSize: theme.typography.sizes.base, color: theme.colors.text, flex: 1 },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  exportButtonDisabled: { opacity: 0.6 },
  exportButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  note: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  warningTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  warningText: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, lineHeight: 18 },
});
