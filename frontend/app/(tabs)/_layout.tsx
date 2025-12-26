import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Image } from 'react-native';
import { usePathname } from 'expo-router';
import CustomTabBar from '../../components/navigation/CustomTabBar';
import { theme } from '../../constants/theme';

export default function TabsLayout() {
  const pathname = usePathname();
  
  // Screens where tab bar should be hidden
  const hideTabBarRoutes = [
    '/live',
    '/profile',
    '/profile/settings',
    '/profile/edit',
    '/profile/wallet',
    '/profile/vip-clubs',
    '/profile/stream-dashboard',
    '/profile/stream-settings',
    '/profile/moderators',
    '/profile/gift-store',
    '/profile/change-password',
    '/profile/blocked',
  ];
  
  const shouldHideTabBar = hideTabBarRoutes.some(route => pathname?.includes(route));

  return (
    <View style={styles.container}>
      <Tabs
        tabBar={(props) => shouldHideTabBar ? null : <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
        }}
        sceneContainerStyle={styles.sceneContainer}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            // Custom header with logo/text
            headerShown: true,
            headerTitle: () => (
              <View style={styles.headerLogoContainer}>
                <Text style={styles.headerLogoText}>🔥 ROAST LIVE</Text>
              </View>
            ),
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerShadowVisible: false,
          }}
        />
        <Tabs.Screen
          name="live"
          options={{
            title: 'Live',
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: 'Inbox',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  sceneContainer: {
    backgroundColor: theme.colors.background,
  },
  headerLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
});
