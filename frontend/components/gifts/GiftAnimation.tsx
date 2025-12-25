import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface Gift {
  id: string;
  icon: string;
  name: string;
  senderName: string;
}

interface GiftAnimationProps {
  gift: Gift;
  onComplete: () => void;
}

export default function GiftAnimation({ gift, onComplete }: GiftAnimationProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    // Entrance animation
    scale.value = withSequence(
      withSpring(1.3, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withSpring(0, { damping: 15 });

    // Exit animation after delay
    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 500 });
      translateY.value = withTiming(-100, { duration: 500 }, () => {
        runOnJS(onComplete)();
      });
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.giftBox}>
        <Text style={styles.giftIcon}>{gift.icon}</Text>
        <View style={styles.giftInfo}>
          <Text style={styles.giftName}>{gift.name}</Text>
          <Text style={styles.senderName}>from @{gift.senderName}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    bottom: 200,
    zIndex: 100,
  },
  giftBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  giftIcon: {
    fontSize: 36,
    marginRight: 12,
  },
  giftInfo: {
    flex: 1,
  },
  giftName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
  },
  senderName: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
});
