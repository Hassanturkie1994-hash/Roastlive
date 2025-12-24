import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';
import { useStore } from '../store/useStore';

export default function Onboarding() {
  const router = useRouter();
  const { setHasCompletedOnboarding, setHasAcceptedTerms } = useStore();
  const [isOver18, setIsOver18] = useState(false);
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);

  const handleContinue = () => {
    if (!isOver18) {
      Alert.alert('Age Requirement', 'You must be 18 or older to use Roast Live.');
      return;
    }
    if (!acceptedGuidelines) {
      Alert.alert('Community Guidelines', 'Please accept the community guidelines to continue.');
      return;
    }

    setHasAcceptedTerms(true);
    setHasCompletedOnboarding(true);
    router.replace('/auth/welcome');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome to</Text>
      <Text style={styles.brandTitle}>ROAST LIVE</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎭 What is Roast Live?</Text>
        <Text style={styles.text}>
          A live streaming platform for hilarious roast battles! Watch comedians, creators, and everyday people engage in friendly banter and witty comebacks.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Age Requirement</Text>
        <Text style={styles.text}>
          You must be 18 years or older to use this app. Roast Live contains adult humor and mature content.
        </Text>
        
        <TouchableOpacity
          style={[styles.checkbox, isOver18 && styles.checkboxActive]}
          onPress={() => setIsOver18(!isOver18)}
        >
          <View style={[styles.checkboxInner, isOver18 && styles.checkboxInnerActive]} />
          <Text style={styles.checkboxText}>I confirm that I am 18 years or older</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📜 Community Guidelines</Text>
        <Text style={styles.text}>We encourage friendly roasting, but we have zero tolerance for:</Text>
        <Text style={styles.bulletText}>• Hate speech or discrimination</Text>
        <Text style={styles.bulletText}>• Harassment or bullying</Text>
        <Text style={styles.bulletText}>• Threats or violence</Text>
        <Text style={styles.bulletText}>• Sexual misconduct</Text>
        <Text style={styles.bulletText}>• Illegal activities</Text>
        
        <TouchableOpacity
          style={[styles.checkbox, acceptedGuidelines && styles.checkboxActive]}
          onPress={() => setAcceptedGuidelines(!acceptedGuidelines)}
        >
          <View style={[styles.checkboxInner, acceptedGuidelines && styles.checkboxInnerActive]} />
          <Text style={styles.checkboxText}>I accept the community guidelines</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, (!isOver18 || !acceptedGuidelines) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!isOver18 || !acceptedGuidelines}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>By continuing, you agree to our Terms of Service and Privacy Policy</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl + theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  brandTitle: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  text: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  bulletText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    marginLeft: theme.spacing.md,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  checkboxActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.md,
  },
  checkboxInnerActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.surfaceLight,
  },
  buttonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  footer: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textDisabled,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
});
