export const theme = {
  colors: {
    // Dark theme primary colors
    background: '#0C0C0C',
    surface: '#1A1A1A',
    surfaceLight: '#252525',
    
    // Red accent (Roast Live brand)
    primary: '#DC143C',
    primaryLight: '#FF1744',
    primaryDark: '#B71C1C',
    
    // Text colors
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textDisabled: '#666666',
    
    // Status colors
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
    
    // UI elements
    border: '#333333',
    divider: '#2A2A2A',
    overlay: 'rgba(0, 0, 0, 0.7)',
    
    // Live indicator
    live: '#FF0000',
  },
  spacing: {
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
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    weights: {
      normal: '400' as '400',
      medium: '500' as '500',
      semibold: '600' as '600',
      bold: '700' as '700',
    },
  },
};
