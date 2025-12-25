import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { Gift } from '../../services/giftService';
import { Audio } from 'expo-av';
import { Video, ResizeMode } from 'expo-av';
// Temporarily disabled Lottie to fix preview
// import LottieView from 'lottie-react-native';

interface GiftDetailModalProps {
  visible: boolean;
  onClose: () => void;
  gift: Gift | null;
}

const TIER_COLORS = {
  LOW: '#4CAF50',
  MID: '#2196F3',
  HIGH: '#9C27B0',
  ULTRA: '#FF5722',
  NUCLEAR: '#F44336',
};

const GIFT_DESCRIPTIONS: Record<string, string> = {
  // LOW TIER
  boo: 'A simple boo to startle your target. Perfect for friendly teasing!',
  flying_tomato: 'Throw a virtual tomato with a satisfying splat sound.',
  laugh_track: 'Add a laugh track overlay to emphasize the comedy.',
  facepalm: 'Express your disbelief with a quick facepalm animation.',
  crickets: 'Nothing says awkward silence like cricket sounds.',
  yawn: 'Show how boring their roast was with a big yawn.',
  clown: 'Call them out with a wiggling clown emoji.',
  trash: 'Drop them straight into the trash can.',
  skull: 'Dead on arrival! Fade in a skull to show they got destroyed.',
  poop: 'The ultimate insult - bouncing poop emoji.',
  eye_roll: 'Eye roll animation for when they miss the mark.',
  snore: 'Zzz... their roast put everyone to sleep.',
  
  // MID TIER
  mic_drop: 'Drop the mic with screen shake effect!',
  airhorn: 'Blast an airhorn with flash and loud sound.',
  laugh_explosion: 'Explosive laughter that scales and bursts.',
  roast_bell: 'Ring the roast bell to signal a good burn.',
  fire: 'They\'re on fire! Looping flame animation.',
  explosion: 'Explosive impact without the MP4 lag.',
  shocked: 'Show shock with a pop animation.',
  savage: 'Acknowledge their savage comeback with a pulse.',
  salt_shaker: 'Shake some salt on that wound.',
  tea_spill: 'Spill the tea with a pour animation.',
  cringe: 'Cringe-worthy moment deserves this shake + sound.',
  
  // HIGH TIER
  flame_thrower: 'Unleash the flames with a continuous fire loop.',
  diss_stamp: 'Stamp your diss with authority - slam sound included.',
  judge_gavel: 'Bring down the gavel - judgment delivered!',
  roast_crown: 'Crown the winner of the roast battle.',
  knockout_punch: 'Land a knockout punch with impact animation.',
  bomb: 'Drop a bomb on their weak roast.',
  lightning_strike: 'Strike them down with lightning!',
  roast_trophy: 'Award the roast trophy with shine effect.',
  roast_hammer: 'Hammer down with a powerful slam.',
  roast_sword: 'Slash through their defense with a sword.',
  roast_shield: 'Block their attack with a defensive shield.',
  
  // ULTRA TIER
  screen_shake: 'Shake the entire screen - fullscreen takeover!',
  slow_motion_roast: 'Cinematic slow-motion effect for epic moments.',
  spotlight_shame: 'Put them in the spotlight of shame.',
  silence_button: 'Lock their UI - they can\'t respond!',
  time_freeze: 'Freeze time with a dramatic filter effect.',
  roast_nuke: 'Nuclear explosion - the biggest boom!',
  shame_bell: 'Ring the bell of shame for all to hear.',
  roast_meteor: 'Meteor impact - devastating blow!',
  
  // NUCLEAR TIER
  funeral_music: 'Play funeral music - they\'re done for!',
  crowd_riot: 'Trigger a crowd riot with sirens and chaos.',
  roast_execution: 'Execute them from the roast battle.',
  you_are_done: 'Wave goodbye - you\'re done here!',
  roast_apocalypse: 'Apocalyptic destruction - volcanic eruption!',
  roast_dragon: 'Summon a dragon - the ultimate power move!',
};

