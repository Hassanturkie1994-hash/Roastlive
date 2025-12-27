import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface SettingsState {
  is2FAEnabled: boolean;
  isCreatorRegistered: boolean;
  canReceivePayments: boolean;
  loading: boolean;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [state, setState] = useState<SettingsState>({
    is2FAEnabled: false,
    isCreatorRegistered: false,
    canReceivePayments: false,
    loading: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      // Check 2FA status
      const twoFAResponse = await fetch(`${BACKEND_URL}/api/2fa/status`, {
        credentials: 'include',
      });
      
      // Check payout status
      const payoutResponse = await fetch(`${BACKEND_URL}/api/payouts/status`, {
        credentials: 'include',
      });

      if (twoFAResponse.ok && payoutResponse.ok) {
        const twoFAData = await twoFAResponse.json();
        const payoutData = await payoutResponse.json();

        setState({
          is2FAEnabled: twoFAData.is_2fa_enabled || false,
          isCreatorRegistered: payoutData.is_registered || false,
          canReceivePayments: payoutData.can_receive_payments || false,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSetup2FA = () => {
    router.push('/profile/settings/setup-2fa');
  };

  const handleDisable2FA = async () => {
    Alert.alert(
      'Disable 2FA',
      'Are you sure you want to disable two-factor authentication?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/2fa/disable`, {
                method: 'POST',
                credentials: 'include',
              });

              if (response.ok) {
                Alert.alert('Success', '2FA has been disabled');
                loadSettings();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to disable 2FA');
            }
          },
        },
      ]
    );
  };

  if (state.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        
        <TouchableOpacity
          style={styles.settingItem}
          onPress={state.is2FAEnabled ? handleDisable2FA : handleSetup2FA}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="shield-checkmark" size={24} color="#667eea" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
              <Text style={styles.settingSubtitle}>
                {state.is2FAEnabled ? 'Enabled' : 'Add extra security'}
              </Text>
            </View>
          </View>
          <Text style={[styles.badge, state.is2FAEnabled && styles.badgeActive]}>
            {state.is2FAEnabled ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  settingItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  badgeActive: {
    color: '#10B981',
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
});
