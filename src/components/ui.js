import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing, shadow, gradients } from '../theme';

export function Card({ children, style, elevated = true, borderless = false }) {
  return (
    <View style={[styles.card, borderless && styles.cardBorderless, elevated && shadow.sm, style]}>
      {children}
    </View>
  );
}

const GRADIENT_MAP = {
  primary: gradients.primary,
  success: gradients.success,
  danger: gradients.danger,
  warning: gradients.warning,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  style,
  disabled,
}) {
  const grad = GRADIENT_MAP[variant];
  const sizeStyle = size === 'sm' ? styles.btnSm : size === 'lg' ? styles.btnLg : styles.btnMd;
  const textSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;
  // Градиент товчинд цагаан, ghost/идэвхгүйд бол theme өнгө
  const fg = grad && !disabled ? '#fff' : disabled ? colors.textFaint : colors.primary;

  const content = (
    <View style={styles.btnRow}>
      {icon ? <Text style={[styles.btnIcon, { fontSize: textSize + 1, color: fg }]}>{icon}</Text> : null}
      <Text style={[styles.btnText, { fontSize: textSize, color: fg }]}>{title}</Text>
    </View>
  );

  if (grad && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[style]}>
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, sizeStyle, shadow.sm]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        sizeStyle,
        { backgroundColor: disabled ? colors.surfaceAlt : colors.surfaceHi },
        variant === 'ghost'&& styles.btnGhost,
        style,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.85}
    >
      {content}
    </TouchableOpacity>
  );
}

export function Field({ label, style, variant, labelStyle, inputStyle, ...props }) {
  const [focused, setFocused] = useState(false);
  const isGlass = variant === 'glass';
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label ? (
        <Text style={[styles.label, isGlass && styles.labelGlass, labelStyle]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={isGlass ? 'rgba(255,255,255,0.45)' : colors.textFaint}
        style={[
          styles.input,
          isGlass && styles.inputGlass,
          focused && (isGlass ? styles.inputGlassFocused : styles.inputFocused),
          inputStyle,
        ]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
}

export function Badge({ text, color = colors.primary }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '66'}]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

// Градиент толгой — цагаан цэвэрхэн
export function ScreenHeader({ title, subtitle, right, icon, back }) {
  const navigation = useNavigation();
  const showBack = back === undefined ? navigation.canGoBack() : back;
  return (
    <View style={styles.header}>
      <SafeAreaView edges={['top']}>
        <View style={styles.headerRow}>
          <View style={[styles.headerLeft, { flex: 1, minWidth: 0 }]}>
            {showBack ? (
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
                <Text style={styles.backIcon}>‹</Text>
              </TouchableOpacity>
            ) : icon ? (
              <Text style={styles.headerIcon}>{icon}</Text>
            ) : null}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.headerSub} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
          {right ? <View style={styles.headerRight}>{right}</View> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

export function StatCard({ label, value, color = colors.primary, icon }) {
  return (
    <View style={[styles.statCard, shadow.sm]}>
      {icon ? <Text style={styles.statIcon}>{icon}</Text> : null}
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children, style }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

export function EmptyState({ text }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyIconDot}>·</Text>
      </View>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// Хөвөгч дугуй товч (толгой дээрх)
export function HeaderButton({ title, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.headerBtn} onPress={onPress} activeOpacity={0.8}>
      {icon ? <Text style={styles.headerBtnIcon}>{icon}</Text> : null}
      {title ? <Text style={styles.headerBtnText}>{title}</Text> : null}
    </TouchableOpacity>
  );
}

export function formatMNT(value) {
  const n = Math.round(Number(value) || 0);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '₮';
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBorderless: {
    borderWidth: 0,
    backgroundColor: colors.surface,
  },
  btn: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  btnMd: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  btnLg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderHi,
  },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnIcon: { color: '#fff'},
  btnText: { color: '#fff', fontWeight: '700'},
  label: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.bg,
  },
  labelGlass: { color: 'rgba(255,255,255,0.85)'},
  inputGlass: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 0,
    color: '#fff',
  },
  inputGlassFocused: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '700'},
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerRight: { flexShrink: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.xs, maxWidth: '58%' },
  headerIcon: { fontSize: 30 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backIcon: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: -4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '500'},
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '900'},
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyIconDot: { color: colors.textFaint, fontSize: 36, lineHeight: 40, fontWeight: '300'},
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 14 },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerBtnIcon: { fontSize: 15 },
  headerBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
