# Social Features - Database Setup

Run this SQL in your Supabase SQL Editor to enable social features (posts, stories, follows).

```sql
-- ============================================================================
-- SOCIAL FEATURES
-- ============================================================================

-- Posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption TEXT,
  image_url TEXT,
  video_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  is_flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_user ON public.posts(user_id, created_at DESC);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);

-- Post likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX idx_post_likes_user ON public.post_likes(user_id);

-- Post comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_post_comments_post ON public.post_comments(post_id, created_at);

-- Stories table (24-hour expiry)
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_stories_user ON public.stories(user_id);
CREATE INDEX idx_stories_expires ON public.stories(expires_at);

-- Story views
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

CREATE INDEX idx_story_views_story ON public.story_views(story_id);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Posts are viewable by all"
  ON public.posts FOR SELECT
  TO authenticated
  USING (NOT is_deleted);

CREATE POLICY "Users can create posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Stories are viewable by all"
  ON public.stories FOR SELECT
  TO authenticated
  USING (expires_at > now());

CREATE POLICY "Users can create stories"
  ON public.stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.posts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT SELECT, INSERT ON public.post_comments TO authenticated;
GRANT SELECT, INSERT ON public.stories TO authenticated;
GRANT SELECT, INSERT ON public.story_views TO authenticated;

-- Helper function to delete expired stories (run via cron)
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM public.stories WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
```

## Features

- **Posts**: Text + image/video
- **Stories**: Auto-expire after 24 hours
- **Likes & Comments**: Full engagement system
- **Story Views**: Track who viewed your stories
