import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  colors: typeof darkColors;
}

const darkColors = {
  // Primary colors
  primary: '#DC143C',
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
  info: '#2196F3',

  // Admin role colors
  headAdmin: '#DC143C',
  admin: '#FF5722',
  moderator: '#9C27B0',
  support: '#2196F3',

  // Border colors
  border: '#333333',
  borderLight: '#444444',
};

const lightColors = {
  // Primary colors
  primary: '#DC143C',
  primaryLight: 'rgba(220, 20, 60, 0.1)',
  primaryDark: '#B01030',

  // Background colors
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceLight: '#FAFAFA',

  // Text colors
  text: '#000000',
  textSecondary: '#666666',
  textDisabled: '#999999',

  // Accent colors
  live: '#FF0000',
  success: '#00C853',
  warning: '#FFB300',
  error: '#FF5252',
  gold: '#FFD700',
  vip: '#9C27B0',
  info: '#2196F3',

  // Admin role colors
  headAdmin: '#DC143C',
  admin: '#FF5722',
  moderator: '#9C27B0',
  support: '#2196F3',

  // Border colors
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeMode>(systemColorScheme === 'dark' ? 'dark' : 'light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
