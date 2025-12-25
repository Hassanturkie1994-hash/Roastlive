import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface StreamHealthProps {
  viewerCount: number;
  peakViewers: number;
  streamDuration: number; // seconds
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  bitrate?: number; // kbps
  fps?: number;
  isLive: boolean;
}

export default function StreamHealthMonitor({
  viewerCount,
  peakViewers,
  streamDuration,
  connectionQuality,
  bitrate = 0,
  fps = 30,
  isLive,
}: StreamHealthProps) {
  const [expanded, setExpanded] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isLive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isLive]);

  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return theme.colors.success;
      case 'good': return '#7ED321';
      case 'fair': return theme.colors.warning;
      case 'poor': return theme.colors.error;
    }
  };

  const getQualityBars = () => {
    switch (connectionQuality) {
      case 'excellent': return 4;
      case 'good': return 3;
      case 'fair': return 2;
      case 'poor': return 1;
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBitrate = (kbps: number) => {
    if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
    return `${kbps} Kbps`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
    >
      {/* Collapsed View */}
      <View style={styles.collapsedView}>
        {/* Live Indicator */}
        {isLive && (
          <View style={styles.liveIndicator}>
            <Animated.View
              style={[
                styles.liveDot,
                { transform: [{ scale: pulseAnim }] }
              ]}
            />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        {/* Viewer Count */}
        <View style={styles.viewerCount}>
          <Ionicons name="eye" size={14} color="#fff" />
          <Text style={styles.viewerText}>{viewerCount.toLocaleString()}</Text>
        </View>

        {/* Duration */}
        <View style={styles.duration}>
          <Ionicons name="time" size={14} color="#fff" />
          <Text style={styles.durationText}>{formatDuration(streamDuration)}</Text>
        </View>

        {/* Connection Quality */}
        <View style={styles.qualityIndicator}>
          {[1, 2, 3, 4].map((bar) => (
            <View
              key={bar}
              style={[
                styles.qualityBar,
                { height: 4 + bar * 3 },
                bar <= getQualityBars() && { backgroundColor: getQualityColor() },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Expanded View */}
      {expanded && (
        <View style={styles.expandedView}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Peak Viewers</Text>
            <Text style={styles.statValue}>{peakViewers.toLocaleString()}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Connection</Text>
            <Text style={[styles.statValue, { color: getQualityColor() }]}>
              {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
            </Text>
          </View>
          {bitrate > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Bitrate</Text>
              <Text style={styles.statValue}>{formatBitrate(bitrate)}</Text>
            </View>
          )}
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>FPS</Text>
            <Text style={styles.statValue}>{fps}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  collapsedView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  viewerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: theme.typography.weights.semibold,
    marginLeft: 4,
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  durationText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: theme.typography.weights.semibold,
    marginLeft: 4,
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 16,
  },
  qualityBar: {
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginLeft: 2,
  },
  expandedView: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: theme.typography.weights.semibold,
  },
});
