import { supabase } from '../lib/supabase';

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
}

export const storiesService = {
  // Create story
  async createStory(
    userId: string,
    mediaUrl: string,
    mediaType: 'image' | 'video'
  ): Promise<{ success: boolean; storyId?: string; error?: string }> {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: userId,
          media_url: mediaUrl,
          media_type: mediaType,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, storyId: data.id };
    } catch (error: any) {
      console.error('Create story error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user stories
  async getUserStories(userId: string): Promise<Story[]> {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get user stories error:', error);
      return [];
    }
    return data || [];
  },

  // Get following stories (for feed)
  async getFollowingStories(userId: string): Promise<Story[]> {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Get following stories error:', error);
      return [];
    }
    return data || [];
  },

  // Mark story as viewed
  async markStoryViewed(storyId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('story_views')
        .insert({ story_id: storyId, viewer_id: userId });

      return !error;
    } catch (error) {
      console.error('Mark story viewed error:', error);
      return false;
    }
  },
};
