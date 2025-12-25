import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'full' | 'icon';
}

export default function Logo({ size = 'medium', variant = 'full' }: LogoProps) {
  const sizes = {
    small: {
      container: 100,
      text: 16,
      iconSize: 20,
    },
    medium: {
      container: 140,
      text: 22,
      iconSize: 28,
    },
    large: {
      container: 180,
      text: 28,
      iconSize: 36,
    },
  };

  const currentSize = sizes[size];

  if (variant === 'icon') {
    return (
      <View style={[styles.iconContainer, { width: currentSize.iconSize * 1.5, height: currentSize.iconSize * 1.5 }]}>
        <Text style={[styles.iconText, { fontSize: currentSize.iconSize }]}>🔥</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: currentSize.container / 2 }]}>
      <View style={styles.flameIcon}>
        <Text style={[styles.flame, { fontSize: currentSize.iconSize }]}>🔥</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.roastText, { fontSize: currentSize.text }]}>ROAST</Text>
        <Text style={[styles.liveText, { fontSize: currentSize.text * 0.8 }]}>LIVE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameIcon: {
    marginRight: 8,
  },
  flame: {
    lineHeight: undefined,
  },
  textContainer: {
    justifyContent: 'center',
  },
  roastText: {
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 2,
    lineHeight: undefined,
  },
  liveText: {
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 1.5,
    marginTop: -4,
    lineHeight: undefined,
  },
  iconContainer: {
    backgroundColor: `${theme.colors.primary}20`,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    lineHeight: undefined,
  },
});
