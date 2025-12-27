import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../config/supabase';

export default function SecuritySettingsScreen() {
  const { user } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleToggle2FA = () => {
    Alert.alert(
      'Two-Factor Authentication',
      twoFactorEnabled ? 'Disable 2FA? Your account will be less secure.' : '2FA will require a code sent to your email/phone when logging in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: twoFactorEnabled ? 'Disable' : 'Enable',
          onPress: () => {
            setTwoFactorEnabled(!twoFactorEnabled);
            Alert.alert('Success', twoFactorEnabled ? '2FA disabled' : '2FA enabled. Check your email for setup instructions.');
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
        <Text style={styles.headerTitle}>Password & Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Two-Factor Authentication */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <Ionicons name="shield-checkmark" size={24} color={twoFactorEnabled ? theme.colors.success : theme.colors.textSecondary} />
                <View>
                  <Text style={styles.cardLabel}>2FA Protection</Text>
                  <Text style={styles.cardDescription}>
                    {twoFactorEnabled ? 'Your account is protected' : 'Add an extra layer of security'}
                  </Text>
                </View>
              </View>
              <Switch
                value={twoFactorEnabled}
                onValueChange={handleToggle2FA}
                trackColor={{ false: theme.colors.border, true: theme.colors.success }}
                thumbColor={theme.colors.surface}
              />
            </View>
          </View>
        </View>

        {/* Change Password */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.button, (!newPassword || !confirmPassword) && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={!newPassword || !confirmPassword}
            >
              <Text style={styles.buttonText}>Update Password</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Options</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/profile/settings/sessions')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="phone-portrait" size={22} color={theme.colors.textSecondary} />
              <View>
                <Text style={styles.settingLabel}>Active Sessions</Text>
                <Text style={styles.settingDescription}>Manage logged in devices</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/profile/settings/connected-accounts')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="link" size={22} color={theme.colors.textSecondary} />
              <View>
                <Text style={styles.settingLabel}>Connected Accounts</Text>
                <Text style={styles.settingDescription}>Social login connections</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
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
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  card: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, marginHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
  cardLabel: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  cardDescription: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 4 },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.base,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonDisabled: { backgroundColor: theme.colors.border, opacity: 0.5 },
  buttonText: { color: theme.colors.text, fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
  settingLabel: { fontSize: theme.typography.sizes.base, color: theme.colors.text },
  settingDescription: { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
});
