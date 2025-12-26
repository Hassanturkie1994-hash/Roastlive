import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { Gift, GIFT_CATALOG } from './GiftPicker';

const { width, height } = Dimensions.get('window');

interface GiftAnimation {
  id: string;
  gift: Gift;
  senderName: string;
  position: { x: number; y: number };
  opacity: Animated.Value;
  scale: Animated.Value;
  translateY: Animated.Value;
}

interface GiftOverlayProps {
  streamId: string;
}

export default function GiftOverlay({ streamId }: GiftOverlayProps) {
  const [animations, setAnimations] = useState<GiftAnimation[]>([]);
  const [takeoverGift, setTakeoverGift] = useState<{ gift: Gift; senderName: string } | null>(null);
  const takeoverOpacity = useRef(new Animated.Value(0)).current;
  const takeoverScale = useRef(new Animated.Value(0)).current;

  // Subscribe to gift transactions
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`gifts:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gift_transactions',
          filter: `stream_id=eq.${streamId}`,
        },
        async (payload) => {
          const transaction = payload.new as any;
          
          // Get sender name
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', transaction.sender_id)
            .maybeSingle();

          const gift = GIFT_CATALOG.find((g) => g.id === transaction.gift_id);
          if (!gift) return;

          const senderName = profile?.username || 'Someone';

          if (gift.animation_type === 'takeover') {
            // Full screen takeover animation
            showTakeoverAnimation(gift, senderName);
          } else {
            // Regular animation
            addGiftAnimation(gift, senderName);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  const addGiftAnimation = useCallback((gift: Gift, senderName: string) => {
    const animationId = `${Date.now()}-${Math.random()}`;
    
    // Create animated values
    const opacity = new Animated.Value(0);
    const scale = new Animated.Value(0);
    const translateY = new Animated.Value(50);

    // Random position based on animation type
    let position = { x: 0, y: 0 };
    
    if (gift.animation_type === 'simple') {
      // Appear from bottom center
      position = { x: width / 2 - 40, y: height - 200 };
    } else if (gift.animation_type === 'burst') {
      // Random position in center area
      position = {
        x: width * 0.2 + Math.random() * (width * 0.6),
        y: height * 0.3 + Math.random() * (height * 0.3),
      };
    } else if (gift.animation_type === 'shower') {
      // Multiple from top
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const showerAnim: GiftAnimation = {
            id: `${animationId}-${i}`,
            gift,
            senderName,
            position: {
              x: Math.random() * (width - 80),
              y: -80,
            },
            opacity: new Animated.Value(1),
            scale: new Animated.Value(1),
            translateY: new Animated.Value(0),
          };
          
          setAnimations((prev) => [...prev, showerAnim]);
          
          // Animate falling
          Animated.parallel([
            Animated.timing(showerAnim.translateY, {
              toValue: height + 100,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(showerAnim.opacity, {
              toValue: 0,
              duration: 2500,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setAnimations((prev) => prev.filter((a) => a.id !== showerAnim.id));
          });
        }, i * 200);
      }
      return;
    }

    const animation: GiftAnimation = {
      id: animationId,
      gift,
      senderName,
      position,
      opacity,
      scale,
      translateY,
    };

    setAnimations((prev) => [...prev, animation]);

    // Run animation
    Animated.sequence([
      // Appear
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 5,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -30,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Hold
      Animated.delay(1500),
      // Fade out
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setAnimations((prev) => prev.filter((a) => a.id !== animationId));
    });
  }, []);

  const showTakeoverAnimation = useCallback((gift: Gift, senderName: string) => {
    setTakeoverGift({ gift, senderName });
    takeoverOpacity.setValue(0);
    takeoverScale.setValue(0);

    Animated.sequence([
      // Appear
      Animated.parallel([
        Animated.spring(takeoverScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(takeoverOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Hold
      Animated.delay(3000),
      // Fade out
      Animated.timing(takeoverOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTakeoverGift(null);
    });
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Regular Animations */}
      {animations.map((anim) => (
        <Animated.View
          key={anim.id}
          style={[
            styles.giftBubble,
            {
              left: anim.position.x,
              top: anim.position.y,
              opacity: anim.opacity,
              transform: [
                { scale: anim.scale },
                { translateY: anim.translateY },
              ],
            },
          ]}
        >
          <Text style={styles.giftEmoji}>{anim.gift.emoji}</Text>
          <Text style={styles.giftName}>{anim.gift.name}</Text>
          <Text style={styles.senderName}>from {anim.senderName}</Text>
        </Animated.View>
      ))}

      {/* Takeover Animation */}
      {takeoverGift && (
        <Animated.View
          style={[
            styles.takeoverContainer,
            {
              opacity: takeoverOpacity,
              transform: [{ scale: takeoverScale }],
            },
          ]}
        >
          <View style={styles.takeoverContent}>
            <Text style={styles.takeoverEmoji}>{takeoverGift.gift.emoji}</Text>
            <Text style={styles.takeoverTitle}>{takeoverGift.gift.name}!</Text>
            <Text style={styles.takeoverSender}>
              sent by {takeoverGift.senderName}
            </Text>
            {takeoverGift.gift.battle_points && (
              <View style={styles.takeoverPoints}>
                <Text style={styles.takeoverPointsText}>
                  +{takeoverGift.gift.battle_points.toLocaleString()} battle points!
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  giftBubble: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    minWidth: 80,
  },
  giftEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  giftName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  senderName: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  // Takeover
  takeoverContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  takeoverContent: {
    alignItems: 'center',
  },
  takeoverEmoji: {
    fontSize: 120,
    marginBottom: theme.spacing.lg,
  },
  takeoverTitle: {
    fontSize: 48,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.gold,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  takeoverSender: {
    fontSize: theme.typography.sizes.xl,
    color: '#fff',
    marginTop: theme.spacing.md,
  },
  takeoverPoints: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.lg,
  },
  takeoverPointsText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
});
