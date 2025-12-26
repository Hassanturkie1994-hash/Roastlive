import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export type StorageBucket = 'avatars' | 'stream-thumbnails' | 'posts' | 'stories' | 'gifts';

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: StorageBucket,
  filePath: string,
  fileUri: string,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert to ArrayBuffer
    const arrayBuffer = decode(base64);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  bucket: StorageBucket,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Delete error:', error);
    return {
      success: false,
      error: error.message || 'Delete failed',
    };
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: StorageBucket, filePath: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Generate a unique file path for a user
 */
export function generateFilePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const extension = fileName.split('.').pop();
  return `${userId}/${timestamp}.${extension}`;
}

/**
 * Upload user avatar
 */
export async function uploadAvatar(
  userId: string,
  imageUri: string
): Promise<UploadResult> {
  const filePath = generateFilePath(userId, 'avatar.jpg');
  return uploadFile('avatars', filePath, imageUri, 'image/jpeg');
}

/**
 * Upload stream thumbnail
 */
export async function uploadStreamThumbnail(
  userId: string,
  imageUri: string
): Promise<UploadResult> {
  const filePath = generateFilePath(userId, 'thumbnail.jpg');
  return uploadFile('stream-thumbnails', filePath, imageUri, 'image/jpeg');
}

/**
 * Upload post image
 */
export async function uploadPostImage(
  userId: string,
  imageUri: string
): Promise<UploadResult> {
  const filePath = generateFilePath(userId, 'post.jpg');
  return uploadFile('posts', filePath, imageUri, 'image/jpeg');
}

/**
 * Upload story media
 */
export async function uploadStory(
  userId: string,
  mediaUri: string,
  isVideo: boolean = false
): Promise<UploadResult> {
  const extension = isVideo ? 'mp4' : 'jpg';
  const contentType = isVideo ? 'video/mp4' : 'image/jpeg';
  const filePath = generateFilePath(userId, `story.${extension}`);
  return uploadFile('stories', filePath, mediaUri, contentType);
}

/**
 * List files in a bucket for a user
 */
export async function listUserFiles(
  bucket: StorageBucket,
  userId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(userId, {
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) throw error;

    return data?.map((file) => `${userId}/${file.name}`) || [];
  } catch (error) {
    console.error('List files error:', error);
    return [];
  }
}
