import { darkColors, lightColors, makeGradients, makeShadow } from './tokens';

export { darkColors, lightColors, makeGradients, makeShadow };

// Static default (dark = үндсэн горим). Migration хийгдээгүй screen-үүд үүнийг ашиглана.
// Runtime dark/light солих бол useTheme() ашиглана уу.
export const colors = darkColors;

export const gradients = makeGradients(darkColors);

export const shadow = makeShadow(darkColors, true);

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
  full: 999,
};

export const typography = {
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 21, lineHeight: 27, fontWeight: '800', color: colors.text, letterSpacing: -0.25 },
  h3: { fontSize: 17, lineHeight: 23, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  muted: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
};

export const layout = {
  compactBreakpoint: 390,
  tabletBreakpoint: 768,
  contentMaxWidth: 960,
  formMaxWidth: 640,
  minTouchTarget: 44,
};
