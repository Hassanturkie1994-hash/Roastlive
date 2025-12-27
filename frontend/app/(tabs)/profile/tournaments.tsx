import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Tournament {
  tournament_id: string;
  name: string;
  format: string;
  max_participants: number;
  current_participants: number;
  prize_pool: number;
  start_time: string;
  status: string;
  created_by: string;
}

export default function TournamentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tournaments/active`);
      const data = await response.json();
      setTournaments(data.tournaments || []);
    } catch (error) {
      console.error('Load tournaments error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTournament = async (tournament: Tournament) => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to join tournaments');
      return;
    }

    if (tournament.current_participants >= tournament.max_participants) {
      Alert.alert('Tournament Full', 'This tournament has reached max participants');
      return;
    }

    Alert.alert(
      'Join Tournament',
      `Join ${tournament.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            setJoining(tournament.tournament_id);
            try {
              const response = await fetch(`${BACKEND_URL}/api/tournaments/join`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user.session_token}`,
                },
                body: JSON.stringify({
                  tournament_id: tournament.tournament_id,
                  user_id: user.id,
                }),
              });

              const data = await response.json();

              if (response.ok) {
                Alert.alert('Success!', 'You joined the tournament', [
                  { text: 'OK', onPress: loadTournaments },
                ]);
              } else {
                Alert.alert('Error', data.detail || 'Failed to join tournament');
              }
            } catch (error) {
              console.error('Join tournament error:', error);
              Alert.alert('Error', 'Failed to join tournament');
            } finally {
              setJoining(null);
            }
          },
        },
      ]
    );
  };

  const getFormatDisplay = (format: string) => {
    const formats: { [key: string]: string } = {
      single_elimination: 'Single Elimination',
      double_elimination: 'Double Elimination',
      round_robin: 'Round Robin',
    };
    return formats[format] || format;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      registration: theme.colors.success,
      in_progress: theme.colors.warning,
      completed: theme.colors.textSecondary,
    };
    return colors[status] || theme.colors.textSecondary;
  };

  const renderTournament = (tournament: Tournament) => {
    const isJoining = joining === tournament.tournament_id;
    const isFull = tournament.current_participants >= tournament.max_participants;
    const statusColor = getStatusColor(tournament.status);

    return (
      <View key={tournament.tournament_id} style={styles.tournamentCard}>
        <View style={styles.tournamentHeader}>
          <View style={styles.tournamentTitleRow}>
            <Text style={styles.tournamentName}>{tournament.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {tournament.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tournamentInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="people" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>
              {tournament.current_participants}/{tournament.max_participants} Players
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="trophy" size={16} color={theme.colors.warning} />
            <Text style={styles.infoText}>
              {tournament.prize_pool.toLocaleString()} Coins Prize Pool
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="grid" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>
              {getFormatDisplay(tournament.format)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>
              Starts: {new Date(tournament.start_time).toLocaleString()}
            </Text>
          </View>
        </View>

        {tournament.status === 'registration' && (
          <TouchableOpacity
            style={[
              styles.joinButton,
              (isFull || isJoining) && styles.joinButtonDisabled,
            ]}
            onPress={() => handleJoinTournament(tournament)}
            disabled={isFull || isJoining}
            activeOpacity={0.7}
          >
            {isJoining ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.joinButtonText}>
                {isFull ? 'Tournament Full' : 'Join Tournament'}
              </Text>
            )}
          </TouchableOpacity>
        )}
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
          <Text style={styles.headerTitle}>Tournaments</Text>
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
        <Text style={styles.headerTitle}>Tournaments</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>🏆</Text>
          <Text style={styles.bannerTitle}>Roast Battle Tournaments</Text>
          <Text style={styles.bannerText}>
            Compete in organized tournaments, climb the ranks, and win prizes!
          </Text>
        </View>

        {/* Tournaments List */}
        {tournaments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No Active Tournaments</Text>
            <Text style={styles.emptySubtext}>Check back soon for upcoming tournaments!</Text>
          </View>
        ) : (
          <View style={styles.tournamentsList}>
            {tournaments.map((tournament) => renderTournament(tournament))}
          </View>
        )}
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
  banner: {
    backgroundColor: theme.colors.card,
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bannerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  bannerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  tournamentsList: {
    paddingHorizontal: 16,
  },
  tournamentCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tournamentHeader: {
    marginBottom: 12,
  },
  tournamentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tournamentInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 8,
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});