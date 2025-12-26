import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export default function ReportIndexScreen() {
  const router = useRouter();

  const reportTypes: ReportType[] = [
    {
      id: 'user',
      title: 'Report User',
      description: 'Report inappropriate behavior, harassment, or violations',
      icon: 'person-circle',
    },
    {
      id: 'stream',
      title: 'Report Stream',
      description: 'Report inappropriate content or stream violations',
      icon: 'videocam',
    },
    {
      id: 'chat',
      title: 'Report Chat Message',
      description: 'Report spam, harassment, or inappropriate messages',
      icon: 'chatbubble-ellipses',
    },
    {
      id: 'other',
      title: 'Other Issue',
      description: 'Report other concerns or violations',
      icon: 'flag',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report an Issue</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#ff4444" />
          <Text style={styles.infoText}>
            Your report will be reviewed by our moderation team. All reports are confidential.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What would you like to report?</Text>

        {reportTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={styles.reportTypeCard}
            onPress={() => router.push(`/report/${type.id}`)}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={type.icon as any} size={28} color="#ff4444" />
            </View>
            <View style={styles.typeInfo}>
              <Text style={styles.typeTitle}>{type.title}</Text>
              <Text style={styles.typeDescription}>{type.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  reportTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
});
