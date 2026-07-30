import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import NavIcon from './NavIcon';

const ICONS = {
  Home: 'home',
  Attendance: 'attendance',
  Feed: 'feed',
  Chat: 'chat',
  Profile: 'profile',
};

export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: isDark ? 'rgba(18,33,49,0.92)' : 'rgba(255,255,255,0.95)',
            borderColor: colors.outlineVariant + '55',
            width: Math.min(width - 24, 560),
          },
          Platform.select({
            android: { elevation: 6 },
            ios: {
              shadowColor: colors.glowShadow,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: isDark ? 0.15 : 0.06,
              shadowRadius: 16,
            },
          }),
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () =>
            navigation.emit({ type: 'tabLongPress', target: route.key });

          const icon = ICONS[route.name] || 'home';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.75}
              style={[styles.item, focused && { backgroundColor: colors.primaryContainer + '18' }]}
            >
              <NavIcon
                name={icon}
                size={21}
                color={focused ? colors.primaryContainer : colors.onSurfaceVariant}
                active={focused}
                activeColor={colors.primaryContainer}
              />
              {!compact ? (
                <Text
                  style={[styles.label, { color: focused ? colors.primaryContainer : colors.textMuted }, focused && styles.labelActive]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginHorizontal: spacing.md,
    gap: 4,
    borderWidth: 1,
  },
  item: {
    flex: 1,
    minWidth: 48,
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: { fontWeight: '600', fontSize: 10.5, lineHeight: 13 },
  labelActive: { fontWeight: '800' },
});
