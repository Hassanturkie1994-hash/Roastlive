import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  user_id: string;
  content: string;
  username?: string;
  is_system?: boolean;
  is_pinned?: boolean;
  created_at: string;
}

interface LiveChatProps {
  streamId: string;
}

export default function LiveChat({ streamId }: LiveChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
  }, [streamId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!user_id(username)
        `)
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const formattedMessages = data.map((msg: any) => ({
        id: msg.id,
        user_id: msg.user_id,
        content: msg.content,
        username: msg.profiles?.username || 'Unknown',
        is_pinned: msg.is_pinned,
        created_at: msg.created_at,
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Load messages error:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`stream:${streamId}:chat`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `stream_id=eq.${streamId}`,
        },
        async (payload) => {
          // Fetch username for new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', payload.new.user_id)
            .maybeSingle();

          const newMessage: Message = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            content: payload.new.content,
            username: profile?.username || 'Unknown',
            created_at: payload.new.created_at,
          };

          setMessages(prev => [...prev, newMessage]);
          
          // Auto-scroll to bottom
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      await supabase.from('messages').insert({
        stream_id: streamId,
        user_id: user?.id,
        content: inputText.trim(),
      });

      setInputText('');
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.is_system && styles.systemMessage]}>
      {item.is_pinned && (
        <View style={styles.pinnedIndicator}>
          <Ionicons name="pin" size={12} color={theme.colors.primary} />
        </View>
      )}
      <Text style={styles.username}>
        {item.username}:
      </Text>
      <Text style={styles.messageText}>{item.content}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Send a message..."
          placeholderTextColor={theme.colors.textDisabled}
          maxLength={200}
          multiline
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={inputText.trim() ? theme.colors.primary : theme.colors.textDisabled}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: theme.spacing.sm,
  },
  messageContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  systemMessage: {
    backgroundColor: theme.colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  pinnedIndicator: {
    position: 'absolute',
    left: theme.spacing.xs,
    top: theme.spacing.xs,
  },
  username: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
    marginRight: theme.spacing.xs,
  },
  messageText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    maxHeight: 100,
    marginRight: theme.spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
