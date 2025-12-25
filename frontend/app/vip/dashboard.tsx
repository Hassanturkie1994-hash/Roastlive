import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function VIPDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  
  // Edit states
  const [newBadgeText, setNewBadgeText] = useState('');
  const [newBadgeColor, setNewBadgeColor] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const colors = [
    { name: 'Purple', value: '#9C27B0' },
    { name: 'Gold', value: '#FFD700' },
    { name: 'Red', value: '#DC143C' },
    { name: 'Blue', value: '#2196F3' },
    { name: 'Green', value: '#00C853' },
  ];

  useEffect(() => {
    loadClub();
  }, []);

  const loadClub = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data: clubData } = await supabase
        .from('vip_clubs')
        .select('*')
        .eq('creator_id', user.id)
        .single();

      if (clubData) {
        setClub(clubData);
        setNewBadgeText(clubData.badge_text);
        setNewBadgeColor(clubData.badge_color);
        setNewPrice(clubData.price_monthly.toString());

        const { data: membersData } = await supabase
          .from('club_subscriptions')
          .select(`
            *,
            user:profiles (username, avatar_url)
          `)
          .eq('club_id', clubData.id)
          .eq('is_active', true);

        setMembers(membersData || []);
        setStats({
          totalMembers: clubData.member_count || 0,
          activeMembers: membersData?.length || 0,
          monthlyRevenue: (clubData.price_monthly || 0) * (membersData?.length || 0),
        });
      }
    } catch (error) {
      console.error('Error loading club:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (newBadgeText.length > 5) {
      Alert.alert('Error', 'Badge text must be 5 characters or less');
      return;
    }

    if (parseInt(newPrice) < 50) {
      Alert.alert('Error', 'Minimum price is 50 SEK');
      return;
    }

    try {
      const { error } = await supabase
        .from('vip_clubs')
        .update({
          badge_text: newBadgeText.toUpperCase(),
          badge_color: newBadgeColor,
          price_monthly: parseInt(newPrice),
        })
        .eq('id', club.id);

      if (error) throw error;

      Alert.alert('Success', 'Club updated successfully!');
      setEditMode(false);
      loadClub();
    } catch (error) {
      Alert.alert('Error', 'Failed to update club');
    }
  };

  const sendAnnouncement = () => {
    router.push('/vip/announcement');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!club) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VIP Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>You don't have a VIP club yet</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/vip/create')}
          >
            <Text style={styles.createButtonText}>Create VIP Club</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VIP Dashboard</Text>
        <TouchableOpacity onPress={() => setEditMode(!editMode)}>
          <Ionicons name={editMode ? "close" : "create"} size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Club Info Card */}
        <View style={styles.clubCard}>
          <Text style={styles.clubName}>{club.name}</Text>
          <View style={[styles.badgePreview, { backgroundColor: editMode ? newBadgeColor : club.badge_color }]}>
            <Text style={styles.badgeText}>{editMode ? newBadgeText.toUpperCase() : club.badge_text}</Text>
          </View>
          <Text style={styles.priceText}>{editMode ? newPrice : club.price_monthly} SEK/month</Text>
        </View>

        {/* Edit Mode */}
        {editMode && (
          <View style={styles.editSection}>
            <Text style={styles.sectionTitle}>Edit Club Settings</Text>
            
            <View style={styles.editCard}>
              <Text style={styles.label}>Badge Text (Max 5 chars)</Text>
              <TextInput
                style={styles.input}
                value={newBadgeText}
                onChangeText={(text) => text.length <= 5 && setNewBadgeText(text)}
                maxLength={5}
                placeholder="VIP"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Text style={styles.charCount}>{newBadgeText.length}/5</Text>

              <Text style={styles.label}>Badge Color</Text>
              <View style={styles.colorPicker}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color.value}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color.value },
                      newBadgeColor === color.value && styles.colorOptionSelected,
                    ]}
                    onPress={() => setNewBadgeColor(color.value)}
                  >
                    {newBadgeColor === color.value && (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Monthly Price (SEK)</Text>
              <TextInput
                style={styles.input}
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="numeric"
                placeholder="Minimum 50 SEK"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={32} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats.activeMembers}</Text>
            <Text style={styles.statLabel}>Active Members</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={32} color={theme.colors.success} />
            <Text style={styles.statValue}>{stats.monthlyRevenue}</Text>
            <Text style={styles.statLabel}>Monthly Revenue</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.actionButton} onPress={sendAnnouncement}>
          <Ionicons name="megaphone" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Send Announcement</Text>
        </TouchableOpacity>

        {/* Members List */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          {members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View>
                <Text style={styles.memberName}>@{member.user?.username}</Text>
                <Text style={styles.memberDate}>
                  Joined: {new Date(member.subscribed_at).toLocaleDateString()}
                </Text>
                {member.expires_at && (
                  <Text style={styles.memberExpiry}>
                    Expires: {new Date(member.expires_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <View style={[styles.memberBadge, { backgroundColor: club.badge_color }]}>
                <Text style={styles.memberBadgeText}>{club.badge_text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  headerTitle: { fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text },
  clubCard: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
  },
  clubName: { fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.md },
  badgePreview: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.sm, marginBottom: theme.spacing.md },
  badgeText: { fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.bold, color: '#fff' },
  priceText: { fontSize: theme.typography.sizes.lg, color: theme.colors.gold },
  editSection: { paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg },
  editCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
  label: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
  },
  charCount: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, textAlign: 'right', marginTop: 4 },
  colorPicker: { flexDirection: 'row', marginTop: theme.spacing.sm, marginBottom: theme.spacing.md },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: { borderWidth: 3, borderColor: '#fff' },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.lg,
  },
  saveButtonText: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: '#fff', marginLeft: theme.spacing.sm },
  statsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg },
  statCard: { flex: 1, backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg, alignItems: 'center', marginHorizontal: theme.spacing.xs },
  statValue: { fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginTop: theme.spacing.sm },
  statLabel: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginTop: theme.spacing.xs, textAlign: 'center' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  actionButtonText: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: '#fff', marginLeft: theme.spacing.sm },
  membersSection: { paddingHorizontal: theme.spacing.md },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.md },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  memberName: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.semibold, color: theme.colors.text },
  memberDate: { fontSize: theme.typography.sizes.xs, color: theme.colors.textSecondary, marginTop: 4 },
  memberExpiry: { fontSize: theme.typography.sizes.xs, color: theme.colors.warning, marginTop: 2 },
  memberBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
  memberBadgeText: { fontSize: 10, fontWeight: theme.typography.weights.bold, color: '#fff' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl },
  emptyText: { fontSize: theme.typography.sizes.base, color: theme.colors.textSecondary, marginTop: theme.spacing.md, marginBottom: theme.spacing.xl },
  createButton: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.lg, borderRadius: theme.borderRadius.full },
  createButtonText: { fontSize: theme.typography.sizes.base, fontWeight: theme.typography.weights.bold, color: '#fff' },
});
