import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface LeaderboardEntry {
  id: string;
  rank: number;
  user: {
    id: string;
    username: string;
    avatar: string;
  };
  value: number;
  change: number; // position change from previous period
}

type LeaderboardCategory = 'battles_won' | 'gifts_received' | 'gifts_sent' | 'followers';
type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

export default function LeaderboardsScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<LeaderboardCategory>('battles_won');
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>('weekly');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'battles_won', label: 'Battles Won', icon: 'trophy', unit: 'wins' },
    { id: 'gifts_received', label: 'Top Earners', icon: 'gift', unit: 'coins' },
    { id: 'gifts_sent', label: 'Top Gifters', icon: 'heart', unit: 'coins' },
    { id: 'followers', label: 'Most Followed', icon: 'people', unit: 'followers' },
  ];

  const periods = [
    { id: 'daily', label: 'Today' },
    { id: 'weekly', label: 'This Week' },
    { id: 'monthly', label: 'This Month' },
    { id: 'all_time', label: 'All Time' },
  ];

  useEffect(() => {
    loadLeaderboard();
  }, [selectedCategory, selectedPeriod]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to fetch leaderboard data
      // const response = await fetch(`/api/leaderboard?category=${selectedCategory}&period=${selectedPeriod}`);
      // const data = await response.json();
      // setLeaderboardData(data);
      
      // Mock data for now
      setTimeout(() => {
        setLeaderboardData([]);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLoading(false);
    }
  };

  const formatValue = (value: number, category: LeaderboardCategory) => {
    const config = categories.find(c => c.id === category);
    if (category === 'gifts_received' || category === 'gifts_sent') {
      return `${value.toLocaleString()} ${config?.unit}`;
    }
    return `${value} ${config?.unit}`;
  };

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => {
    const isTopThree = item.rank <= 3;
    const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
    const medalColor = isTopThree ? medalColors[item.rank - 1] : null;

    return (
      <TouchableOpacity
        style={[
          styles.leaderboardItem,
          isTopThree && styles.topThreeItem,
        ]}
        onPress={() => router.push(`/profile/${item.user.id}`)}
      >
        <View style={styles.rankContainer}>
          {isTopThree ? (
            <Ionicons name="medal" size={32} color={medalColor} />
          ) : (
            <Text style={styles.rankNumber}>{item.rank}</Text>
          )}
        </View>

        <Image source={{ uri: item.user.avatar }} style={styles.userAvatar} />

        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.user.username}</Text>
          <Text style={styles.value}>
            {formatValue(item.value, selectedCategory)}
          </Text>
        </View>

        {item.change !== 0 && (
          <View style={styles.changeContainer}>
            <Ionicons
              name={item.change > 0 ? 'arrow-up' : 'arrow-down'}
              size={16}
              color={item.change > 0 ? '#4ade80' : '#f87171'}
            />
            <Text
              style={[
                styles.changeText,
                { color: item.change > 0 ? '#4ade80' : '#f87171' },
              ]}
            >
              {Math.abs(item.change)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const currentCategory = categories.find(c => c.id === selectedCategory);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboards</Text>
        <Ionicons name="trophy" size={28} color="#FFD700" />
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryTab,
              selectedCategory === category.id && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(category.id as LeaderboardCategory)}
          >
            <Ionicons
              name={category.icon as any}
              size={20}
              color={selectedCategory === category.id ? '#fff' : '#666'}
            />
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === category.id && styles.categoryTabTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Period Selector */}
      <View style={styles.periodContainer}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.id}
            style={[
              styles.periodChip,
              selectedPeriod === period.id && styles.periodChipActive,
            ]}
            onPress={() => setSelectedPeriod(period.id as LeaderboardPeriod)}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === period.id && styles.periodTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Leaderboard List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff4444" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : leaderboardData.length > 0 ? (
        <FlatList
          data={leaderboardData}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptyText}>
            Leaderboard data will appear here as users compete!
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  categoriesScroll: {
    maxHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: '#ff4444',
  },
  categoryTabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a0a0a',
  },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#1a1a1a',
  },
  periodChipActive: {
    backgroundColor: '#2a2a2a',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  periodTextActive: {
    color: '#ff4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  topThreeItem: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#888',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
