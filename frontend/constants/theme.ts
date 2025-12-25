export const theme = {
  colors: {
    // Primary colors
    primary: '#DC143C', // Crimson red for roast theme
    primaryLight: 'rgba(220, 20, 60, 0.15)',
    primaryDark: '#B01030',

    // Background colors
    background: '#0A0A0A',
    surface: '#1A1A1A',
    surfaceLight: '#2A2A2A',

    // Text colors
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textDisabled: '#606060',

    // Accent colors
    live: '#FF0000',
    success: '#00C853',
    warning: '#FFB300',
    error: '#FF5252',
    gold: '#FFD700',
    vip: '#9C27B0',

    // Border colors
    border: '#333333',
    borderLight: '#444444',
  },

  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  typography: {
    sizes: {
      xs: 10,
      sm: 12,
      base: 14,
      lg: 18,
      xl: 22,
      xxl: 28,
      xxxl: 36,
    },
    weights: {
      regular: '400' as '400',
      medium: '500' as '500',
      semibold: '600' as '600',
      bold: '700' as '700',
    },
  },
};
