import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme';
import NavIcon from './NavIcon';

const ICONS = {
  Home: 'home',
  Attendance: 'attendance',
  Chat: 'chat',
  Profile: 'profile',
};

export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
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

          if (focused) {
            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.85}
                style={styles.itemActive}
              >
                <NavIcon name={icon} size={20} color={colors.primary} active />
                <Text style={styles.labelActive} numberOfLines={1}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: false }}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={styles.item}
            >
              <NavIcon name={icon} size={22} color={colors.textFaint} />
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
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginHorizontal: spacing.lg,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
    }),
  },
  item: {
    width: 52,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  labelActive: { color: colors.primary, fontWeight: '800', fontSize: 14 },
});
