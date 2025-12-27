import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Achievement {
  achievement_id: string;
  name: string;
  description: string;
  icon: string;
  current_value: number;
  target_value: number;
  percentage: number;
  is_unlocked: boolean;
  unlocked_at?: string;
}

export default function AchievementsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnlocked, setTotalUnlocked] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(0);

  useEffect(() => {
    if (user?.id) {
      loadAchievements();
    }
  }, [user]);

  const loadAchievements = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/achievements/user/${user?.id}`);
      const data = await response.json();
      setAchievements(data.achievements || []);
      setTotalUnlocked(data.total_unlocked || 0);
      setTotalAvailable(data.total_available || 0);
    } catch (error) {
      console.error('Load achievements error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAchievement = (achievement: Achievement) => {
    const isUnlocked = achievement.is_unlocked;
    
    return (
      <View
        key={achievement.achievement_id}
        style={[
          styles.achievementCard,
          isUnlocked && styles.achievementCardUnlocked,
        ]}
      >
        <View style={styles.achievementIconContainer}>
          <Text
            style={[
              styles.achievementIcon,
              !isUnlocked && styles.achievementIconLocked,
            ]}
          >
            {achievement.icon}
          </Text>
          {isUnlocked && (
            <View style={styles.unlockedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            </View>
          )}
        </View>

        <View style={styles.achievementInfo}>
          <Text style={styles.achievementName}>{achievement.name}</Text>
          <Text style={styles.achievementDescription}>
            {achievement.description}
          </Text>

          {!isUnlocked && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${achievement.percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {achievement.current_value}/{achievement.target_value} ({achievement.percentage}%)
              </Text>
            </View>
          )}

          {isUnlocked && achievement.unlocked_at && (
            <Text style={styles.unlockedDate}>
              Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Achievements</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Banner */}
        <View style={styles.progressBanner}>
          <View style={styles.progressStats}>
            <Text style={styles.progressNumber}>
              {totalUnlocked}/{totalAvailable}
            </Text>
            <Text style={styles.progressLabel}>Unlocked</Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPercentage}>
              {totalAvailable > 0 ? Math.round((totalUnlocked / totalAvailable) * 100) : 0}%
            </Text>
          </View>
        </View>

        {/* Achievements List */}
        <View style={styles.achievementsList}>
          {achievements.map((achievement) => renderAchievement(achievement))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  progressBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    margin: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStats: {
    flex: 1,
  },
  progressNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  progressLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${theme.colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  achievementsList: {
    paddingHorizontal: 16,
  },
  achievementCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    opacity: 0.6,
  },
  achievementCardUnlocked: {
    opacity: 1,
    borderColor: theme.colors.success,
  },
  achievementIconContainer: {
    position: 'relative',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementIcon: {
    fontSize: 48,
  },
  achievementIconLocked: {
    opacity: 0.3,
  },
  unlockedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: theme.colors.card,
    borderRadius: 10,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  unlockedDate: {
    fontSize: 11,
    color: theme.colors.success,
    fontWeight: '500',
  },
});