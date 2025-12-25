# Live Chat & Messaging - Database Setup

Run this SQL in your Supabase SQL Editor to enable chat and messaging.

```sql
-- ============================================================================
-- LIVE CHAT
-- ============================================================================

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_messages_stream ON public.chat_messages(stream_id, created_at DESC);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);

-- Pinned messages table (one per stream with timer)
CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stream_id)
);

CREATE INDEX idx_pinned_messages_stream ON public.pinned_messages(stream_id);

-- Stream moderators table (temporary, per-stream)
CREATE TABLE IF NOT EXISTS public.stream_moderators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stream_id, user_id)
);

CREATE INDEX idx_stream_moderators_stream ON public.stream_moderators(stream_id);
CREATE INDEX idx_stream_moderators_user ON public.stream_moderators(user_id);

-- ============================================================================
-- DIRECT MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_direct_messages_receiver ON public.direct_messages(receiver_id, is_read);
CREATE INDEX idx_direct_messages_conversation ON public.direct_messages(sender_id, receiver_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Chat messages are viewable by all"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can send chat messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "DMs viewable by sender and receiver"
  ON public.direct_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send DMs"
  ON public.direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own DMs"
  ON public.direct_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.pinned_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.stream_moderators TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;
```
