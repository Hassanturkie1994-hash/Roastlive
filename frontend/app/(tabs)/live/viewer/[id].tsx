import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import LiveChat from '../../../../components/live/LiveChat';

const { width, height } = Dimensions.get('window');

interface Stream {
  id: string;
  host_id: string;
  title: string;
  channel_name: string;
  is_live: boolean;
  viewer_count: number;
  started_at: string;
}

export default function ViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    loadStream();
    subscribeToUpdates();
  }, [id]);

  const loadStream = async () => {
    try {
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setStream(data);
      setViewerCount(data.viewer_count || 0);
    } catch (error) {
      console.error('Load stream error:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`stream:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streams',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setStream(payload.new as Stream);
          setViewerCount(payload.new.viewer_count || 0);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleFollow = async () => {
    if (!stream) return;
    
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user?.id)
          .eq('following_id', stream.host_id);
        setIsFollowing(false);
      } else {
        await supabase.from('follows').insert({
          follower_id: user?.id,
          following_id: stream.host_id,
        });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!stream) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Stream not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Video Player (Demo Mode) */}
      <View style={styles.videoContainer}>
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam" size={64} color={theme.colors.textDisabled} />
          <Text style={styles.placeholderText}>Video Stream (Demo Mode)</Text>
          <Text style={styles.placeholderSubtext}>Agora RTC will work in development build</Text>
        </View>

        {/* Overlay UI */}
        <View style={styles.videoOverlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>

            <View style={styles.viewerCount}>
              <Ionicons name="eye" size={16} color="#fff" />
              <Text style={styles.viewerCountText}>{viewerCount}</Text>
            </View>
          </View>

          {/* Host Info */}
          <View style={styles.hostInfo}>
            <View style={styles.hostAvatar}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
            <View style={styles.hostDetails}>
              <Text style={styles.hostName}>Host User</Text>
              <Text style={styles.streamTitle}>{stream.title}</Text>
            </View>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollow}
            >
              <Text style={styles.followButtonText}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Side Actions */}
          <View style={styles.sideActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="heart" size={32} color="#fff" />
              <Text style={styles.actionText}>Like</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="gift" size={32} color="#fff" />
              <Text style={styles.actionText}>Gift</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-social" size={32} color="#fff" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowChat(!showChat)}
            >
              <Ionicons name={showChat ? 'chatbubbles' : 'chatbubbles-outline'} size={32} color="#fff" />
              <Text style={styles.actionText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Live Chat */}
      {showChat && stream && <LiveChat streamId={stream.id} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: width,
    height: height * 0.6,
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  placeholderText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  placeholderSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textDisabled,
    marginTop: theme.spacing.xs,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.live,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginLeft: theme.spacing.md,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: theme.spacing.xs,
  },
  liveText: {
    color: '#fff',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginLeft: theme.spacing.sm,
  },
  viewerCountText: {
    color: '#fff',
    fontSize: theme.typography.sizes.xs,
    marginLeft: theme.spacing.xs,
  },
  hostInfo: {
    position: 'absolute',
    top: 100,
    left: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  hostDetails: {
    marginLeft: theme.spacing.sm,
    maxWidth: 200,
  },
  hostName: {
    color: '#fff',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  streamTitle: {
    color: '#fff',
    fontSize: theme.typography.sizes.xs,
    opacity: 0.9,
  },
  followButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginLeft: theme.spacing.sm,
  },
  followingButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  followButtonText: {
    color: '#fff',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  sideActions: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  actionText: {
    color: '#fff',
    fontSize: theme.typography.sizes.xs,
    marginTop: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  linkText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.primary,
    marginTop: theme.spacing.md,
  },
});
