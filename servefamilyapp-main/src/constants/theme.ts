
import { Platform, useColorScheme, StyleSheet } from 'react-native';
import { useMemo } from 'react';

// ─── Brand Palette ─────────────────────────────────────────────────────────────
const brand = {
  blue: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#2563EB',  
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#172554',
  },
  green: {
    50:  '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#16A34A',  
    600: '#15803D',
    700: '#166534',
    800: '#14532D',
    900: '#052E16',
  },
  neutral: {
    0:   '#FFFFFF',
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    850: '#0F172A',
    900: '#0F172A',
    950: '#020617',
  },
  // Semantic
  success:  '#16A34A',
  warning:  '#F59E0B',
  error:    '#DC2626',
  info:     '#2563EB',
};

// ─── Typography Scale ──────────────────────────────────────────────────────────
const fontFamily = Platform.select({
  ios: {
    regular:  'System',        
    medium:   'System',
    semibold: 'System',
    bold:     'System',
    mono:     'Courier New',
  },
  android: {
    regular:  'sans-serif',    
    medium:   'sans-serif-medium',
    semibold: 'sans-serif-medium',
    bold:     'sans-serif',
    mono:     'monospace',
  },
  default: {
    regular:  'System',
    medium:   'System',
    semibold: 'System',
    bold:     'System',
    mono:     'monospace',
  },
})!;

export const typography = {
  size: {
    xs:   11,   // captions, legal
    sm:   12,   // labels, badges, helper text
    base: 14,   // body, list items
    md:   15,   // body emphasis, card titles
    lg:   17,   // section headers
    xl:   20,   // screen titles
    '2xl': 24,  // hero numbers / large titles
    '3xl': 28,  // display
    '4xl': 34,  // large display
  },
  // Weights — cross-platform safe
  weight: {
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
  },
  // Line heights
  leading: {
    tight:  1.2,
    snug:   1.35,
    normal: 1.5,
    loose:  1.75,
  },
  // Letter spacing
  tracking: {
    tight:  -0.3,
    normal: 0,
    wide:   0.3,
    wider:  0.6,
    widest: 1.2,
  },
  fontFamily,
} as const;

// ─── Spacing Scale ─────────────────────────────────────────────────────────────

export const space = {
  0:    0,
  0.5:  2,
  1:    4,
  1.5:  6,
  2:    8,
  2.5:  10,
  3:    12,
  4:    16,
  5:    20,
  6:    24,
  7:    28,
  8:    32,
  10:   40,
  12:   48,
  16:   64,
  20:   80,
  24:   96,
} as const;

