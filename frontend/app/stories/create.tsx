import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
// import { storiesService } from '../../services/storiesService';
import * as ImagePicker from 'expo-image-picker';

export default function CreateStoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [uploading, setUploading] = useState(false);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedMedia(result.assets[0].uri);
      setMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
    }
  };

  const handlePost = async () => {
    if (!selectedMedia || !user?.id) {
      Alert.alert('Error', 'Please select media');
      return;
    }

    setUploading(true);
    try {
      const result = await storiesService.createStory(user.id, selectedMedia, mediaType);
      if (result.success) {
        Alert.alert('Success', 'Story posted!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to post story');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Story</Text>
        <TouchableOpacity onPress={handlePost} disabled={!selectedMedia || uploading}>
          <Text
            style={[
              styles.postButton,
              (!selectedMedia || uploading) && styles.postButtonDisabled,
            ]}
          >
            {uploading ? 'Posting...' : 'Share'}
          </Text>
        </TouchableOpacity>
      </View>

      {selectedMedia ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedMedia }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.changeMediaButton}
            onPress={pickMedia}
          >
            <Ionicons name="images" size={24} color="#fff" />
            <Text style={styles.changeMediaText}>Change Media</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="image-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>Tap below to add photo or video</Text>
          <TouchableOpacity style={styles.pickButton} onPress={pickMedia}>
            <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
            <Text style={styles.pickButtonText}>Choose Media</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xxl + 10,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  postButton: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  postButtonDisabled: {
    opacity: 0.3,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  changeMediaButton: {
    position: 'absolute',
    bottom: theme.spacing.xxl,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  changeMediaText: {
    color: '#fff',
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    marginLeft: theme.spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
  },
  pickButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
});
