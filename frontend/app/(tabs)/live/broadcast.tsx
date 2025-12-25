import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import axios from 'axios';
import { supabase } from '../../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Broadcast() {
  const router = useRouter();
  const { user } = useAuth();
  const cameraRef = useRef<Camera>(null);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [cameraType, setCameraType] = useState(CameraType.front);

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();
    setHasPermission(cameraStatus === 'granted' && micStatus === 'granted');
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0
      ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startStream = async () => {
    if (!streamTitle.trim()) {
      Alert.alert('Error', 'Please enter a stream title');
      return;
    }

    setLoading(true);
    try {
      // Generate channel name
      const channelName = `stream_${user?.id}_${Date.now()}`;

      // Get Agora token from backend
      const tokenResponse = await axios.post(`${API_URL}/api/streams/token`, {
        channelName,
        uid: parseInt(user?.id?.slice(-8) || '0', 16),
        role: 'host',
      });

      // Create stream record
      const streamResponse = await axios.post(`${API_URL}/api/streams/create`, {
        hostId: user?.id,
        title: streamTitle,
        channelName,
      });

      // Also create in Supabase for real-time features
      await supabase.from('streams').insert({
        id: streamResponse.data.id,
        host_id: user?.id,
        title: streamTitle,
        channel_name: channelName,
        is_live: true,
        viewer_count: 0,
        started_at: new Date().toISOString(),
      });

      setStreamId(streamResponse.data.id);
      setIsLive(true);

      // In production, initialize Agora RTC here with token
      // For now, we're in demo mode
      console.log('Stream started:', {
        token: tokenResponse.data.token,
        channel: channelName,
      });

      Alert.alert('Live!', 'You are now live! (Demo Mode)');
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
      'Are you sure you want to end this live stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: async () => {
            try {
              if (streamId) {
                await axios.post(`${API_URL}/api/streams/${streamId}/end`);
                await supabase
                  .from('streams')
                  .update({ is_live: false, ended_at: new Date().toISOString() })
                  .eq('id', streamId);
              }
              router.back();
            } catch (error) {
              console.error('End stream error:', error);
            }
          },
        },
      ]
    );
  };

  const toggleCamera = () => {
    setCameraType(current =>
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera and microphone permissions are required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Preview */}
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        ratio="16:9"
      >
        {/* Overlay Controls */}
        <View style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            {isLive && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
                <Text style={styles.durationText}>{formatDuration(duration)}</Text>
              </View>
            )}

            <TouchableOpacity onPress={toggleCamera} style={styles.iconButton}>
              <Ionicons name="camera-reverse" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Stats (when live) */}
          {isLive && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="eye" size={20} color="#fff" />
                <Text style={styles.statText}>{viewerCount}</Text>
              </View>
            </View>
          )}

          {/* Bottom Section */}
          {!isLive ? (
            <View style={styles.setupContainer}>
              <Text style={styles.setupTitle}>Ready to go live?</Text>
              <TextInput
                style={styles.input}
                placeholder="Stream title (e.g., Epic Roast Battle!)" 
                placeholderTextColor={theme.colors.textDisabled}
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
                    <Ionicons name="videocam" size={24} color="#fff" />
                    <Text style={styles.goLiveButtonText}>GO LIVE</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.liveControls}>
              <TouchableOpacity style={styles.controlButton}>
                <Ionicons name="people" size={24} color="#fff" />
                <Text style={styles.controlText}>Viewers</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton}>
                <Ionicons name="person-add" size={24} color="#fff" />
                <Text style={styles.controlText}>Invite</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton}>
                <Ionicons name="settings" size={24} color="#fff" />
                <Text style={styles.controlText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.endButton]}
                onPress={endStream}
              >
                <Ionicons name="stop-circle" size={24} color="#fff" />
                <Text style={styles.controlText}>End</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: theme.spacing.md,
  },
  iconButton: {
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
    backgroundColor: theme.colors.live,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: theme.spacing.sm,
  },
  liveText: {
    color: '#fff',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    marginRight: theme.spacing.md,
  },
  durationText: {
    color: '#fff',
    fontSize: theme.typography.sizes.sm,
  },
  statsContainer: {
    position: 'absolute',
    top: 110,
    left: theme.spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  statText: {
    color: '#fff',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    marginLeft: theme.spacing.xs,
  },
  setupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  setupTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: '#fff',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  goLiveButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  goLiveButtonDisabled: {
    opacity: 0.6,
  },
  goLiveButtonText: {
    color: '#fff',
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    marginLeft: theme.spacing.sm,
  },
  liveControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  endButton: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
  },
  controlText: {
    color: '#fff',
    fontSize: theme.typography.sizes.xs,
    marginTop: theme.spacing.xs,
  },
  permissionText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
  },
});
