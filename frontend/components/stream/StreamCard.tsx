import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - theme.spacing.md * 3) / 2;

interface StreamCardProps {
  stream: {
    id: string;
    host_id: string;
    title: string;
    viewer_count: number;
    thumbnail_url?: string;
    host_username?: string;
    host_avatar_url?: string;
    is_live: boolean;
  };
}

export default function StreamCard({ stream }: StreamCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/(tabs)/live/viewer/${stream.id}`);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.9}>
      <View style={styles.thumbnailContainer}>
        {/* Placeholder thumbnail */}
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="videocam" size={40} color={theme.colors.textDisabled} />
        </View>

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />

        {/* Live badge */}
        {stream.is_live && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        {/* Viewer count */}
        <View style={styles.viewerCount}>
          <Ionicons name="eye" size={12} color="#fff" />
          <Text style={styles.viewerCountText}>
            {stream.viewer_count >= 1000
              ? `${(stream.viewer_count / 1000).toFixed(1)}k`
              : stream.viewer_count}
          </Text>
        </View>

        {/* Stream info */}
        <View style={styles.streamInfo}>
          <View style={styles.hostInfo}>
            <View style={styles.hostAvatar}>
              <Ionicons name="person" size={12} color="#fff" />
            </View>
            <Text style={styles.hostName} numberOfLines={1}>
              @{stream.host_username || 'user'}
            </Text>
          </View>
          <Text style={styles.streamTitle} numberOfLines={2}>
            {stream.title}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginBottom: theme.spacing.md,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 9 / 14,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceLight,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  liveBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.live,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  viewerCount: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  viewerCountText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 4,
  },
  streamInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.sm,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hostAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  hostName: {
    fontSize: 11,
    color: '#fff',
    fontWeight: theme.typography.weights.medium,
  },
  streamTitle: {
    fontSize: 12,
    color: '#fff',
    fontWeight: theme.typography.weights.semibold,
    lineHeight: 16,
  },
});
