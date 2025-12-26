import { supabase } from '../lib/supabase';

export interface Post {
  id: string;
  user_id: string;
  caption?: string;
  image_url?: string;
  video_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export const postsService = {
  // Create post
  async createPost(userId: string, caption?: string, mediaUrl?: string, mediaType?: 'image' | 'video'): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const postData: any = {
        user_id: userId,
        caption,
      };

      if (mediaUrl) {
        if (mediaType === 'video') {
          postData.video_url = mediaUrl;
        } else {
          postData.image_url = mediaUrl;
        }
      }

      const { data, error } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single();

      if (error) throw error;

      return { success: true, postId: data.id };
    } catch (error: any) {
      console.error('Create post error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get posts for user
  async getUserPosts(userId: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get user posts error:', error);
      return [];
    }
    return data || [];
  },

  // Get feed posts (following)
  async getFeedPosts(userId: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Get feed posts error:', error);
      return [];
    }
    return data || [];
  },

  // Like post
  async likePost(postId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId });

      if (error) throw error;

      // Increment likes count
      await supabase.rpc('increment_post_likes', { post_id: postId });

      return true;
    } catch (error) {
      console.error('Like post error:', error);
      return false;
    }
  },

  // Unlike post
  async unlikePost(postId: string, userId: string): Promise<boolean> {
    try {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      // Decrement likes count
      await supabase.rpc('decrement_post_likes', { post_id: postId });

      return true;
    } catch (error) {
      console.error('Unlike post error:', error);
      return false;
    }
  },

  // Add comment
  async addComment(postId: string, userId: string, content: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: userId, content });

      if (error) throw error;

      // Increment comments count
      await supabase.rpc('increment_post_comments', { post_id: postId });

      return true;
    } catch (error) {
      console.error('Add comment error:', error);
      return false;
    }
  },
};