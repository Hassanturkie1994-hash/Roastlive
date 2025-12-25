import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface Participant {
  id: string;
  username: string;
  avatar_url?: string;
  team: 'team_a' | 'team_b';
  is_speaking?: boolean;
  is_muted?: boolean;
}

interface MultiGuestLayoutProps {
  participants: Participant[];
  teamSize: '1v1' | '2v2' | '3v3' | '4v4' | '5v5';
  currentUserId?: string;
}

export default function MultiGuestLayout({
  participants,
  teamSize,
  currentUserId,
}: MultiGuestLayoutProps) {
  const teamA = participants.filter((p) => p.team === 'team_a');
  const teamB = participants.filter((p) => p.team === 'team_b');

  const getGridConfig = () => {
    switch (teamSize) {
      case '1v1': return { columns: 1, rows: 1 };
      case '2v2': return { columns: 1, rows: 2 };
      case '3v3': return { columns: 1, rows: 3 };
      case '4v4': return { columns: 2, rows: 2 };
      case '5v5': return { columns: 2, rows: 3 };
      default: return { columns: 1, rows: 1 };
    }
  };

  const config = getGridConfig();
  const cellWidth = (width / 2) - 4;
  const cellHeight = (height - 200) / config.rows;

  const renderParticipant = (participant: Participant, index: number) => {
    const isCurrentUser = participant.id === currentUserId;

    return (
      <View
        key={participant.id}
        style={[
          styles.participantCell,
          {
            width: config.columns === 2 ? cellWidth / 2 : cellWidth,
            height: cellHeight,
          },
        ]}
      >
        {/* Video Placeholder */}
        <View style={styles.videoContainer}>
          <View style={[
            styles.avatarContainer,
            { backgroundColor: participant.team === 'team_a' ? theme.colors.primary : theme.colors.error }
          ]}>
            {participant.avatar_url ? (
              <Image source={{ uri: participant.avatar_url }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarText}>
                {participant.username?.charAt(0).toUpperCase() || '?'}
              </Text>
            )}
          </View>

          {/* Speaking Indicator */}
          {participant.is_speaking && (
            <View style={styles.speakingRing} />
          )}

          {/* Muted Indicator */}
          {participant.is_muted && (
            <View style={styles.mutedBadge}>
              <Ionicons name="mic-off" size={12} color="#fff" />
            </View>
          )}
        </View>

        {/* Name Tag */}
        <View style={styles.nameTag}>
          <Text style={styles.nameText} numberOfLines={1}>
            {participant.username}
          </Text>
          {isCurrentUser && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>YOU</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTeam = (team: Participant[], teamName: string, teamColor: string) => (
    <View style={styles.teamContainer}>
      {/* Team Header */}
      <View style={[styles.teamHeader, { backgroundColor: teamColor }]}>
        <Text style={styles.teamHeaderText}>{teamName}</Text>
      </View>

      {/* Participants Grid */}
      <View style={styles.participantsGrid}>
        {team.map((p, i) => renderParticipant(p, i))}
        {/* Empty slots */}
        {Array.from({ length: Math.max(0, parseInt(teamSize[0]) - team.length) }).map((_, i) => (
          <View
            key={`empty-${i}`}
            style={[
              styles.participantCell,
              styles.emptyCell,
              {
                width: config.columns === 2 ? cellWidth / 2 : cellWidth,
                height: cellHeight,
              },
            ]}
          >
            <Ionicons name="person-outline" size={32} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>Waiting...</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Team A */}
      {renderTeam(teamA, 'TEAM A', theme.colors.primary)}

      {/* VS Divider */}
      <View style={styles.vsDivider}>
        <View style={styles.vsCircle}>
          <Text style={styles.vsText}>VS</Text>
        </View>
      </View>

      {/* Team B */}
      {renderTeam(teamB, 'TEAM B', theme.colors.error)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#000',
  },
  teamContainer: {
    flex: 1,
  },
  teamHeader: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  teamHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 1,
  },
  participantsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  participantCell: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
  },
  emptyCell: {
    backgroundColor: '#0a0a0a',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  videoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  speakingRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: theme.colors.success,
  },
  mutedBadge: {
    position: 'absolute',
    bottom: -5,
    backgroundColor: theme.colors.error,
    padding: 4,
    borderRadius: 10,
  },
  nameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  nameText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: theme.typography.weights.semibold,
  },
  youBadge: {
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  youBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
  },
  vsDivider: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    zIndex: 10,
  },
  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  vsText: {
    color: '#000',
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
  },
});
