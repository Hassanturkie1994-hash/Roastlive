import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { theme } from '../../constants/theme';
import { Gift } from '../../services/giftService';

const { width, height } = Dimensions.get('window');

interface GiftAnimationProps {
  gift: Gift;
  senderName: string;
  onComplete?: () => void;
}

export default function GiftAnimation({
  gift,
  senderName,
  onComplete,
}: GiftAnimationProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Hold animation for display duration
    const holdTimeout = setTimeout(() => {
      // Exit animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete?.();
      });
    }, gift.duration_ms || 3000);

    return () => clearTimeout(holdTimeout);
  }, [gift]);

  // Different animation styles based on tier
  const getTierStyle = () => {
    switch (gift.tier) {
      case 'LOW':
        return styles.lowTier;
      case 'MID':
        return styles.midTier;
      case 'HIGH':
        return styles.highTier;
      case 'ULTRA':
        return styles.ultraTier;
      case 'NUCLEAR':
        return styles.nuclearTier;
      default:
        return {};
    }
  };

  const getTierColor = () => {
    switch (gift.tier) {
      case 'LOW':
        return '#4CAF50';
      case 'MID':
        return '#2196F3';
      case 'HIGH':
        return '#9C27B0';
      case 'ULTRA':
        return '#FF5722';
      case 'NUCLEAR':
        return '#F44336';
      default:
        return theme.colors.primary;
    }
  };

  // Fullscreen animation for ULTRA and NUCLEAR tiers
  if (gift.tier === 'ULTRA' || gift.tier === 'NUCLEAR') {
    return (
      <Animated.View
        style={[
          styles.fullscreenContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fullscreenContent,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.fullscreenIcon}>{gift.icon}</Text>
          <Text style={styles.fullscreenName}>{gift.name}</Text>
          <Text style={styles.fullscreenSender}>from {senderName}</Text>
          <Text style={[styles.fullscreenPrice, { color: getTierColor() }]}>
            {gift.price} SEK
          </Text>
        </Animated.View>
      </Animated.View>
    );
  }

  // Standard overlay animation for LOW, MID, HIGH tiers
  return (
    <Animated.View
      style={[
        styles.container,
        getTierStyle(),
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim },
          ],
        },
      ]}
    >
      <Text style={styles.icon}>{gift.icon}</Text>
      <View style={styles.textContainer}>
        <Text style={styles.giftName}>{gift.name}</Text>
        <Text style={styles.senderName}>{senderName}</Text>
        <Text style={[styles.price, { color: getTierColor() }]}>
          {gift.price} SEK
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 1000,
  },
  icon: {
    fontSize: 40,
    marginRight: theme.spacing.md,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  giftName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  senderName: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  price: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    marginTop: 4,
  },
  lowTier: {
    borderColor: '#4CAF50',
  },
  midTier: {
    borderColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  highTier: {
    borderColor: '#9C27B0',
    borderWidth: 3,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 15,
  },
  ultraTier: {},
  nuclearTier: {},
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  fullscreenContent: {
    alignItems: 'center',
  },
  fullscreenIcon: {
    fontSize: 120,
    marginBottom: theme.spacing.xl,
  },
  fullscreenName: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  fullscreenSender: {
    fontSize: theme.typography.sizes.lg,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing.lg,
  },
  fullscreenPrice: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
  },
});