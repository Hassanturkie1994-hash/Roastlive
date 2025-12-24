import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

type NotificationCategory = 'all' | 'social' | 'gifts' | 'safety' | 'wallet' | 'admin';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data: any;
}

const CATEGORIES = [
  { key: 'all' as NotificationCategory, label: 'All', icon: 'apps' },
  { key: 'social' as NotificationCategory, label: 'Social', icon: 'people' },
  { key: 'gifts' as NotificationCategory, label: 'Gifts', icon: 'gift' },
  { key: 'safety' as NotificationCategory, label: 'Safety', icon: 'shield' },
  { key: 'wallet' as NotificationCategory, label: 'Wallet', icon: 'wallet' },
  { key: 'admin' as NotificationCategory, label: 'Admin', icon: 'megaphone' },
];

const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    follow: 'person-add',
    like: 'heart',
    comment: 'chatbubble',
    gift_received: 'gift',
    warning: 'warning',
    timeout: 'time',
    ban: 'close-circle',
    deposit: 'arrow-down-circle',
    withdrawal: 'arrow-up-circle',
    admin_message: 'megaphone',
    vip_joined: 'star',
    stream_started: 'videocam',
  };
  return iconMap[type] || 'notifications';
};

const getNotificationColor = (type: string) => {
  const colorMap: Record<string, string> = {
    follow: theme.colors.info,
    like: theme.colors.primary,
    comment: theme.colors.info,
    gift_received: theme.colors.success,
    warning: theme.colors.warning,
    timeout: theme.colors.warning,
    ban: theme.colors.error,
    deposit: theme.colors.success,
    withdrawal: theme.colors.error,
    admin_message: theme.colors.warning,
    vip_joined: theme.colors.primary,
    stream_started: theme.colors.live,
  };
  return colorMap[type] || theme.colors.textSecondary;
};

export default function Notifications() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadNotifications();
    loadUnreadCounts();

    // Set up real-time subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          loadNotifications();
          loadUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeCategory]);

  const loadNotifications = async () => {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Filter by category
      if (activeCategory !== 'all') {
        // Map category to notification types
        const typeMap: Record<NotificationCategory, string[]> = {
          all: [],
          social: ['follow', 'like', 'comment'],
          gifts: ['gift_received'],
          safety: ['warning', 'timeout', 'ban'],
          wallet: ['deposit', 'withdrawal'],
          admin: ['admin_message'],
        };
        
        const types = typeMap[activeCategory] || [];
        if (types.length > 0) {
          query = query.in('type', types);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('type')
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;

      const counts: Record<string, number> = {
        all: data?.length || 0,
        social: 0,
        gifts: 0,
        safety: 0,
        wallet: 0,
        admin: 0,
      };

      data?.forEach((n: any) => {
        if (['follow', 'like', 'comment'].includes(n.type)) counts.social++;
        if (n.type === 'gift_received') counts.gifts++;
        if (['warning', 'timeout', 'ban'].includes(n.type)) counts.safety++;
        if (['deposit', 'withdrawal'].includes(n.type)) counts.wallet++;
        if (n.type === 'admin_message') counts.admin++;
      });

      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      loadNotifications();
      loadUnreadCounts();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      loadNotifications();
      loadUnreadCounts();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.is_read && styles.unreadNotification]}
      onPress={() => markAsRead(item.id)}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: getNotificationColor(item.type) + '20' },
        ]}
      >
        <Ionicons
          name={getNotificationIcon(item.type) as any}
          size={24}
          color={getNotificationColor(item.type)}
        />
      </View>

      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        {item.message && (
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
        )}
        <Text style={styles.notificationTime}>
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Text>
      </View>

      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryChip,
              activeCategory === cat.key && styles.activeCategoryChip,
            ]}
            onPress={() => setActiveCategory(cat.key)}
          >
            <Ionicons
              name={cat.icon as any}
              size={16}
              color={
                activeCategory === cat.key
                  ? theme.colors.text
                  : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.categoryLabel,
                activeCategory === cat.key && styles.activeCategoryLabel,
              ]}
            >
              {cat.label}
            </Text>
            {unreadCounts[cat.key] > 0 && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {unreadCounts[cat.key]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Mark All Read Button */}
      {unreadCounts.all > 0 && (
        <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="notifications-outline"
            size={64}
            color={theme.colors.textDisabled}
          />
          <Text style={styles.emptyText}>No notifications</Text>
          <Text style={styles.emptySubtext}>
            You're all caught up! Notifications will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  categoryScroll: {
    maxHeight: 60,
    backgroundColor: theme.colors.surface,
  },
  categoryContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceLight,
    marginRight: theme.spacing.sm,
  },
  activeCategoryChip: {
    backgroundColor: theme.colors.primary,
  },
  categoryLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  activeCategoryLabel: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  categoryBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.xs,
    paddingHorizontal: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  markAllButton: {
    padding: theme.spacing.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  markAllText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  unreadNotification: {
    backgroundColor: theme.colors.surfaceLight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  notificationMessage: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  notificationTime: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textDisabled,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
