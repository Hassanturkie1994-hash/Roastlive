import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export interface ChatMessage {
  id: string;
  stream_id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  message: string;
  type: 'message' | 'gift' | 'system' | 'pinned';
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  // Moderation
  is_moderator?: boolean;
  is_host?: boolean;
}

interface LiveChatProps {
  streamId: string;
  hostId: string;
  isHost?: boolean;
  isModerator?: boolean;
  slowModeSeconds?: number;
  chatEnabled?: boolean;
  onGiftTap?: () => void;
}

export default function LiveChat({
  streamId,
  hostId,
  isHost = false,
  isModerator = false,
  slowModeSeconds = 0,
  chatEnabled = true,
  onGiftTap,
}: LiveChatProps) {
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [showModMenu, setShowModMenu] = useState(false);

  // Animation for new messages
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Load initial messages
  useEffect(() => {
    loadMessages();
  }, [streamId]);

  // Subscribe to new messages
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`chat:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (!newMessage.is_deleted) {
            setMessages((prev) => [...prev, newMessage]);
            // Auto scroll to bottom
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stream_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          if (updatedMessage.is_deleted) {
            setMessages((prev) => prev.filter((m) => m.id !== updatedMessage.id));
          } else if (updatedMessage.is_pinned) {
            setPinnedMessage(updatedMessage);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // Slow mode cooldown
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const interval = setInterval(() => {
        setCooldownRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cooldownRemaining]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stream_messages')
        .select('*')
        .eq('stream_id', streamId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      setMessages(data || []);

      // Find pinned message
      const pinned = data?.find((m) => m.is_pinned);
      if (pinned) setPinnedMessage(pinned);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !user?.id || sending || cooldownRemaining > 0) return;
    if (!chatEnabled && !isHost && !isModerator) {
      Alert.alert('Chat Disabled', 'Chat is currently disabled by the host.');
      return;
    }

    setSending(true);
    const messageText = inputText.trim();
    setInputText('');

    try {
      // Get user profile for username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      const { error } = await supabase.from('stream_messages').insert({
        stream_id: streamId,
        user_id: user.id,
        username: profile?.username || 'Anonymous',
        avatar_url: profile?.avatar_url,
        message: messageText,
        type: 'message',
        is_moderator: isModerator,
        is_host: isHost || user.id === hostId,
      });

      if (error) throw error;

      // Apply slow mode cooldown
      if (slowModeSeconds > 0 && !isHost && !isModerator) {
        setCooldownRemaining(slowModeSeconds);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(messageText); // Restore message on error
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleLongPress = (message: ChatMessage) => {
    if (isHost || isModerator) {
      setSelectedMessage(message);
      setShowModMenu(true);
    }
  };

  const deleteMessage = async () => {
    if (!selectedMessage) return;

    try {
      const { error } = await supabase
        .from('stream_messages')
        .update({ is_deleted: true })
        .eq('id', selectedMessage.id);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== selectedMessage.id));
      setShowModMenu(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const pinMessage = async () => {
    if (!selectedMessage) return;

    try {
      // Unpin any existing pinned message
      await supabase
        .from('stream_messages')
        .update({ is_pinned: false })
        .eq('stream_id', streamId)
        .eq('is_pinned', true);

      // Pin the selected message
      const { error } = await supabase
        .from('stream_messages')
        .update({ is_pinned: true })
        .eq('id', selectedMessage.id);

      if (error) throw error;

      setPinnedMessage(selectedMessage);
      setShowModMenu(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };

  const timeoutUser = async (seconds: number) => {
    if (!selectedMessage) return;

    try {
      const expiresAt = new Date(Date.now() + seconds * 1000).toISOString();

      const { error } = await supabase.from('stream_timeouts').insert({
        stream_id: streamId,
        user_id: selectedMessage.user_id,
        moderator_id: user?.id,
        reason: 'Timed out by moderator',
        expires_at: expiresAt,
      });

      if (error) throw error;

      // Add system message
      await supabase.from('stream_messages').insert({
        stream_id: streamId,
        user_id: user?.id,
        username: 'System',
        message: `${selectedMessage.username} has been timed out for ${seconds} seconds`,
        type: 'system',
      });

      setShowModMenu(false);
      setSelectedMessage(null);
      Alert.alert('User Timed Out', `${selectedMessage.username} has been timed out for ${seconds} seconds`);
    } catch (error) {
      console.error('Error timing out user:', error);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.user_id === user?.id;
    const isSystemMessage = item.type === 'system';
    const isGiftMessage = item.type === 'gift';

    if (isSystemMessage) {
      return (
        <View style={styles.systemMessage}>
          <Ionicons name="information-circle" size={14} color={theme.colors.info} />
          <Text style={styles.systemMessageText}>{item.message}</Text>
        </View>
      );
    }

    if (isGiftMessage) {
      return (
        <View style={styles.giftMessage}>
          <Ionicons name="gift" size={16} color={theme.colors.gold} />
          <Text style={styles.giftMessageText}>{item.message}</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.messageContainer, isOwn && styles.ownMessage]}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        {/* Badges */}
        <View style={styles.messageBadges}>
          {item.is_host && (
            <View style={[styles.badge, styles.hostBadge]}>
              <Text style={styles.badgeText}>HOST</Text>
            </View>
          )}
          {item.is_moderator && !item.is_host && (
            <View style={[styles.badge, styles.modBadge]}>
              <Ionicons name="shield" size={10} color="#fff" />
              <Text style={styles.badgeText}>MOD</Text>
            </View>
          )}
        </View>

        {/* Username */}
        <Text style={[
          styles.username,
          item.is_host && styles.hostUsername,
          item.is_moderator && styles.modUsername,
        ]}>
          {item.username}
        </Text>

        {/* Message */}
        <Text style={styles.messageText}>{item.message}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Pinned Message */}
      {pinnedMessage && (
        <View style={styles.pinnedContainer}>
          <Ionicons name="pin" size={14} color={theme.colors.primary} />
          <Text style={styles.pinnedUsername}>{pinnedMessage.username}:</Text>
          <Text style={styles.pinnedText} numberOfLines={1}>
            {pinnedMessage.message}
          </Text>
          {(isHost || isModerator) && (
            <TouchableOpacity
              onPress={() => {
                supabase
                  .from('stream_messages')
                  .update({ is_pinned: false })
                  .eq('id', pinnedMessage.id);
                setPinnedMessage(null);
              }}
            >
              <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Messages List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        {/* Gift Button */}
        {onGiftTap && (
          <TouchableOpacity style={styles.giftButton} onPress={onGiftTap}>
            <Ionicons name="gift" size={24} color={theme.colors.gold} />
          </TouchableOpacity>
        )}

        {/* Text Input */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={
              cooldownRemaining > 0
                ? `Wait ${cooldownRemaining}s...`
                : chatEnabled
                ? 'Say something...'
                : 'Chat disabled'
            }
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            editable={chatEnabled || isHost || isModerator}
            maxLength={200}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          {slowModeSeconds > 0 && !isHost && !isModerator && (
            <View style={styles.slowModeIndicator}>
              <Ionicons name="time" size={12} color={theme.colors.warning} />
              <Text style={styles.slowModeText}>{slowModeSeconds}s</Text>
            </View>
          )}
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || cooldownRemaining > 0) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending || cooldownRemaining > 0}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Moderation Menu */}
      {showModMenu && selectedMessage && (
        <View style={styles.modMenuOverlay}>
          <View style={styles.modMenu}>
            <Text style={styles.modMenuTitle}>Moderate Message</Text>
            <Text style={styles.modMenuUser}>@{selectedMessage.username}</Text>

            <TouchableOpacity style={styles.modMenuItem} onPress={pinMessage}>
              <Ionicons name="pin" size={20} color={theme.colors.primary} />
              <Text style={styles.modMenuItemText}>Pin Message</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modMenuItem} onPress={deleteMessage}>
              <Ionicons name="trash" size={20} color={theme.colors.error} />
              <Text style={[styles.modMenuItemText, { color: theme.colors.error }]}>
                Delete Message
              </Text>
            </TouchableOpacity>

            <View style={styles.modMenuDivider} />

            <Text style={styles.modMenuSection}>Timeout User</Text>

            <View style={styles.timeoutButtons}>
              {[60, 300, 600, 3600].map((seconds) => (
                <TouchableOpacity
                  key={seconds}
                  style={styles.timeoutButton}
                  onPress={() => timeoutUser(seconds)}
                >
                  <Text style={styles.timeoutButtonText}>
                    {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modMenuCancel}
              onPress={() => {
                setShowModMenu(false);
                setSelectedMessage(null);
              }}
            >
              <Text style={styles.modMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pinned Message
  pinnedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}20`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pinnedUsername: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  pinnedText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  // Messages
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  messageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  ownMessage: {
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.xs,
    marginVertical: 2,
  },
  messageBadges: {
    flexDirection: 'row',
    marginRight: theme.spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginRight: 4,
  },
  hostBadge: {
    backgroundColor: theme.colors.gold,
  },
  modBadge: {
    backgroundColor: theme.colors.primary,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    color: '#000',
    marginLeft: 2,
  },
  username: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginRight: theme.spacing.xs,
  },
  hostUsername: {
    color: theme.colors.gold,
  },
  modUsername: {
    color: theme.colors.primary,
  },
  messageText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    flex: 1,
  },
  // System & Gift Messages
  systemMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.info}20`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 4,
  },
  systemMessageText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.info,
    marginLeft: theme.spacing.xs,
    fontStyle: 'italic',
  },
  giftMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.gold}20`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 4,
  },
  giftMessageText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gold,
    marginLeft: theme.spacing.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  // Input Area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  giftButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
  },
  slowModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.warning}30`,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  slowModeText: {
    fontSize: 10,
    color: theme.colors.warning,
    marginLeft: 2,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.textDisabled,
  },
  // Moderation Menu
  modMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modMenu: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '85%',
    maxWidth: 320,
  },
  modMenuTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  modMenuUser: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  modMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modMenuItemText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  modMenuDivider: {
    height: theme.spacing.md,
  },
  modMenuSection: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  timeoutButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  timeoutButton: {
    flex: 1,
    backgroundColor: theme.colors.warning,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  timeoutButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#000',
  },
  modMenuCancel: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  modMenuCancelText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
});
