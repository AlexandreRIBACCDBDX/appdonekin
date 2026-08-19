// DoneKin design tokens.
//
// Direction: dark, gradient-accented — a single deliberate night look (no
// light counterpart). Backgrounds sit near-black with a violet cast; a
// blue → purple → pink gradient (`gradients.primary`) carries primary
// actions and highlights. Gold stays reserved for Dones, the in-app
// currency, unchanged from the previous ember/gold direction.
//
// Rectangular vs. rounded is still a deliberate vocabulary: editable fields
// use `radius.field` (a real border, just gently rounded) so they read as
// "you can type here," while status pills/badges/buttons stay fully rounded
// (`radius.full`) so the two never get confused at a glance.

export const palette = {
  white: '#FFFFFF',
  black: '#0B0B0F',

  ink900: '#241A16',
  ink800: '#2E211C',
  ink700: '#4A3A34',
  ink600: '#5F4C44',
  ink500: '#8B7A72',
  ink400: '#A8988F',
  ink300: '#C7BAB2',
  ink200: '#E3D2C2',
  ink100: '#F0E4DA',
  ink50: '#FFF9F3',

  ember600: '#E8481F',
  ember500: '#FF5A36',
  ember100: '#FFE4D9',

  gold500: '#F5A623',
  gold100: '#FEF0DA',

  green600: '#2FAE6D',
  green100: '#DCFCE7',

  red600: '#DC2626',
  red100: '#FEE2E2',

  // Night palette — the dark gradient direction.
  night900: '#0A0912',
  night800: '#161225',
  night700: '#241F3A',
  nightBorder: 'rgba(255,255,255,0.07)',

  blue500: '#4F6BFB',
  violet500: '#9457F7',
  violetMuted: 'rgba(148,87,247,0.16)',
  pink500: '#EF4ECF',
  lavender: '#CDBDFF',

  mist300: '#9793AD',
  mist500: '#716D87',

  flame500: '#FF7A45',

  // Tinted-pill pairs for 3-tier urgency badges (DueCountdown): plenty of
  // time reuses violetMuted/lavender above; these cover the other two tiers.
  goldMuted: 'rgba(245,166,35,0.16)',
  redMuted: 'rgba(220,38,38,0.16)',
} as const;

export const lightColors = {
  background: palette.ink50,
  surface: palette.white,
  surfaceMuted: palette.ink100,
  border: palette.ink200,

  textPrimary: palette.ink900,
  textSecondary: palette.ink500,
  textMuted: palette.ink400,
  textOnPrimary: palette.white,

  primary: palette.ember500,
  primaryMuted: palette.ember100,

  dones: palette.gold500,
  donesMuted: palette.gold100,

  success: palette.green600,
  successMuted: palette.green100,
  danger: palette.red600,
  dangerMuted: palette.red100,
};

export const darkColors = {
  background: palette.night900,
  surface: palette.night800,
  surfaceMuted: palette.night700,
  border: palette.nightBorder,

  textPrimary: palette.white,
  textSecondary: palette.mist300,
  textMuted: palette.mist500,
  textOnPrimary: palette.white,

  primary: palette.violet500,
  primaryMuted: palette.violetMuted,

  dones: palette.gold500,
  donesMuted: palette.goldMuted,

  success: palette.green600,
  successMuted: palette.night700,
  danger: palette.red600,
  dangerMuted: palette.night700,
};

export type ThemeColors = typeof lightColors;

// Gradient stops for LinearGradient — the app's one accent gradient.
export const gradients = {
  primary: [palette.blue500, palette.violet500, palette.pink500] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  field: 14,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '700' as const, lineHeight: 38 },
  title: { fontSize: 24, fontWeight: '700' as const, lineHeight: 30 },
  heading: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
} as const;

export const shadow = {
  sm: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;
