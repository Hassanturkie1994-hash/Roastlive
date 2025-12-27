import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { settingsService, UserSettings } from '../../../../services/settingsService';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DNDScreen() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const toggleDND = async (value: boolean) => {
    setEnabled(value);
    if (user?.id) {
      await settingsService.updateSettings(user.id, { do_not_disturb: value });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Do Not Disturb</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <Ionicons name="moon" size={32} color={enabled ? theme.colors.primary : theme.colors.textSecondary} />
            <View>
              <Text style={styles.toggleLabel}>Do Not Disturb</Text>
              <Text style={styles.toggleDescription}>
                {enabled ? 'Notifications paused during set hours' : 'Set quiet hours for notifications'}
              </Text>
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggleDND}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>

        {enabled && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Schedule</Text>
              
              <TouchableOpacity
                style={styles.timeItem}
                onPress={() => setShowStartPicker(true)}
              >
                <View style={styles.timeLeft}>
                  <Ionicons name="time" size={24} color={theme.colors.primary} />
                  <View>
                    <Text style={styles.timeLabel}>Start Time</Text>
                    <Text style={styles.timeValue}>{formatTime(startTime)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timeItem}
                onPress={() => setShowEndPicker(true)}
              >
                <View style={styles.timeLeft}>
                  <Ionicons name="time" size={24} color={theme.colors.primary} />
                  <View>
                    <Text style={styles.timeLabel}>End Time</Text>
                    <Text style={styles.timeValue}>{formatTime(endTime)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.infoText}>
                During these hours, you won't receive push notifications. Important messages will still be available in-app.
              </Text>
            </View>
          </>
        )}

        {showStartPicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            is24Hour={false}
            onChange={(event, selectedTime) => {
              setShowStartPicker(Platform.OS === 'ios');
              if (selectedTime) setStartTime(selectedTime);
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            is24Hour={false}
            onChange={(event, selectedTime) => {
              setShowEndPicker(Platform.OS === 'ios');
              if (selectedTime) setEndTime(selectedTime);
            }}
          />
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
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: { padding: theme.spacing.sm },
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  content: { flex: 1 },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    margin: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
  toggleLabel: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  toggleDescription: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 4 },
  section: { marginTop: theme.spacing.lg },
  sectionTitle: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  timeLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  timeLabel: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary },
  timeValue: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginTop: 4 },
  infoCard: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
  },
  infoText: { flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.text, lineHeight: 18 },
});
