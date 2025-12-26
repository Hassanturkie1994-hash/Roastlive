import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface ReportReason {
  id: string;
  label: string;
}

export default function ReportFormScreen() {
  const router = useRouter();
  const { reportType } = useLocalSearchParams();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasonsByType: Record<string, ReportReason[]> = {
    user: [
      { id: 'harassment', label: 'Harassment or bullying' },
      { id: 'hate_speech', label: 'Hate speech' },
      { id: 'spam', label: 'Spam or scam' },
      { id: 'impersonation', label: 'Impersonation' },
      { id: 'inappropriate', label: 'Inappropriate behavior' },
      { id: 'other', label: 'Other' },
    ],
    stream: [
      { id: 'inappropriate_content', label: 'Inappropriate content' },
      { id: 'violence', label: 'Violence or dangerous behavior' },
      { id: 'nudity', label: 'Nudity or sexual content' },
      { id: 'copyright', label: 'Copyright violation' },
      { id: 'misleading', label: 'Misleading or fake content' },
      { id: 'other', label: 'Other' },
    ],
    chat: [
      { id: 'spam', label: 'Spam' },
      { id: 'harassment', label: 'Harassment' },
      { id: 'hate_speech', label: 'Hate speech' },
      { id: 'threats', label: 'Threats or violence' },
      { id: 'inappropriate', label: 'Inappropriate content' },
      { id: 'other', label: 'Other' },
    ],
    other: [
      { id: 'bug', label: 'Technical issue or bug' },
      { id: 'feature', label: 'Feature request' },
      { id: 'abuse', label: 'Terms of service violation' },
      { id: 'safety', label: 'Safety concern' },
      { id: 'other', label: 'Other' },
    ],
  };

  const reasons = reasonsByType[reportType as string] || reasonsByType.other;

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Missing Information', 'Please select a reason for your report.');
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert('Missing Information', 'Please provide a detailed description (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Implement API call to submit report
      // const response = await fetch('/api/reports', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     type: reportType,
      //     reason: selectedReason,
      //     description: description.trim(),
      //   }),
      // });

      setTimeout(() => {
        setSubmitting(false);
        Alert.alert(
          'Report Submitted',
          'Thank you for your report. Our moderation team will review it shortly.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }, 1000);
    } catch (error) {
      console.error('Error submitting report:', error);
      setSubmitting(false);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const getTitle = () => {
    const titles: Record<string, string> = {
      user: 'Report User',
      stream: 'Report Stream',
      chat: 'Report Chat Message',
      other: 'Report Issue',
    };
    return titles[reportType as string] || 'Report Issue';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getTitle()}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Reason for Report</Text>
          <Text style={styles.sectionDescription}>
            Select the reason that best describes the issue:
          </Text>

          {reasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonOption,
                selectedReason === reason.id && styles.reasonOptionSelected,
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <View
                style={[
                  styles.radioButton,
                  selectedReason === reason.id && styles.radioButtonSelected,
                ]}
              >
                {selectedReason === reason.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
              <Text
                style={[
                  styles.reasonLabel,
                  selectedReason === reason.id && styles.reasonLabelSelected,
                ]}
              >
                {reason.label}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Additional Details</Text>
          <Text style={styles.sectionDescription}>
            Please provide more information about the issue:
          </Text>

          <TextInput
            style={styles.textArea}
            placeholder="Describe the issue in detail..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={6}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />

          <View style={styles.noteBox}>
            <Ionicons name="shield-checkmark" size={20} color="#4ade80" />
            <Text style={styles.noteText}>
              Your report is confidential and will be reviewed by our moderation team.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedReason || description.trim().length < 10) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || !selectedReason || description.trim().length < 10}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonOptionSelected: {
    borderColor: '#ff4444',
    backgroundColor: '#2a1a1a',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: '#ff4444',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff4444',
  },
  reasonLabel: {
    fontSize: 15,
    color: '#ccc',
  },
  reasonLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    minHeight: 120,
    marginBottom: 16,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#1a2a1a',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: '#4ade80',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  submitButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
