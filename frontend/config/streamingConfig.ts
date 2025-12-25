import Constants from 'expo-constants';

/**
 * Streaming Configuration
 * - Expo Go: Demo mode with fake streaming
 * - Development Build: Real Agora streaming
 */

export const isExpoGo = () => {
  return Constants.appOwnership === 'expo';
};

export const isDevelopmentBuild = () => {
  return Constants.appOwnership === 'standalone' || !isExpoGo();
};

export const STREAMING_MODE = isExpoGo() ? 'DEMO' : 'REAL';

export const streamingConfig = {
  mode: STREAMING_MODE,
  isDemo: STREAMING_MODE === 'DEMO',
  isReal: STREAMING_MODE === 'REAL',
  
  // Demo mode settings
  demo: {
    enabled: true,
    showWatermark: true,
    watermarkText: 'DEMO MODE - Build app for real streaming',
  },
  
  // Real Agora settings
  agora: {
    enabled: STREAMING_MODE === 'REAL',
    appId: process.env.EXPO_PUBLIC_AGORA_APP_ID || '',
  },
};

// Log current mode
console.log(`🎥 Streaming Mode: ${STREAMING_MODE} (Expo Go: ${isExpoGo()})`);
