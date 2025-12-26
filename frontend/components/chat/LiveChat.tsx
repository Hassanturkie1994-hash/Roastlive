import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  user_id: string;
  content: string;
  username?: string;
  is_vip?: boolean;
  is_mod?: boolean;
  created_at: string;
}

interface LiveChatProps {
  streamId: string;
  isHost?: boolean;
  isModerator?: boolean;
}

export default function LiveChat({ streamId, isHost = false, isModerator = false }: LiveChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
    subscribeToPinnedMessages();
  }, [streamId]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles:user_id (username)
      `)
      .eq('stream_id', streamId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setMessages(data.reverse());
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToPinnedMessages = () => {
    const channel = supabase
      .channel(`pinned:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const { data } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('id', payload.new.message_id)
              .maybeSingle();
            setPinnedMessage(data);
          } else if (payload.eventType === 'DELETE') {
            setPinnedMessage(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;

    try {
      await supabase.from('chat_messages').insert({
        stream_id: streamId,
        user_id: user.id,
        content: newMessage.trim(),
      });

      setNewMessage('');
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    await supabase
      .from('chat_messages')
      .update({ is_deleted: true, deleted_by: user?.id })
      .eq('id', messageId);
  };

  const pinMessage = async (messageId: string) => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await supabase.from('pinned_messages').insert({
      stream_id: streamId,
      message_id: messageId,
      pinned_by: user?.id,
      expires_at: expiresAt.toISOString(),
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const canModerate = isHost || isModerator;
    
    return (
      <View style={styles.messageRow}>
        <View style={styles.messageContent}>
          <View style={styles.messageMeta}>
            <Text style={styles.messageUsername}>
              {item.username || 'User'}
            </Text>
            {item.is_vip && (
              <View style={styles.vipBadge}>
                <Text style={styles.badgeText}>VIP</Text>
              </View>
            )}
            {item.is_mod && (
              <View style={styles.modBadge}>
                <Text style={styles.badgeText}>MOD</Text>
              </View>
            )}
          </View>
          <Text style={styles.messageText}>{item.content}</Text>
        </View>
        {canModerate && (
          <TouchableOpacity
            style={styles.messageAction}
            onPress={() => pinMessage(item.id)}
          >
            <Ionicons name="pin-outline" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Pinned Message */}
      {pinnedMessage && (
        <View style={styles.pinnedContainer}>
          <Ionicons name="pin" size={16} color={theme.colors.gold} />
          <Text style={styles.pinnedText} numberOfLines={2}>
            {pinnedMessage.content}
          </Text>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Send a message..."
          placeholderTextColor={theme.colors.textSecondary}
          value={newMessage}
          onChangeText={setNewMessage}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pinnedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.gold}30`,
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gold,
  },
  pinnedText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: '#fff',
    marginLeft: theme.spacing.sm,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: theme.spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  messageContent: {
    flex: 1,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  messageUsername: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
    marginRight: theme.spacing.xs,
  },
  vipBadge: {
    backgroundColor: theme.colors.vip,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginRight: 4,
  },
  modBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  messageText: {
    fontSize: theme.typography.sizes.sm,
    color: '#fff',
  },
  messageAction: {
    padding: theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
