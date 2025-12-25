import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface MultiGuestLayoutProps {
  guestCount: number;
  children: React.ReactNode[];
}

export default function MultiGuestLayout({ guestCount, children }: MultiGuestLayoutProps) {
  const getLayout = () => {
    if (guestCount === 1) {
      // Solo host - fullscreen
      return styles.layout1;
    } else if (guestCount === 2) {
      // Host + 1 guest - split view
      return styles.layout2;
    } else if (guestCount <= 4) {
      // 2x2 grid
      return styles.layout4;
    } else if (guestCount <= 6) {
      // 2x3 grid
      return styles.layout6;
    } else {
      // 3x3 grid (max 9 guests)
      return styles.layout9;
    }
  };

  return <View style={[styles.container, getLayout()]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  layout1: {
    // Single fullscreen
  },
  layout2: {
    // Split view
  },
  layout4: {
    // 2x2 grid
  },
  layout6: {
    // 2x3 grid
  },
  layout9: {
    // 3x3 grid
  },
});