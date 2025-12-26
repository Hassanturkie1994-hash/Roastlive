import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function DMScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const otherUserId = params.userId as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
    loadOtherUser();
    subscribeToMessages();
  }, [otherUserId]);

  const loadOtherUser = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', otherUserId)
      .maybeSingle();
    setOtherUser(data);
  };

  const loadMessages = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    setMessages(data || []);
    markAsRead();
    setLoading(false);
  };

  const subscribeToMessages = () => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`dm:${user.id}:${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === otherUserId || msg.receiver_id === otherUserId) {
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_id === otherUserId) {
              markAsRead();
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const markAsRead = async () => {
    if (!user?.id) return;
    await supabase
      .from('direct_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('receiver_id', user.id)
      .eq('sender_id', otherUserId)
      .eq('is_read', false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;

    try {
      await supabase.from('direct_messages').insert({
        sender_id: user.id,
        receiver_id: otherUserId,
        content: newMessage.trim(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Send DM error:', error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.sender_id === user?.id;
    return (
      <View style={[styles.messageRow, isMine && styles.myMessageRow]}>
        <View style={[styles.messageBubble, isMine && styles.myMessageBubble]}>
          <Text style={[styles.messageText, isMine && styles.myMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerUser}>
          {otherUser?.avatar_url ? (
            <Image source={{ uri: otherUser.avatar_url }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
            </View>
          )}
          <Text style={styles.headerUsername}>@{otherUser?.username || 'User'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textSecondary}
          value={newMessage}
          onChangeText={setNewMessage}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xxl + 10,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerUser: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: theme.spacing.sm },
  headerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  headerUsername: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  messagesList: { padding: theme.spacing.md },
  messageRow: { marginBottom: theme.spacing.md, alignItems: 'flex-start' },
  myMessageRow: { alignItems: 'flex-end' },
  messageBubble: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    maxWidth: '75%',
  },
  myMessageBubble: { backgroundColor: theme.colors.primary },
  messageText: { fontSize: theme.typography.sizes.base, color: theme.colors.text },
  myMessageText: { color: '#fff' },
  messageTime: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginTop: 4 },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
