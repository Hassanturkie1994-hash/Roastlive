import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function BroadcastScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [isLive, setIsLive] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [guestSeatsLocked, setGuestSeatsLocked] = useState(false);
  const [guests, setGuests] = useState<any[]>([]);
  const cameraRef = useRef<any>(null);

  // Request camera permission
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="videocam-off" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          To go live, we need access to your camera and microphone.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCamera = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const startStream = async () => {
    if (!streamTitle.trim()) {
      Alert.alert('Error', 'Please enter a stream title');
      return;
    }

    setLoading(true);
    try {
      const channelName = `stream_${user?.id}_${Date.now()}`;
      
      // Get Agora token
      const tokenRes = await axios.post(`${API_URL}/api/generate-token`, {
        channelName,
        uid: 0,
        role: 1,
      });

      // Create stream in database
      const { data: stream, error } = await supabase
        .from('streams')
        .insert({
          host_id: user?.id,
          title: streamTitle,
          channel_name: channelName,
          is_live: true,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setStreamId(stream.id);
      setIsLive(true);

      // Subscribe to viewer count updates
      const channel = supabase
        .channel(`stream:${stream.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'streams',
          filter: `id=eq.${stream.id}`,
        }, (payload) => {
          setViewerCount(payload.new.viewer_count || 0);
        })
        .subscribe();

    } catch (error) {
      console.error('Start stream error:', error);
      Alert.alert('Error', 'Failed to start stream');
    } finally {
      setLoading(false);
    }
  };

  const endStream = async () => {
    Alert.alert(
      'End Stream',
      'Are you sure you want to end your livestream?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Stream',
          style: 'destructive',
          onPress: async () => {
            try {
              if (streamId) {
                await supabase
                  .from('streams')
                  .update({
                    is_live: false,
                    ended_at: new Date().toISOString(),
                  })
                  .eq('id', streamId);
              }
              setIsLive(false);
              setStreamId(null);
              router.back();
            } catch (error) {
              console.error('End stream error:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mirror={facing === 'front'}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={isLive ? endStream : () => router.back()}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {isLive && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
              <View style={styles.viewerBadge}>
                <Ionicons name="eye" size={14} color="#fff" />
                <Text style={styles.viewerCount}>{viewerCount}</Text>
              </View>
            </View>
          )}

          <View style={styles.topRightButtons}>
            <TouchableOpacity style={styles.iconButton} onPress={toggleCamera}>
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pre-Live Setup */}
        {!isLive && (
          <View style={styles.setupOverlay}>
            <Text style={styles.setupTitle}>Go Live</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Enter stream title..."
              placeholderTextColor={theme.colors.textSecondary}
              value={streamTitle}
              onChangeText={setStreamTitle}
              maxLength={100}
            />
            <TouchableOpacity
              style={[styles.goLiveButton, loading && styles.goLiveButtonDisabled]}
              onPress={startStream}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="radio" size={24} color="#fff" />
                  <Text style={styles.goLiveText}>Start Streaming</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Live Controls */}
        {isLive && (
          <View style={styles.liveControls}>
            {/* Side Controls */}
            <View style={styles.sideControls}>
              <TouchableOpacity
                style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                onPress={() => setIsMuted(!isMuted)}
              >
                <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, !showChat && styles.controlButtonActive]}
                onPress={() => setShowChat(!showChat)}
              >
                <Ionicons name={showChat ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, guestSeatsLocked && styles.controlButtonActive]}
                onPress={() => setGuestSeatsLocked(!guestSeatsLocked)}
              >
                <Ionicons name={guestSeatsLocked ? 'lock-closed' : 'lock-open'} size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton}>
                <Ionicons name="people" size={24} color="#fff" />
                <View style={styles.guestBadge}>
                  <Text style={styles.guestBadgeText}>{guests.length}/9</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              <TouchableOpacity style={styles.endButton} onPress={endStream}>
                <Ionicons name="stop-circle" size={20} color="#fff" />
                <Text style={styles.endButtonText}>End Stream</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  permissionTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  permissionText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.md,
  },
  permissionButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  backButton: {
    padding: theme.spacing.md,
  },
  backButtonText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: theme.spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.live,
    marginRight: theme.spacing.xs,
  },
  liveText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.live,
    marginRight: theme.spacing.md,
  },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerCount: {
    fontSize: theme.typography.sizes.sm,
    color: '#fff',
    marginLeft: 4,
  },
  topRightButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
  setupOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  setupTitle: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginBottom: theme.spacing.xl,
  },
  titleInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    fontSize: theme.typography.sizes.lg,
    color: '#fff',
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  goLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.live,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
  },
  goLiveButtonDisabled: {
    opacity: 0.7,
  },
  goLiveText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.md,
  },
  liveControls: {
    flex: 1,
    justifyContent: 'space-between',
  },
  sideControls: {
    position: 'absolute',
    right: theme.spacing.md,
    top: '30%',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  controlButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  guestBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  guestBadgeText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: theme.typography.weights.bold,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  endButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
});
