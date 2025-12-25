import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const REPORT_REASONS = {
  user: [
    { id: 'harassment', label: 'Harassment or bullying', icon: 'warning' },
    { id: 'hate_speech', label: 'Hate speech or discrimination', icon: 'alert-circle' },
    { id: 'threats', label: 'Threats or violence', icon: 'skull' },
    { id: 'impersonation', label: 'Impersonation', icon: 'person' },
    { id: 'spam', label: 'Spam or scam', icon: 'mail' },
    { id: 'inappropriate', label: 'Inappropriate content', icon: 'eye-off' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
  ],
  stream: [
    { id: 'harassment', label: 'Harassment or bullying', icon: 'warning' },
    { id: 'hate_speech', label: 'Hate speech or slurs', icon: 'alert-circle' },
    { id: 'violence', label: 'Violence or threats', icon: 'skull' },
    { id: 'nudity', label: 'Nudity or sexual content', icon: 'eye-off' },
    { id: 'self_harm', label: 'Self-harm or suicide', icon: 'heart-dislike' },
    { id: 'illegal', label: 'Illegal activities', icon: 'ban' },
    { id: 'copyright', label: 'Copyright violation', icon: 'document' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
  ],
  message: [
    { id: 'harassment', label: 'Harassment', icon: 'warning' },
    { id: 'spam', label: 'Spam', icon: 'mail' },
    { id: 'inappropriate', label: 'Inappropriate content', icon: 'eye-off' },
    { id: 'threats', label: 'Threats', icon: 'skull' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
  ],
};

export default function ReportScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const reportType = (params.type as 'user' | 'stream' | 'message') || 'user';
  const reportedId = params.id as string;

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasons = REPORT_REASONS[reportType] || REPORT_REASONS.user;

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select a reason', 'Please select a reason for your report.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to submit a report.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_type: reportType,
        reported_id: reportedId,
        reason: selectedReason,
        additional_info: additionalInfo.trim() || null,
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. Our team will review it within 24 hours.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report {reportType.charAt(0).toUpperCase() + reportType.slice(1)}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Reports are reviewed by our moderation team. False reports may result in action against your account.
          </Text>
        </View>

        {/* Reason Selection */}
        <Text style={styles.sectionTitle}>Why are you reporting this?</Text>
        <View style={styles.reasonsList}>
          {reasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonItem,
                selectedReason === reason.id && styles.reasonItemSelected,
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <Ionicons
                name={reason.icon as any}
                size={22}
                color={selectedReason === reason.id ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={[
                styles.reasonText,
                selectedReason === reason.id && styles.reasonTextSelected,
              ]}>
                {reason.label}
              </Text>
              {selectedReason === reason.id && (
                <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Additional Info */}
        <Text style={styles.sectionTitle}>Additional information (optional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Provide any additional details that might help us review this report..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={5}
          maxLength={500}
          value={additionalInfo}
          onChangeText={setAdditionalInfo}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{additionalInfo.length}/500</Text>

        {/* Warning */}
        <View style={styles.warningCard}>
          <Ionicons name="alert-triangle" size={20} color={theme.colors.warning} />
          <Text style={styles.warningText}>
            If someone is in immediate danger, please contact local emergency services.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, !selectedReason && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!selectedReason || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xxl + 10, paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1, padding: theme.spacing.md },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.colors.primary}15`,
    padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.lg,
  },
  infoText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.primary, marginLeft: theme.spacing.sm },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.md },
  reasonsList: { marginBottom: theme.spacing.xl },
  reasonItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.sm,
    borderWidth: 2, borderColor: 'transparent',
  },
  reasonItemSelected: { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}10` },
  reasonText: { flex: 1, fontSize: theme.typography.sizes.base, color: theme.colors.text, marginLeft: theme.spacing.md },
  reasonTextSelected: { color: theme.colors.primary, fontWeight: theme.typography.weights.semibold },
  textArea: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md, fontSize: theme.typography.sizes.base, color: theme.colors.text,
    minHeight: 120, borderWidth: 1, borderColor: theme.colors.border,
  },
  charCount: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, textAlign: 'right', marginTop: theme.spacing.xs },
  warningCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.colors.warning}15`,
    padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.lg,
  },
  warningText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.warning, marginLeft: theme.spacing.sm },
  footer: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  submitButton: { backgroundColor: theme.colors.error, paddingVertical: theme.spacing.lg, borderRadius: theme.borderRadius.lg, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: theme.colors.textDisabled },
  submitButtonText: { color: '#fff', fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold },
});
