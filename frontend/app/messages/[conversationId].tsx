import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export default function ConversationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { conversationId } = useLocalSearchParams();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadConversation();
    subscribeToMessages();
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      // Get conversation details
      const { data: conv } = await supabase
        .from('dm_conversations')
        .select(`
          id, user1_id, user2_id,
          user1:user1_id (id, username, avatar_url),
          user2:user2_id (id, username, avatar_url)
        `)
        .eq('id', conversationId)
        .single();

      if (conv) {
        const other = conv.user1_id === user?.id ? conv.user2 : conv.user1;
        setOtherUser(other);
      }

      // Get messages
      const { data: msgs } = await supabase
        .from('dm_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      setMessages(msgs || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !user?.id || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await supabase.from('dm_messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      });

      // Update last message
      await supabase
        .from('dm_conversations')
        .update({ last_message: content, last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.sender_id === user?.id;
    const showDate = index === 0 || 
      new Date(item.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();

    return (
      <>
        {showDate && (
          <Text style={styles.dateHeader}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        )}
        <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>{item.content}</Text>
          <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>{formatTime(item.created_at)}</Text>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {otherUser?.username?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.headerUsername}>{otherUser?.username || 'Loading...'}</Text>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xxl + 10, paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: theme.spacing.sm },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#fff', fontWeight: theme.typography.weights.bold },
  headerUsername: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.semibold, color: theme.colors.text, marginLeft: theme.spacing.sm },
  menuButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messagesList: { padding: theme.spacing.md },
  dateHeader: { textAlign: 'center', fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary, marginVertical: theme.spacing.md },
  messageContainer: { maxWidth: '80%', padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.sm },
  ownMessage: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface },
  messageText: { fontSize: theme.typography.sizes.base, color: theme.colors.text },
  ownMessageText: { color: '#fff' },
  messageTime: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4, alignSelf: 'flex-end' },
  ownMessageTime: { color: 'rgba(255,255,255,0.7)' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end', padding: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1, backgroundColor: theme.colors.surfaceLight, borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, fontSize: theme.typography.sizes.base,
    color: theme.colors.text, maxHeight: 100, marginRight: theme.spacing.sm,
  },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: theme.colors.textDisabled },
});
