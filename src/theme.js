// Цагаан, цэвэрхэн SaaS палитр
export const colors = {
  bg: '#ffffff',
  bgAlt: '#f9fafb',
  surface: '#ffffff',
  surfaceAlt: '#f4f6f9',
  surfaceHi: '#f1f3f7',
  primary: '#4f6ef7',
  primaryDark: '#3b57d6',
  primarySoft: '#eff4ff',
  accent: '#6366f1',
  success: '#10b981',
  successDark: '#059669',
  successSoft: '#ecfdf5',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#111827',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  border: '#eef0f4',
  borderHi: '#e5e7eb',
};

export const gradients = {
  header: ['#ffffff', '#ffffff'],
  primary: ['#4f6ef7', '#4f6ef7'],
  success: ['#10b981', '#10b981'],
  danger: ['#ef4444', '#ef4444'],
  warning: ['#f59e0b', '#f59e0b'],
  dark: ['#ffffff', '#f9fafb'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const shadow = {
  sm: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  md: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  glow: {
    shadowColor: '#4f6ef7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '800', color: colors.text },
  h3: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
};
