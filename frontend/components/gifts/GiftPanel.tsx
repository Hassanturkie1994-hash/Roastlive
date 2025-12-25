import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withSequence,
  useSharedValue,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface Gift {
  id: string;
  name: string;
  icon: string;
  price: number;
  animation?: string;
}

interface GiftPanelProps {
  visible: boolean;
  onClose: () => void;
  onSendGift: (gift: Gift) => void;
  balance: number;
}

const GIFTS: Gift[] = [
  { id: '1', name: 'Fire', icon: '🔥', price: 1 },
  { id: '2', name: 'Heart', icon: '❤️', price: 5 },
  { id: '3', name: 'Star', icon: '⭐', price: 10 },
  { id: '4', name: 'Crown', icon: '👑', price: 50 },
  { id: '5', name: 'Diamond', icon: '💎', price: 100 },
  { id: '6', name: 'Rocket', icon: '🚀', price: 200 },
  { id: '7', name: 'Lion', icon: '🦁', price: 500 },
  { id: '8', name: 'Roast Trophy', icon: '🏆', price: 1000 },
];

export default function GiftPanel({ visible, onClose, onSendGift, balance }: GiftPanelProps) {
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const scale = useSharedValue(1);

  const handleSelectGift = (gift: Gift) => {
    setSelectedGift(gift);
    scale.value = withSequence(
      withSpring(1.2, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );
  };

  const handleSend = () => {
    if (selectedGift && balance >= selectedGift.price) {
      onSendGift(selectedGift);
      setSelectedGift(null);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Send a Gift</Text>
            <View style={styles.balanceContainer}>
              <Ionicons name="wallet" size={18} color={theme.colors.gold} />
              <Text style={styles.balanceText}>{balance.toLocaleString()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Gift Grid */}
          <ScrollView style={styles.giftGrid}>
            <View style={styles.gridContainer}>
              {GIFTS.map((gift) => (
                <TouchableOpacity
                  key={gift.id}
                  style={[
                    styles.giftItem,
                    selectedGift?.id === gift.id && styles.giftItemSelected,
                  ]}
                  onPress={() => handleSelectGift(gift)}
                >
                  <Text style={styles.giftIcon}>{gift.icon}</Text>
                  <Text style={styles.giftName}>{gift.name}</Text>
                  <View style={styles.priceTag}>
                    <Ionicons name="flash" size={12} color={theme.colors.gold} />
                    <Text style={styles.priceText}>{gift.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Send Button */}
          {selectedGift && (
            <Animated.View style={[styles.sendContainer, animatedStyle]}>
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedIcon}>{selectedGift.icon}</Text>
                <Text style={styles.selectedName}>{selectedGift.name}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  balance < selectedGift.price && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={balance < selectedGift.price}
              >
                <Text style={styles.sendButtonText}>
                  {balance >= selectedGift.price
                    ? `Send (${selectedGift.price} coins)`
                    : 'Insufficient coins'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    flex: 1,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.md,
  },
  balanceText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.gold,
    marginLeft: theme.spacing.xs,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  giftGrid: {
    padding: theme.spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  giftItem: {
    width: (width - theme.spacing.md * 4) / 4,
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.md,
  },
  giftItemSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  giftIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  giftName: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.gold,
    fontWeight: theme.typography.weights.semibold,
    marginLeft: 2,
  },
  sendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedIcon: {
    fontSize: 28,
    marginRight: theme.spacing.sm,
  },
  selectedName: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surfaceLight,
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
});