// ─── Border Radius ─────────────────────────────────────────────────────────────
export const radius = {
  none: 0,
  xs:   2,
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// ─── Shadows ───────────────────────────────────────────────────────────────────
const makeShadow = (level: 'sm' | 'md' | 'lg' | 'xl') => {
  const shadows = {
    sm: {
      ios: { shadowColor: '#0D1220', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
      android: { elevation: 1 },
    },
    md: {
      ios: { shadowColor: '#0D1220', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
      android: { elevation: 3 },
    },
    lg: {
      ios: { shadowColor: '#0D1220', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 6 },
      android: { elevation: 6 },
    },
    xl: {
      ios: { shadowColor: '#0D1220', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 12 },
      android: { elevation: 12 },
    },
  };
  return Platform.OS === 'ios' ? shadows[level].ios : shadows[level].android;
};

export const shadows = {
  sm: makeShadow('sm'),
  md: makeShadow('md'),
  lg: makeShadow('lg'),
  xl: makeShadow('xl'),
} as const;

// ─── Color Tokens (Light) ──────────────────────────────────────────────────────
const lightColors = {
  // Canvas
  background:       brand.neutral[0],      // #FFFFFF
  backgroundAlt:    brand.neutral[50],     // #F7F9FC  page bg / screen bg
  surface:          brand.neutral[0],      // cards, sheets
  surfaceRaised:    brand.neutral[50],     // slightly elevated surfaces
  overlay:          'rgba(13,18,32,0.48)', // modal scrim

  // Text
  textPrimary:      brand.neutral[900],    // #0D1220  headings
  textSecondary:    brand.neutral[600],    // #454F63  body, paragraphs
  textTertiary:     brand.neutral[400],    // #8A96AB  captions, placeholders
  textDisabled:     brand.neutral[300],    // #B8C2D4
  textInverse:      brand.neutral[0],      // text on dark/primary bg
  textOnPrimary:    brand.neutral[0],      // text on blue button
  textOnAccent:     brand.neutral[0],      // text on green button

  // Brand
  primary:          brand.blue[500],       // #1A6FD4  main CTA, tint
  primaryLight:     brand.blue[100],       // #C7DFFA  soft bg
  primaryDark:      brand.blue[700],       // #10468A  pressed state
  accent:           brand.green[500],      // #34A829  secondary CTA
  accentLight:      brand.green[100],      // #C4F2BF  soft bg
  accentDark:       brand.green[700],      // #1C6C15  pressed state

  // Borders & Dividers
  border:           brand.neutral[200],    // #D9DFE9  default border
  borderFocus:      brand.blue[500],       // focus ring
  borderStrong:     brand.neutral[300],    // #B8C2D4  emphasized border
  divider:          brand.neutral[100],    // #EEF1F6  hairline divider

  // Interactive states
  hoverBg:          brand.neutral[50],
  pressedBg:        brand.neutral[100],
  selectedBg:       brand.blue[50],

  // Tab bar
  tabActive:        brand.blue[500],
  tabInactive:      brand.neutral[400],
  tabBackground:    brand.neutral[0],

  // Status
  success:          brand.green[500],
  successBg:        brand.green[50],
  successText:      brand.green[700],
  warning:          brand.warning,
  warningBg:        '#FFFBEB',
  warningText:      '#92400E',
  error:            brand.error,
  errorBg:          '#FEF2F2',
  errorText:        '#991B1B',
  info:             brand.blue[500],
  infoBg:           brand.blue[50],
  infoText:         brand.blue[700],

  // Gradient stops (use with LinearGradient)
  gradientPrimary:  [brand.blue[400],   brand.blue[600]]   as [string, string],
  gradientAccent:   [brand.green[400],  brand.green[600]]  as [string, string],
  gradientBrand:    [brand.blue[500],   brand.green[500]]  as [string, string],
  gradientSurface:  [brand.neutral[0],  brand.neutral[50]] as [string, string],
};

// ─── Color Tokens (Dark) ───────────────────────────────────────────────────────
const darkColors = {
  // Canvas
  background:       brand.neutral[950],    // #080D16  deepest bg
  backgroundAlt:    brand.neutral[900],    // #0D1220  screen bg
  surface:          brand.neutral[800],    // #1C2433  cards, sheets
  surfaceRaised:    brand.neutral[700],    // #2F3849  elevated cards
  overlay:          'rgba(0,0,0,0.64)',

  // Text
  textPrimary:      brand.neutral[50],     // #F7F9FC
  textSecondary:    brand.neutral[300],    // #B8C2D4
  textTertiary:     brand.neutral[500],    // #606C82
  textDisabled:     brand.neutral[600],    // #454F63
  textInverse:      brand.neutral[900],
  textOnPrimary:    brand.neutral[0],
  textOnAccent:     brand.neutral[0],

  // Brand
  primary:          brand.blue[400],       // #2979E8  brighter for dark bg
  primaryLight:     brand.blue[900],       // #061D45  soft bg on dark
  primaryDark:      brand.blue[300],       // #5999EE  pressed/lighter
  accent:           brand.green[400],      // #3DC42E
  accentLight:      brand.green[900],      // #083006
  accentDark:       brand.green[300],      // #55D14D

  // Borders & Dividers
  border:           brand.neutral[700],    // #2F3849
  borderFocus:      brand.blue[400],
  borderStrong:     brand.neutral[600],    // #454F63
  divider:          brand.neutral[800],    // #1C2433

  // Interactive states
  hoverBg:          brand.neutral[800],
  pressedBg:        brand.neutral[700],
  selectedBg:       brand.blue[900],

  // Tab bar
  tabActive:        brand.blue[400],
  tabInactive:      brand.neutral[500],
  tabBackground:    brand.neutral[850],

  // Status
  success:          brand.green[400],
  successBg:        brand.green[900],
  successText:      brand.green[300],
  warning:          '#FCD34D',
  warningBg:        '#1C1600',
  warningText:      '#FCD34D',
  error:            '#F87171',
  errorBg:          '#1F0A0A',
  errorText:        '#FCA5A5',
  info:             brand.blue[400],
  infoBg:           brand.blue[900],
  infoText:         brand.blue[300],

  // Gradients
  gradientPrimary:  [brand.blue[400],    brand.blue[700]]   as [string, string],
  gradientAccent:   [brand.green[400],   brand.green[700]]  as [string, string],
  gradientBrand:    [brand.blue[400],    brand.green[500]]  as [string, string],
  gradientSurface:  [brand.neutral[800], brand.neutral[900]] as [string, string],
};

// ─── Pre-built Style Shortcuts ─────────────────────────────────────────────────

const makeStyles = (colors: typeof lightColors) => {
  const isDark = colors === darkColors;

  return StyleSheet.create({
    // ── Text styles ──
    'text.display': {
      fontSize: typography.size['4xl'],
      fontWeight: typography.weight.bold,
      letterSpacing: typography.tracking.tight,
      lineHeight: typography.size['4xl'] * typography.leading.tight,
      color: colors.textPrimary,
    },
    'text.h1': {
      fontSize: typography.size['3xl'],
      fontWeight: typography.weight.bold,
      letterSpacing: typography.tracking.tight,
      lineHeight: typography.size['3xl'] * typography.leading.tight,
      color: colors.textPrimary,
    },
    'text.h2': {
      fontSize: typography.size['2xl'],
      fontWeight: typography.weight.semibold,
      letterSpacing: typography.tracking.tight,
      lineHeight: typography.size['2xl'] * typography.leading.snug,
      color: colors.textPrimary,
    },
    'text.h3': {
      fontSize: typography.size.xl,
      fontWeight: typography.weight.semibold,
      lineHeight: typography.size.xl * typography.leading.snug,
      color: colors.textPrimary,
    },
    'text.heading': {
      fontSize: typography.size.lg,
      fontWeight: typography.weight.semibold,
      lineHeight: typography.size.lg * typography.leading.snug,
      color: colors.textPrimary,
    },
    'text.title': {
      fontSize: typography.size.md,
      fontWeight: typography.weight.medium,
      lineHeight: typography.size.md * typography.leading.normal,
      color: colors.textPrimary,
    },
    'text.body': {
      fontSize: typography.size.base,
      fontWeight: typography.weight.regular,
      lineHeight: typography.size.base * typography.leading.normal,
      color: colors.textSecondary,
    },
    'text.bodyMd': {
      fontSize: typography.size.md,
      fontWeight: typography.weight.regular,
      lineHeight: typography.size.md * typography.leading.normal,
      color: colors.textSecondary,
    },
    'text.label': {
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
      letterSpacing: typography.tracking.wide,
      lineHeight: typography.size.sm * typography.leading.normal,
      color: colors.textSecondary,
    },
    'text.caption': {
      fontSize: typography.size.xs,
      fontWeight: typography.weight.regular,
      lineHeight: typography.size.xs * typography.leading.loose,
      color: colors.textTertiary,
    },
    'text.overline': {
      fontSize: typography.size.xs,
      fontWeight: typography.weight.semibold,
      letterSpacing: typography.tracking.widest,
      textTransform: 'uppercase' as const,
      color: colors.textTertiary,
    },
    'text.link': {
      fontSize: typography.size.base,
      fontWeight: typography.weight.medium,
      color: colors.primary,
      textDecorationLine: 'underline' as const,
    },
    'text.primary': {
      color: colors.primary,
    },
    'text.accent': {
      color: colors.accent,
    },
    'text.muted': {
      color: colors.textTertiary,
    },
    'text.error': {
      color: colors.error,
      fontSize: typography.size.sm,
    },

    // ── Layout ──
    'screen': {
      flex: 1,
      backgroundColor: colors.backgroundAlt,
    },
    'safeArea': {
      flex: 1,
      backgroundColor: colors.backgroundAlt,
    },
    'container': {
      paddingHorizontal: space[4],
    },
    'containerLg': {
      paddingHorizontal: space[6],
    },
    'row': {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    'rowBetween': {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    'center': {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },

    // ── Cards ──
    'card': {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: space[4],
      borderWidth: 1,
      borderColor: colors.border,
      ...(isDark ? {} : makeShadow('sm')),
    },
    'cardRaised': {
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.xl,
      padding: space[4],
      ...makeShadow('md'),
    },
    'cardFlat': {
      backgroundColor: colors.backgroundAlt,
      borderRadius: radius.xl,
      padding: space[4],
    },

    // ── Buttons ──
    'btn.primary': {
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      paddingVertical: space[3],
      paddingHorizontal: space[5],
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 48,  // accessibility minimum touch target
    },
    'btn.accent': {
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      paddingVertical: space[3],
      paddingHorizontal: space[5],
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 48,
    },
    'btn.outline': {
      backgroundColor: 'transparent',
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.primary,
      paddingVertical: space[3],
      paddingHorizontal: space[5],
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 48,
    },
    'btn.ghost': {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.lg,
      paddingVertical: space[3],
      paddingHorizontal: space[5],
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 48,
    },
    'btn.danger': {
      backgroundColor: colors.error,
      borderRadius: radius.lg,
      paddingVertical: space[3],
      paddingHorizontal: space[5],
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 48,
    },
    'btn.sm': {
      paddingVertical: space[2],
      paddingHorizontal: space[3],
      minHeight: 36,
    },
    'btn.lg': {
      paddingVertical: space[4],
      paddingHorizontal: space[6],
      minHeight: 56,
    },
    'btn.text.primary':   { fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.textOnPrimary },
    'btn.text.outline':   { fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.primary },
    'btn.text.ghost':     { fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.primary },

    // ── Inputs ──
    'input': {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      fontSize: typography.size.base,
      color: colors.textPrimary,
      minHeight: 48,
    },
    'inputFocused': {
      borderColor: colors.borderFocus,
      borderWidth: 2,
    },
    'inputError': {
      borderColor: colors.error,
    },
    'inputLabel': {
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
      color: colors.textSecondary,
      marginBottom: space[1],
    },

    // ── Badges & Pills ──
    'badge.primary': {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.full,
      paddingHorizontal: space[2],
      paddingVertical: space[0.5],
    },
    'badge.accent': {
      backgroundColor: colors.accentLight,
      borderRadius: radius.full,
      paddingHorizontal: space[2],
      paddingVertical: space[0.5],
    },
    'badge.success': {
      backgroundColor: colors.successBg,
      borderRadius: radius.full,
      paddingHorizontal: space[2],
      paddingVertical: space[0.5],
    },
    'badge.error': {
      backgroundColor: colors.errorBg,
      borderRadius: radius.full,
      paddingHorizontal: space[2],
      paddingVertical: space[0.5],
    },
    'badge.warning': {
      backgroundColor: colors.warningBg,
      borderRadius: radius.full,
      paddingHorizontal: space[2],
      paddingVertical: space[0.5],
    },
    'badge.text.primary': { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.primary },
    'badge.text.accent':  { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.accent },
    'badge.text.success': { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.successText },
    'badge.text.error':   { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.errorText },
    'badge.text.warning': { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.warningText },

    // ── Divider ──
    'divider': {
      height: 1,
      backgroundColor: colors.divider,
      width: '100%' as const,
    },
    'dividerVertical': {
      width: 1,
      backgroundColor: colors.divider,
    },

    // ── Avatar ──
    'avatar.sm': {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: colors.primaryLight,
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    'avatar.md': {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.primaryLight,
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    'avatar.lg': {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: colors.primaryLight,
      alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    'avatar.text.sm': { fontSize: 12, fontWeight: typography.weight.semibold, color: colors.primary },
    'avatar.text.md': { fontSize: 16, fontWeight: typography.weight.semibold, color: colors.primary },
    'avatar.text.lg': { fontSize: 22, fontWeight: typography.weight.semibold, color: colors.primary },

    // ── List items ──
    'listItem': {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      minHeight: 56,  // touch target
    },
    'listItemFirst': {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
    },
    'listItemLast': {
      borderBottomWidth: 0,
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
    },

    // ── Nav / Header ──
    'header': {
      backgroundColor: colors.primary,
      paddingHorizontal: space[4],
      paddingBottom: space[3],
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    'headerTitle': {
      fontSize: typography.size.lg,
      fontWeight: typography.weight.semibold,
      color: colors.textOnPrimary,
    },

    // ── Tab bar ──
    'tabBar': {
      backgroundColor: colors.tabBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    // ── Section header ──
    'sectionHeader': {
      paddingHorizontal: space[4],
      paddingVertical: space[2],
      backgroundColor: colors.backgroundAlt,
    },
    'sectionHeaderText': {
      fontSize: typography.size.xs,
      fontWeight: typography.weight.semibold,
      letterSpacing: typography.tracking.widest,
      textTransform: 'uppercase' as const,
      color: colors.textTertiary,
    },

    // ── Skeleton / loading ──
    'skeleton': {
      backgroundColor: colors.border,
      borderRadius: radius.md,
    },
  });
};

// ─── Theme Object ──────────────────────────────────────────────────────────────
export type ThemeColors = typeof lightColors;
export type ThemeStyles = ReturnType<typeof makeStyles>;

export interface Theme {
  isDark: boolean;
  colors: ThemeColors;
  space: typeof space;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
  styles: ThemeStyles;
  /** Shorthand aliases */
  bg: ThemeColors['background'];
  text: ThemeStyles;
  card: ThemeStyles['card'];
  shadow: typeof shadows;
}

const buildTheme = (isDark: boolean): Theme => {
  const colors = isDark ? darkColors : lightColors;
  const styles = makeStyles(colors);
  return {
    isDark,
    colors,
    space,
    radius,
    typography,
    shadows,
    styles,
    // Convenient shorthand
    bg:     colors.background,
    text:   styles,
    card:   styles['card'],
    shadow: shadows,
  };
};

export const lightTheme = buildTheme(false);
export const darkTheme  = buildTheme(true);

// ─── Hook ──────────────────────────────────────────────────────────────────────



export function useTheme(): Theme {
  return useMemo(() => buildTheme(false), []);
}

// ─── Convenience re-exports ────────────────────────────────────────────────────
export { brand as BrandPalette };
export default useTheme;