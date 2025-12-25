import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

const giftInfo = [
  {
    id: '1',
    title: 'What are Virtual Gifts?',
    content: 'Virtual gifts are digital items you can send to streamers during live broadcasts to show your support and appreciation.',
  },
  {
    id: '2',
    title: 'How to Send Gifts',
    content: 'Tap the gift icon during a live stream, select a gift from the menu, and confirm to send it to the streamer.',
  },
  {
    id: '3',
    title: 'Gift Tiers',
    content: 'Gifts range from Low Tier (1-10 SEK) to Ultra Nuclear (2000-4500 SEK). Higher tier gifts have more spectacular animations!',
  },
  {
    id: '4',
    title: 'For Streamers',
    content: 'As a streamer, you earn a percentage of all gifts received. Check your wallet to see your earnings and request payouts.',
  },
];

export default function GiftInfoScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gift Information</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.heroCard}>
          <Ionicons name="gift" size={48} color={theme.colors.gold} />
          <Text style={styles.heroTitle}>Virtual Gifts</Text>
          <Text style={styles.heroDescription}>
            Support your favorite streamers with virtual gifts and enjoy exclusive animations!
          </Text>
        </View>

        {giftInfo.map(info => (
          <View key={info.id} style={styles.infoCard}>
            <Text style={styles.infoTitle}>{info.title}</Text>
            <Text style={styles.infoContent}>{info.content}</Text>
          </View>
        ))}

        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => router.push('/(tabs)/profile/gift-store' as any)}
        >
          <Ionicons name="storefront" size={20} color="#fff" />
          <Text style={styles.browseButtonText}>Browse Gift Store</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xxl + 10,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  heroCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  heroTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  heroDescription: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  infoCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  infoTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoContent: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.lg,
  },
  browseButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
});