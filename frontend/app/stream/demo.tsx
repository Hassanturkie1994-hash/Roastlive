import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { streamingConfig } from '../../config/streamingConfig';
import MultiGuestLayout from '../../components/stream/MultiGuestLayout';
import LiveChat from '../../components/chat/LiveChat';

const { width, height } = Dimensions.get('window');

export default function DemoStreamScreen() {
  const router = useRouter();
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [duration, setDuration] = useState(0);

  // Demo participants (fake data)
  const [participants] = useState([
    {
      id: '1',
      user_id: 'demo-1',
      username: 'You',
      seat_number: 0,
      is_mic_on: true,
      is_camera_on: true,
      is_host: true,
    },
  ]);

  useEffect(() => {
    if (isStreaming) {
      // Simulate viewer count changes
      const viewerInterval = setInterval(() => {
        setViewerCount(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
      }, 3000);

      // Track duration
      const durationInterval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      return () => {
        clearInterval(viewerInterval);
        clearInterval(durationInterval);
      };
    }
  }, [isStreaming]);

  const handleStartStream = () => {
    setIsStreaming(true);
    setViewerCount(Math.floor(Math.random() * 10) + 1);
  };

  const handleEndStream = () => {
    Alert.alert(
      'End Stream',
      `Duration: ${Math.floor(duration / 60)} minutes. End stream?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: () => {
            setIsStreaming(false);
            setDuration(0);
            router.back();
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Demo Mode Watermark */}
      {streamingConfig.demo.showWatermark && (
        <View style={styles.watermark}>
          <Ionicons name="warning" size={16} color={theme.colors.warning} />
          <Text style={styles.watermarkText}>{streamingConfig.demo.watermarkText}</Text>
        </View>
      )}

      {/* Stream Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isStreaming && (
            <View style={styles.liveBadge}>
              <View style={styles.liveIndicator} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          {isStreaming && (
            <View style={styles.viewerCount}>
              <Ionicons name="eye" size={16} color="#fff" />
              <Text style={styles.viewerText}>{viewerCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={isStreaming ? handleEndStream : () => router.back()}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Video Area (Demo) */}
      <View style={styles.videoArea}>
        <MultiGuestLayout participants={participants} maxSeats={10} />
        
        {/* Demo overlay */}
        {!isStreaming && (
          <View style={styles.demoOverlay}>
            <Ionicons name="videocam-outline" size={80} color={theme.colors.textSecondary} />
            <Text style={styles.demoTitle}>Demo Streaming Mode</Text>
            <Text style={styles.demoSubtitle}>
              This is a preview mode for Expo Go.{'\n'}
              Build the app for real Agora streaming.
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={handleStartStream}>
              <Ionicons name="play-circle" size={24} color="#fff" />
              <Text style={styles.startButtonText}>Start Demo Stream</Text>
            </TouchableOpacity>
          </View>
        )}

        {isStreaming && (
          <View style={styles.streamInfo}>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </View>
        )}
      </View>

      {/* Chat (Bottom Half) */}
      {isStreaming && (
        <View style={styles.chatContainer}>
          <LiveChat streamId="demo-stream" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  watermark: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.warning}20`,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    zIndex: 1000,
  },
  watermarkText: {
    fontSize: 10,
    color: theme.colors.warning,
    marginLeft: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    paddingTop: theme.spacing.xxl + 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.live,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  viewerText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    fontWeight: theme.typography.weights.bold,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoArea: {
    height: height * 0.5,
    backgroundColor: '#000',
  },
  demoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
  },
  demoTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  demoSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
  },
  startButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
  streamInfo: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  durationText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  chatContainer: {
    flex: 1,
  },
});
