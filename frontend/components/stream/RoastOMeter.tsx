import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface RoastOMeterProps {
  streamId: string;
  userId: string;
}

type ReactionType = 'applause' | 'boo' | 'fire' | 'laugh' | 'love' | 'shocked';

interface ReactionStats {
  roast_meter: number;
  total_reactions: number;
  trending_reaction: string;
  applause_count: number;
  boo_count: number;
  fire_count: number;
  laugh_count: number;
  love_count: number;
  shocked_count: number;
}

export default function RoastOMeter({ streamId, userId }: RoastOMeterProps) {
  const [stats, setStats] = useState<ReactionStats>({
    roast_meter: 0,
    total_reactions: 0,
    trending_reaction: 'none',
    applause_count: 0,
    boo_count: 0,
    fire_count: 0,
    laugh_count: 0,
    love_count: 0,
    shocked_count: 0,
  });
  const [meterAnimation] = useState(new Animated.Value(50)); // Start at center (50%)
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastReaction, setLastReaction] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [streamId]);

  // Animate meter when roast_meter changes
  useEffect(() => {
    const targetValue = ((stats.roast_meter + 100) / 200) * 100; // Convert -100:100 to 0:100
    Animated.spring(meterAnimation, {
      toValue: targetValue,
      useNativeDriver: false,
      friction: 8,
    }).start();

    // Trigger celebration at extremes
    if (Math.abs(stats.roast_meter) > 80) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
  }, [stats.roast_meter]);

  const loadStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/reactions/stream/${streamId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load reaction stats:', error);
    }
  };

  const sendReaction = async (reactionType: ReactionType) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/reactions/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          stream_id: streamId,
          user_id: userId,
          reaction_type: reactionType,
          intensity: 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastReaction(reactionType);
        
        // Show feedback
        setTimeout(() => setLastReaction(null), 1000);
        
        // Refresh stats immediately
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to send reaction:', error);
    }
  };

  const getMeterColor = () => {
    if (stats.roast_meter > 50) return '#10B981'; // Green (hot/good)
    if (stats.roast_meter < -50) return '#EF4444'; // Red (cold/bad)
    return '#F59E0B'; // Orange (neutral)
  };

  const getMeterEmoji = () => {
    if (stats.roast_meter > 70) return '🔥🔥🔥';
    if (stats.roast_meter > 40) return '🔥🔥';
    if (stats.roast_meter > 10) return '🔥';
    if (stats.roast_meter > -10) return '😐';
    if (stats.roast_meter > -40) return '😬';
    if (stats.roast_meter > -70) return '👎';
    return '💀';
  };

  const reactions: { type: ReactionType; icon: string; color: string; label: string }[] = [
    { type: 'applause', icon: '👏', color: '#10B981', label: 'Applause' },
    { type: 'fire', icon: '🔥', color: '#F59E0B', label: 'Fire' },
    { type: 'laugh', icon: '😂', color: '#FCD34D', label: 'Laugh' },
    { type: 'love', icon: '❤️', color: '#EF4444', label: 'Love' },
    { type: 'shocked', icon: '😱', color: '#8B5CF6', label: 'Shocked' },
    { type: 'boo', icon: '👎', color: '#6B7280', label: 'Boo' },
  ];

  return (
    <View style={styles.container}>
      {/* Roast-o-Meter Display */}
      <View style={styles.meterContainer}>
        <View style={styles.meterHeader}>
          <Text style={styles.meterTitle}>🌡️ Roast-o-Meter</Text>
          <Text style={styles.totalReactions}>{stats.total_reactions} reactions</Text>
        </View>

        {/* Thermometer */}
        <View style={styles.thermometer}>
          <View style={styles.thermometerTrack}>
            <Animated.View
              style={[
                styles.thermometerFill,
                {
                  width: meterAnimation.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: getMeterColor(),
                },
              ]}
            />
          </View>
          <Text style={styles.meterEmoji}>{getMeterEmoji()}</Text>
        </View>

        {/* Meter Labels */}
        <View style={styles.meterLabels}>
          <Text style={styles.labelCold}>💀 Cold</Text>
          <Text style={[styles.labelValue, { color: getMeterColor() }]}>
            {stats.roast_meter > 0 ? '+' : ''}
            {stats.roast_meter}
          </Text>
          <Text style={styles.labelHot}>🔥 Hot</Text>
        </View>

        {/* Celebration overlay */}
        {showCelebration && (
          <View style={styles.celebration}>
            <Text style={styles.celebrationText}>
              {stats.roast_meter > 80 ? '🔥 ON FIRE! 🔥' : '💀 ICE COLD! 💀'}
            </Text>
          </View>
        )}
      </View>

      {/* Reaction Buttons */}
      <View style={styles.reactionsGrid}>
        {reactions.map((reaction) => (
          <TouchableOpacity
            key={reaction.type}
            style={[
              styles.reactionButton,
              lastReaction === reaction.type && styles.reactionButtonActive,
            ]}
            onPress={() => sendReaction(reaction.type)}
          >
            <Text style={styles.reactionIcon}>{reaction.icon}</Text>
            <Text style={styles.reactionLabel}>{reaction.label}</Text>
            <Text style={styles.reactionCount}>
              {(stats as any)[`${reaction.type}_count`] || 0}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trending Reaction */}
      {stats.trending_reaction !== 'none' && (
        <View style={styles.trendingBadge}>
          <Ionicons name="trending-up" size={16} color="#667eea" />
          <Text style={styles.trendingText}>
            Trending: {stats.trending_reaction} 
            {reactions.find((r) => r.type === stats.trending_reaction)?.icon}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  meterContainer: {
    marginBottom: 16,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  meterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalReactions: {
    fontSize: 12,
    color: '#999',
  },
  thermometer: {
    marginBottom: 8,
  },
  thermometerTrack: {
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thermometerFill: {
    height: '100%',
    borderRadius: 12,
  },
  meterEmoji: {
    fontSize: 32,
    textAlign: 'center',
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelCold: {
    fontSize: 12,
    color: '#EF4444',
  },
  labelValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  labelHot: {
    fontSize: 12,
    color: '#10B981',
  },
  celebration: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  celebrationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FCD34D',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  reactionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reactionButton: {
    width: (width - 80) / 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reactionButtonActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderColor: '#667eea',
  },
  reactionIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  reactionLabel: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 2,
  },
  reactionCount: {
    fontSize: 10,
    color: '#999',
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 16,
    alignSelf: 'center',
  },
  trendingText: {
    fontSize: 12,
    color: '#667eea',
    marginLeft: 6,
    fontWeight: '600',
  },
});