export default function GiftDetailModal({
  visible,
  onClose,
  gift,
}: GiftDetailModalProps) {
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const lottieRef = useRef<LottieView>(null);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    // Auto-play animation when modal opens (disabled for now)
    if (visible && gift) {
      // Lottie temporarily disabled
      /*
      if (gift.format === 'lottie') {
        lottieRef.current?.play();
      } else if (gift.format === 'mp4') {
        videoRef.current?.playAsync();
      }
      */
    }
  }, [visible, gift]);

  if (!gift) return null;

  const playPreview = async () => {
    setIsPlayingAnimation(true);
    
    // Lottie temporarily disabled - using placeholder animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start(() => setIsPlayingAnimation(false));

    // Play sound effect
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: `https://example.com/sounds/${gift.id}.mp3` },
        { shouldPlay: true, volume: 0.5 }
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Sound not available for this gift:', error);
    }
  };

  const tierColor = TIER_COLORS[gift.tier];
  const isLottie = gift.tier === 'LOW' || gift.tier === 'MID' || gift.tier === 'HIGH';
  const isVideo = gift.tier === 'ULTRA' || gift.tier === 'NUCLEAR';
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
              <Text style={styles.tierBadgeText}>{gift.tier}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={32} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Gift Animation Preview */}
          <View style={styles.animationContainer}>
            {isLottie ? (
              <LottieView
                ref={lottieRef}
                source={{ uri: `https://assets.example.com/lottie/${gift.id}.json` }}
                autoPlay
                loop
                style={styles.lottieAnimation}
              />
            ) : isVideo ? (
              <Video
                ref={videoRef}
                source={{ uri: `https://assets.example.com/videos/${gift.id}.mp4` }}
                style={styles.videoAnimation}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isLooping
                volume={0.5}
              />
            ) : (
              <Animated.View
                style={[
                  styles.iconContainer,
                  { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <Text style={styles.giftIcon}>{gift.icon}</Text>
              </Animated.View>
            )}
          </View>

          {/* Gift Info */}
          <Text style={styles.giftName}>{gift.name}</Text>
          <Text style={[styles.giftPrice, { color: tierColor }]}>
            {gift.price} SEK
          </Text>

          {/* Format Badge */}
          <View style={styles.formatContainer}>
            <View style={[
              styles.formatBadge,
              gift.format === 'mp4' ? styles.mp4Badge : styles.lottieBadge
            ]}>
              <Text style={styles.formatText}>
                {gift.format.toUpperCase()}
              </Text>
            </View>
            {gift.blocks_others && (
              <View style={[styles.formatBadge, styles.blocksBadge]}>
                <Text style={styles.formatText}>BLOCKS OTHERS</Text>
              </View>
            )}
            {gift.is_cinematic && (
              <View style={[styles.formatBadge, styles.cinematicBadge]}>
                <Text style={styles.formatText}>CINEMATIC</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text style={styles.description}>
            {GIFT_DESCRIPTIONS[gift.id] || 'A special gift for your favorite streamer!'}
          </Text>

          {/* Animation Info */}
          <View style={styles.infoCard}>
            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Duration: {(gift.duration_ms / 1000).toFixed(1)}s
            </Text>
          </View>

          {/* Preview Button */}
          <TouchableOpacity
            style={[styles.previewButton, { backgroundColor: tierColor }]}
            onPress={playPreview}
            disabled={isPlayingAnimation}
          >
            <Ionicons name="play-circle" size={24} color="#fff" />
            <Text style={styles.previewButtonText}>
              {isPlayingAnimation ? 'Playing...' : 'Preview Animation & Sound'}
            </Text>
          </TouchableOpacity>

          {/* Send Button */}
          <TouchableOpacity style={styles.sendButton}>
            <Ionicons name="gift" size={20} color="#fff" />
            <Text style={styles.sendButtonText}>Send This Gift</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  tierBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  tierBadgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  iconContainer: {
    marginVertical: theme.spacing.lg,
  },
  animationContainer: {
    width: 250,
    height: 250,
    marginVertical: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  videoAnimation: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
  },
  giftIcon: {
    fontSize: 100,
  },
  giftName: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  giftPrice: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.lg,
  },
  formatContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  formatBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  lottieBadge: {
    backgroundColor: theme.colors.success,
  },
  mp4Badge: {
    backgroundColor: theme.colors.warning,
  },
  blocksBadge: {
    backgroundColor: theme.colors.error,
  },
  cinematicBadge: {
    backgroundColor: theme.colors.gold,
  },
  formatText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  description: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  infoText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  previewButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
  },
  sendButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
});
