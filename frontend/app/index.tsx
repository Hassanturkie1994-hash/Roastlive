import React, { useEffect } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { theme } from '../constants/theme';

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { hasCompletedOnboarding } = useStore();

  useEffect(() => {
    if (!isLoading) {
      if (!hasCompletedOnboarding) {
        router.replace('/onboarding');
      } else if (!user) {
        router.replace('/auth/welcome');
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }, [isLoading, user, hasCompletedOnboarding]);

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://customer-assets.emergentagent.com/job_5bda075e-c2b2-4d69-91c6-c2c57416d17e/artifacts/a67mlw50_LOGO%20DARK%20THEME.png' }}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 250,
    height: 150,
  },
  loader: {
    marginTop: theme.spacing.xl,
  },
});
