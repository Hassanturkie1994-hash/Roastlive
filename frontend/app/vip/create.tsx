import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function CreateVIPClubScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [clubName, setClubName] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [badgeColor, setBadgeColor] = useState(theme.colors.vip);
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [creating, setCreating] = useState(false);
  const [streamingTime, setStreamingTime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStreamingTime();
  }, []);

  const checkStreamingTime = async () => {
    if (!user?.id) return;

    try {
      // Get all completed streams and calculate total time
      const { data: streams } = await supabase
        .from('streams')
        .select('started_at, ended_at')
        .eq('host_id', user.id)
        .not('started_at', 'is', null)
        .not('ended_at', 'is', null);

      if (streams) {
        let totalSeconds = 0;
        streams.forEach(stream => {
          const start = new Date(stream.started_at).getTime();
          const end = new Date(stream.ended_at).getTime();
          totalSeconds += (end - start) / 1000;
        });
        setStreamingTime(totalSeconds);
      }
    } catch (error) {
      console.error('Error checking streaming time:', error);
    } finally {
      setLoading(false);
    }
  };

  const colors = [
    { name: 'Purple', value: '#9C27B0' },
    { name: 'Gold', value: '#FFD700' },
    { name: 'Red', value: '#DC143C' },
    { name: 'Blue', value: '#2196F3' },
    { name: 'Green', value: '#00C853' },
  ];

  const handleCreate = async () => {
    // Check if user has streamed for at least 1 hour
    if (streamingTime < 3600) {
      const hoursNeeded = ((3600 - streamingTime) / 3600).toFixed(1);
      Alert.alert(
        'Streaming Requirement Not Met',
        `You need to stream for at least 1 hour total to create a VIP club. You need ${hoursNeeded} more hours of streaming.`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (!clubName.trim()) {
      Alert.alert('Error', 'Please enter a club name');
      return;
    }

    if (badgeText.length > 5) {
      Alert.alert('Error', 'Badge text must be 5 characters or less');
      return;
    }

    if (!monthlyPrice || parseInt(monthlyPrice) < 50) {
      Alert.alert('Error', 'Minimum price is 50 SEK per month');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from('vip_clubs').insert({
        creator_id: user?.id,
        name: clubName,
        badge_text: badgeText.toUpperCase(),
        badge_color: badgeColor,
        price_monthly: parseInt(monthlyPrice),
        is_active: true,
      });

      if (error) throw error;

      Alert.alert('Success', 'VIP Club created!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create VIP club');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create VIP Club</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Streaming Time Requirement */}
        <View style={[\n          styles.requirementCard,\n          streamingTime >= 3600 ? styles.requirementMet : styles.requirementNotMet,\n        ]}>\n          <Ionicons\n            name={streamingTime >= 3600 ? \"checkmark-circle\" : \"time\"}\n            size={32}\n            color={streamingTime >= 3600 ? theme.colors.success : theme.colors.warning}\n          />\n          <View style={styles.requirementText}>\n            <Text style={styles.requirementTitle}>\n              {streamingTime >= 3600 ? 'Requirement Met!' : 'Streaming Time Required'}\n            </Text>\n            <Text style={styles.requirementSubtitle}>\n              Total streaming: {Math.floor(streamingTime / 60)} minutes\n              {streamingTime < 3600 && ` / 60 minutes required`}\n            </Text>\n          </View>\n        </View>\n\n        {streamingTime < 3600 ? (\n          <View style={styles.blockedState}>\n            <Ionicons name=\"lock-closed\" size={64} color={theme.colors.textSecondary} />\n            <Text style={styles.blockedText}>\n              You need to stream for at least 1 hour before creating a VIP club.\n            </Text>\n            <TouchableOpacity\n              style={styles.goStreamButton}\n              onPress={() => router.push('/pre-live-setup')}\n            >\n              <Text style={styles.goStreamButtonText}>Start Streaming</Text>\n            </TouchableOpacity>\n          </View>\n        ) : (\n          <View style={styles.form}>
          <Text style={styles.label}>Club Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Roast Kings Club"
            placeholderTextColor={theme.colors.textSecondary}
            value={clubName}
            onChangeText={setClubName}
          />

          <Text style={styles.label}>Badge Text (Max 5 chars)</Text>
          <TextInput
            style={styles.input}
            placeholder="VIP"
            placeholderTextColor={theme.colors.textSecondary}
            value={badgeText}
            onChangeText={(text) => text.length <= 5 && setBadgeText(text)}
            maxLength={5}
          />
          <Text style={styles.charCount}>{badgeText.length}/5</Text>

          <Text style={styles.label}>Badge Color</Text>
          <View style={styles.colorPicker}>
            {colors.map((color) => (
              <TouchableOpacity
                key={color.value}
                style={[
                  styles.colorOption,
                  { backgroundColor: color.value },
                  badgeColor === color.value && styles.colorOptionSelected,
                ]}
                onPress={() => setBadgeColor(color.value)}
              >
                {badgeColor === color.value && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Monthly Price (SEK)</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 50 SEK"
            placeholderTextColor={theme.colors.textSecondary}
            value={monthlyPrice}
            onChangeText={setMonthlyPrice}
            keyboardType="numeric"
          />

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Badge Preview:</Text>
            <View style={[styles.badgePreview, { backgroundColor: badgeColor }]}>
              <Text style={styles.badgePreviewText}>{badgeText.toUpperCase() || 'VIP'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={creating}
          >
            <Text style={styles.createButtonText}>
              {creating ? 'Creating...' : 'Create VIP Club'}
            </Text>
          </TouchableOpacity>
        </View>
        )}
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
    paddingTop: theme.spacing.xxl + 10,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1, padding: theme.spacing.md },
  requirementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  requirementMet: { backgroundColor: `${theme.colors.success}20` },
  requirementNotMet: { backgroundColor: `${theme.colors.warning}20` },
  requirementText: { flex: 1, marginLeft: theme.spacing.md },
  requirementTitle: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  requirementSubtitle: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 4 },
  blockedState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl },
  blockedText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.md, marginBottom: theme.spacing.xl },
  goStreamButton: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.lg, borderRadius: theme.borderRadius.full },
  goStreamButtonText: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: '#fff' },
  form: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
  label: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  charCount: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, textAlign: 'right', marginTop: 4 },
  colorPicker: { flexDirection: 'row', marginTop: theme.spacing.sm },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: { borderWidth: 3, borderColor: '#fff' },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  previewLabel: { fontSize: theme.typography.sizes.sm, color: theme.colors.text, marginRight: theme.spacing.md },
  badgePreview: { paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
  badgePreviewText: { fontSize: theme.typography.sizes.xs, fontWeight: theme.typography.weights.bold, color: '#fff' },
  createButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  createButtonText: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: '#fff' },
});
