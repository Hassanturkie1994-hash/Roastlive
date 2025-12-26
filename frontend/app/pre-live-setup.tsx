import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { Camera } from 'expo-camera';
import * as Linking from 'expo-linking';

type StreamType = 'solo' | 'battle' | null;
type TeamSize = '1v1' | '2v2' | '3v3' | '4v4' | '5v5';

const STREAM_LABELS = [
  { id: 'roast', label: '🔥 Roast Mode', color: '#FF6B35' },
  { id: 'comedy', label: '😂 Comedy', color: '#4ECDC4' },
  { id: 'q&a', label: '❓ Q&A', color: '#9B59B6' },
  { id: 'chill', label: '😎 Chill Vibes', color: '#3498DB' },
  { id: 'drama', label: '🎭 Drama', color: '#E74C3C' },
  { id: 'debate', label: '💬 Debate', color: '#F39C12' },
];

export default function PreLiveSetupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<'select' | 'permissions' | 'config'>('select');
  
  // Stream configuration
  const [streamType, setStreamType] = useState<StreamType>(null);
  const [streamTitle, setStreamTitle] = useState('');
  const [teamSize, setTeamSize] = useState<TeamSize>('1v1');
  
  // New: Stream labels and settings
  const [selectedLabels, setSelectedLabels] = useState<string[]>(['roast']);
  const [allowGifts, setAllowGifts] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);
  
  // Permissions
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    setCheckingPermissions(true);
    try {
      const cameraStatus = await Camera.getCameraPermissionsAsync();
      const micStatus = await Camera.getMicrophonePermissionsAsync();
      
      setCameraPermission(cameraStatus.granted);
      setMicPermission(micStatus.granted);
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setCheckingPermissions(false);
    }
  };

  const requestPermissions = async () => {
    setCheckingPermissions(true);
    try {
      const cameraResult = await Camera.requestCameraPermissionsAsync();
      const micResult = await Camera.requestMicrophonePermissionsAsync();
      
      setCameraPermission(cameraResult.granted);
      setMicPermission(micResult.granted);

      if (cameraResult.granted && micResult.granted) {
        setCurrentStep('config');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions');
    } finally {
      setCheckingPermissions(false);
    }
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleStreamTypeSelect = (type: StreamType) => {
    setStreamType(type);
    if (cameraPermission && micPermission) {
      setCurrentStep('config');
    } else {
      setCurrentStep('permissions');
    }
  };

  const handleStartStream = () => {
    if (!streamType) {
      Alert.alert('Error', 'Please select a stream type');
      return;
    }

    if (streamType === 'solo' && !streamTitle.trim()) {
      Alert.alert('Error', 'Please enter a stream title');
      return;
    }

    if (!cameraPermission || !micPermission) {
      Alert.alert('Error', 'Camera and microphone permissions are required');
      return;
    }

    // Navigate to appropriate screen
    if (streamType === 'battle') {
      router.push(`/matchmaking?teamSize=${teamSize}`);
    } else {
      // Start solo stream - navigate to broadcast with config
      const streamConfig = {
        title: streamTitle.trim(),
        labels: selectedLabels.join(','),
        allowGifts: allowGifts.toString(),
        allowChat: allowChat.toString(),
        slowMode: slowModeSeconds.toString(),
        autoStart: 'true',
      };
      
      const queryParams = new URLSearchParams(streamConfig).toString();
      router.push(`/(tabs)/live/broadcast?${queryParams}`);
    }
  };

  // Step 1: Select Stream Type
  if (currentStep === 'select') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Go Live</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.title}>Choose Your Stream Type</Text>
          <Text style={styles.subtitle}>Select how you want to go live</Text>

          {/* Solo Stream Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleStreamTypeSelect('solo')}
          >
            <View style={[styles.optionIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Ionicons name="person" size={40} color={theme.colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Solo Stream</Text>
              <Text style={styles.optionDescription}>
                Go live by yourself. Perfect for freestyle roasting, Q&A, or just hanging out with your audience.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Battle Stream Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleStreamTypeSelect('battle')}
          >
            <View style={[styles.optionIcon, { backgroundColor: `${theme.colors.error}20` }]}>
              <Ionicons name="flame" size={40} color={theme.colors.error} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Battle Stream</Text>
              <Text style={styles.optionDescription}>
                Enter a roast battle! Choose team size (1v1 to 5v5) and compete against opponents.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Step 2: Permissions Gate
  if (currentStep === 'permissions') {
    const hasAllPermissions = cameraPermission && micPermission;
    const hasSomePermissions = cameraPermission || micPermission;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentStep('select')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Permissions Required</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.permissionsIcon}>
            <Ionicons
              name={hasAllPermissions ? "checkmark-circle" : "warning"}
              size={80}
              color={hasAllPermissions ? theme.colors.success : theme.colors.warning}
            />
          </View>

          <Text style={styles.title}>
            {hasAllPermissions ? 'All Set!' : 'Permissions Needed'}
          </Text>
          <Text style={styles.subtitle}>
            {hasAllPermissions
              ? 'You have granted all required permissions.'
              : 'To go live, we need access to your camera and microphone.'}
          </Text>

          {/* Permission Status Cards */}
          <View style={styles.permissionCard}>
            <View style={styles.permissionRow}>
              <Ionicons
                name="camera"
                size={24}
                color={cameraPermission ? theme.colors.success : theme.colors.textSecondary}
              />
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionTitle}>Camera</Text>
                <Text style={styles.permissionDescription}>
                  {cameraPermission
                    ? 'Granted - You can show video'
                    : 'Needed - Your audience won\'t see you'}
                </Text>
              </View>
              <Ionicons
                name={cameraPermission ? "checkmark-circle" : "close-circle"}
                size={24}
                color={cameraPermission ? theme.colors.success : theme.colors.error}
              />
            </View>
          </View>

          <View style={styles.permissionCard}>
            <View style={styles.permissionRow}>
              <Ionicons
                name="mic"
                size={24}
                color={micPermission ? theme.colors.success : theme.colors.textSecondary}
              />
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionTitle}>Microphone</Text>
                <Text style={styles.permissionDescription}>
                  {micPermission
                    ? 'Granted - Your audience can hear you'
                    : 'Needed - Your audience won\'t hear you'}
                </Text>
              </View>
              <Ionicons
                name={micPermission ? "checkmark-circle" : "close-circle"}
                size={24}
                color={micPermission ? theme.colors.success : theme.colors.error}
              />
            </View>
          </View>

          {/* Action Buttons */}
          {!hasAllPermissions && (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={requestPermissions}
                disabled={checkingPermissions}
              >
                <Text style={styles.primaryButtonText}>
                  {checkingPermissions ? 'Checking...' : 'Grant Permissions'}
                </Text>
              </TouchableOpacity>

              {hasSomePermissions && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={openSettings}
                >
                  <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.secondaryButtonText}>Open Settings</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {hasAllPermissions && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setCurrentStep('config')}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // Step 3: Stream Configuration
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentStep('select')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {streamType === 'solo' ? 'Solo Stream' : 'Battle Setup'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {streamType === 'solo' ? (
          // Solo Stream Configuration
          <>
            <Text style={styles.title}>Configure Your Stream</Text>
            <Text style={styles.subtitle}>Set up your livestream before going live</Text>

            {/* Stream Title */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Stream Title</Text>
              <TextInput
                style={styles.input}
                placeholder="What's this stream about?"
                placeholderTextColor={theme.colors.textSecondary}
                value={streamTitle}
                onChangeText={setStreamTitle}
                maxLength={60}
              />
              <Text style={styles.charCount}>{streamTitle.length}/60</Text>
            </View>

            {/* Stream Labels */}
            <View style={styles.sectionContainer}>
              <Text style={styles.label}>Stream Labels</Text>
              <Text style={styles.labelHint}>Select up to 3 labels that describe your stream</Text>
              <View style={styles.labelsContainer}>
                {STREAM_LABELS.map((label) => {
                  const isSelected = selectedLabels.includes(label.id);
                  return (
                    <TouchableOpacity
                      key={label.id}
                      style={[
                        styles.labelChip,
                        isSelected && { backgroundColor: `${label.color}20`, borderColor: label.color },
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedLabels(selectedLabels.filter(l => l !== label.id));
                        } else if (selectedLabels.length < 3) {
                          setSelectedLabels([...selectedLabels, label.id]);
                        }
                      }}
                    >
                      <Text style={[
                        styles.labelChipText,
                        isSelected && { color: label.color },
                      ]}>
                        {label.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={label.color} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Interaction Settings */}
            <View style={styles.sectionContainer}>
              <Text style={styles.label}>Interaction Settings</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="gift-outline" size={22} color={theme.colors.gold} />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Allow Gifts</Text>
                    <Text style={styles.settingDesc}>Viewers can send you gifts</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.toggleButton, allowGifts && styles.toggleButtonActive]}
                  onPress={() => setAllowGifts(!allowGifts)}
                >
                  <View style={[styles.toggleCircle, allowGifts && styles.toggleCircleActive]} />
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="chatbubble-outline" size={22} color={theme.colors.primary} />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Allow Chat</Text>
                    <Text style={styles.settingDesc}>Viewers can send messages</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.toggleButton, allowChat && styles.toggleButtonActive]}
                  onPress={() => setAllowChat(!allowChat)}
                >
                  <View style={[styles.toggleCircle, allowChat && styles.toggleCircleActive]} />
                </TouchableOpacity>
              </View>

              {allowChat && (
                <View style={styles.slowModeContainer}>
                  <Text style={styles.slowModeLabel}>Slow Mode</Text>
                  <View style={styles.slowModeButtons}>
                    {[0, 5, 10, 30, 60].map((seconds) => (
                      <TouchableOpacity
                        key={seconds}
                        style={[
                          styles.slowModeButton,
                          slowModeSeconds === seconds && styles.slowModeButtonActive,
                        ]}
                        onPress={() => setSlowModeSeconds(seconds)}
                      >
                        <Text style={[
                          styles.slowModeButtonText,
                          slowModeSeconds === seconds && styles.slowModeButtonTextActive,
                        ]}>
                          {seconds === 0 ? 'Off' : `${seconds}s`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color={theme.colors.info} />
              <Text style={styles.infoText}>
                You can assign moderators during your stream by tapping on viewers and selecting "Make Moderator".
              </Text>
            </View>
          </>
        ) : (
          // Battle Stream Configuration
          <>
            <Text style={styles.title}>Battle Setup</Text>
            <Text style={styles.subtitle}>Choose your team size</Text>

            <View style={styles.teamSizeContainer}>
              {(['1v1', '2v2', '3v3', '4v4', '5v5'] as TeamSize[]).map((size) => {
                const isSelected = teamSize === size;
                const duration = {
                  '1v1': '3 min',
                  '2v2': '5 min',
                  '3v3': '8 min',
                  '4v4': '12 min',
                  '5v5': '15 min',
                }[size];

                return (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.teamSizeCard,
                      isSelected && styles.teamSizeCardSelected,
                    ]}
                    onPress={() => setTeamSize(size)}
                  >
                    <Text style={[
                      styles.teamSizeTitle,
                      isSelected && styles.teamSizeTextSelected,
                    ]}>
                      {size}
                    </Text>
                    <Text style={[
                      styles.teamSizeDuration,
                      isSelected && styles.teamSizeTextSelected,
                    ]}>
                      {duration}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.rulesCard}>
              <Text style={styles.rulesTitle}>Battle Rules</Text>
              <View style={styles.ruleItem}>
                <Ionicons name="timer-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.ruleText}>Match duration based on team size</Text>
              </View>
              <View style={styles.ruleItem}>
                <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.ruleText}>All players must be ready to start</Text>
              </View>
              <View style={styles.ruleItem}>
                <Ionicons name="trophy-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.ruleText}>Audience votes for the winner</Text>
              </View>
              <View style={styles.ruleItem}>
                <Ionicons name="repeat-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.ruleText}>Rematch available after battle ends</Text>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStartStream}
        >
          <Text style={styles.primaryButtonText}>
            {streamType === 'solo' ? 'Start Streaming' : 'Find Match'}
          </Text>
        </TouchableOpacity>
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
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xxl + 10,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  optionDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  permissionsIcon: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  permissionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionInfo: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  permissionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  permissionDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  primaryButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  charCount: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.info}20`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.info,
    marginLeft: theme.spacing.sm,
  },
  teamSizeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  teamSizeCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  teamSizeCardSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  teamSizeTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  teamSizeDuration: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  teamSizeTextSelected: {
    color: theme.colors.primary,
  },
  rulesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  rulesTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  ruleText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  // New styles for labels and interaction settings
  sectionContainer: {
    marginBottom: theme.spacing.xl,
  },
  labelHint: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xs,
  },
  labelChipText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginRight: theme.spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingInfo: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  settingDesc: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  slowModeContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.sm,
  },
  slowModeLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  slowModeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slowModeButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  slowModeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  slowModeButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.semibold,
  },
  slowModeButtonTextActive: {
    color: '#fff',
  },
});
