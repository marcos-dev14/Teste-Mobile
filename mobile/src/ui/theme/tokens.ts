/**
 * Design tokens "Vesti" — fonte única de valores visuais do app.
 * Nenhuma cor, fonte, raio ou espaçamento literal deve existir fora deste arquivo.
 */

export interface ColorTokens {
  bg: string
  surface: string
  surfaceMuted: string
  border: string
  borderStrong: string
  text: string
  textMuted: string
  primary: string
  onPrimary: string
  accent: string
  onAccent: string
  accentSoft: string
  success: string
  successSoft: string
  warning: string
  warningSoft: string
  danger: string
  dangerSoft: string
  star: string
  overlay: string
  imagePlaceholder: string
}

export const lightColors: ColorTokens = {
  bg: '#F6F3EE',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEAE2',
  border: '#E5DFD5',
  borderStrong: '#CFC6B8',
  text: '#1A1714',
  textMuted: '#655D54',
  primary: '#1A1714',
  onPrimary: '#FFFFFF',
  accent: '#A84B29',
  onAccent: '#FFFFFF',
  accentSoft: '#F6E3DA',
  success: '#2B6449',
  successSoft: '#E1EFE7',
  warning: '#7F5300',
  warningSoft: '#F8ECD3',
  danger: '#B3261E',
  dangerSoft: '#F9E1DE',
  star: '#B07A1E',
  overlay: 'rgba(26, 23, 20, 0.45)',
  imagePlaceholder: '#ECE6DD',
}

export const darkColors: ColorTokens = {
  bg: '#141210',
  surface: '#1E1B18',
  surfaceMuted: '#28241F',
  border: '#36312B',
  borderStrong: '#4A433B',
  text: '#F3EEE7',
  textMuted: '#B3AA9F',
  primary: '#F3EEE7',
  onPrimary: '#141210',
  accent: '#E58A63',
  onAccent: '#141210',
  accentSoft: '#3A251C',
  success: '#7BC4A0',
  successSoft: '#1D2E26',
  warning: '#E3B45C',
  warningSoft: '#33291A',
  danger: '#F2877E',
  dangerSoft: '#3A1F1D',
  star: '#E3B45C',
  overlay: 'rgba(0, 0, 0, 0.6)',
  imagePlaceholder: '#26221E',
}

export const fonts = {
  display: 'Fraunces_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const

export const typography = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  headline: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2 },
  price: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
  priceLarge: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30 },
} as const

export type TypographyVariant = keyof typeof typography

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const

export const layout = {
  /** Área mínima de toque (WCAG / Material). */
  minTouch: 44,
  buttonHeight: 54,
  fieldHeight: 52,
  tabBarHeight: 60,
  gutter: 16,
  gutterWide: 24,
  maxContentWidth: 720,
  /** Proporção das imagens de produto (largura / altura). */
  productImageAspect: 4 / 5,
} as const

/**
 * Paleta da marca (logo, ícone, splash). Fonte dos assets: `assets/brand/build-brand.js`.
 * Na interface, use as cores semânticas acima; estas servem a superfícies de marca.
 */
export const brand = {
  ink: '#1A1714',
  cream: '#F6F3EE',
  clay: '#A84B29',
  clayBright: '#C8643C',
  clayLight: '#E58A63',
} as const

/** Cores fixas, iguais nos dois temas, exigidas por conteúdo de terceiros. */
export const fixedColors = {
  /** Fundo do QR Code do Pix: leitores de QR precisam de fundo claro, também no tema escuro. */
  qrBackground: '#FFFFFF',
} as const

export const motion = {
  duration: { fast: 120, base: 180, slow: 240 },
  spring: {
    snappy: { damping: 18, stiffness: 320, mass: 0.6 },
  },
  pressScale: 0.97,
  /** Desaceleração natural (cúbica "ease-out quint"), usada nas entradas. */
  easeOut: [0.22, 1, 0.36, 1] as const,
  /** Entrada de telas: conteúdo real aparece com fade e sobe poucos dp, em grupos. Discreta e curta. */
  entrance: {
    duration: 220,
    offsetY: 6,
    stagger: 30,
    /** Teto de passos escalonados: a entrada inteira termina em ≤ ~370 ms. */
    maxSteps: 5,
    /** Movimento reduzido: só um fade curto, sem deslocamento. */
    reducedDuration: 120,
  },
} as const

export const elevation = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const
