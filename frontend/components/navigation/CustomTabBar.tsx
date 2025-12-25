import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_WIDTH = SCREEN_WIDTH - 40;

type TabIconName = 'home' | 'radio' | 'chatbubbles' | 'person';

interface TabConfig {
  name: string;
  icon: TabIconName;
  label: string;
}

const tabs: TabConfig[] = [
  { name: 'home', icon: 'home', label: 'Home' },
  { name: 'live', icon: 'radio', label: 'Live' },
  { name: 'inbox', icon: 'chatbubbles', label: 'Inbox' },
  { name: 'profile', icon: 'person', label: 'Profile' },
];

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function TabBarButton({
  route,
  index,
  state,
  descriptors,
  navigation,
  tabConfig,
}: {
  route: any;
  index: number;
  state: any;
  descriptors: any;
  navigation: any;
  tabConfig: TabConfig;
}) {
  const isFocused = state.index === index;
  const { options } = descriptors[route.key];

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const onLongPress = () => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(isFocused ? 1.15 : 1, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withSpring(
        isFocused ? 'rgba(220, 20, 60, 0.15)' : 'transparent',
        { damping: 15, stiffness: 150 }
      ),
    };
  });

  const iconName = isFocused ? tabConfig.icon : (`${tabConfig.icon}-outline` as any);
  const iconColor = isFocused ? theme.colors.primary : theme.colors.textSecondary;

  return (
    <AnimatedTouchable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tabButton, animatedContainerStyle]}
      activeOpacity={0.7}
    >
      <Animated.View style={animatedIconStyle}>
        <Ionicons name={iconName} size={24} color={iconColor} />
      </Animated.View>
      {isFocused && (
        <Animated.Text
          style={[
            styles.tabLabel,
            { color: iconColor },
          ]}
        >
          {tabConfig.label}
        </Animated.Text>
      )}
    </AnimatedTouchable>
  );
}

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: CustomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <BlurView
        intensity={80}
        tint="dark"
        style={styles.blurContainer}
      >
        <View style={styles.tabBarInner}>
          {state.routes.map((route: any, index: number) => {
            const tabConfig = tabs.find(t => t.name === route.name);
            if (!tabConfig) return null;

            return (
              <TabBarButton
                key={route.key}
                route={route}
                index={index}
                state={state}
                descriptors={descriptors}
                navigation={navigation}
                tabConfig={tabConfig}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  blurContainer: {
    width: '100%',
    maxWidth: TAB_BAR_WIDTH,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
