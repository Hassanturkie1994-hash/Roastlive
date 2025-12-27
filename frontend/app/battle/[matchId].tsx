import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BattleRoom from '../../../components/battle/BattleRoom';
import Constants from 'expo-constants';
import { useAuth } from '../../../context/AuthContext';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function BattleMatchScreen() {
  const { matchId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (matchId) {
      loadMatchData();
    }

    // Prevent back button during active battle
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (matchData?.match?.status === 'in_progress') {
        Alert.alert(
          'Leave Battle?',
          'The battle is still in progress. Are you sure you want to leave?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: () => router.back(),
            },
          ]
        );
        return true; // Prevent default back
      }
      return false; // Allow back
    });

    return () => backHandler.remove();
  }, [matchId, matchData]);

  const loadMatchData = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/matchmaking/match/${matchId}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMatchData(data);
      } else {
        Alert.alert('Error', 'Failed to load battle data');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load match:', error);
      Alert.alert('Error', 'Failed to load battle');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading battle...</Text>
      </View>
    );
  }

  if (!matchData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>Battle not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <BattleRoom
      matchId={matchId as string}
      userTeam={matchData.your_team}
      teamSize={matchData.match.team_size}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
