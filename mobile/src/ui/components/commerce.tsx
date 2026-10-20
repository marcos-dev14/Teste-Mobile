import { Image, type ImageProps } from 'expo-image'
import { View, type ImageStyle, type StyleProp } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'

import { formatMoney, formatRating } from '@/lib/format'

import { readableOn } from '../theme/contrast'
import { makeStyles, useStyles, useTheme } from '../theme/theme-provider'
import type { ColorTokens, TypographyVariant } from '../theme/tokens'
import { Icon } from './icon'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

// Preço ---------------------------------------------------------------------------

export function Price({
  cents,
  variant = 'price',
  color = 'text',
}: {
  cents: number
  variant?: Extract<TypographyVariant, 'price' | 'priceLarge' | 'bodyStrong' | 'body' | 'label'>
  color?: keyof ColorTokens
}) {
  return (
    <Text variant={variant} color={color} tabular>
      {formatMoney(cents)}
    </Text>
  )
}

// Badge ------------------------------------------------------------------------------

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const BADGE_COLORS: Record<BadgeTone, { bg: keyof ColorTokens; fg: keyof ColorTokens }> = {
  neutral: { bg: 'surfaceMuted', fg: 'textMuted' },
  accent: { bg: 'accentSoft', fg: 'accent' },
  success: { bg: 'successSoft', fg: 'success' },
  warning: { bg: 'warningSoft', fg: 'warning' },
  danger: { bg: 'dangerSoft', fg: 'danger' },
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const theme = useTheme()
  const styles = useStyles(styleFactory)
  const palette = BADGE_COLORS[tone]
  return (
    <View style={[styles.badge, { backgroundColor: theme.colors[palette.bg] }]}>
      <Text variant="overline" color={palette.fg} uppercase maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  )
}

// Avaliação ---------------------------------------------------------------------------

export function RatingStars({ rating, showValue = true }: { rating: number; showValue?: boolean }) {
  const styles = useStyles(styleFactory)
  const stars = [1, 2, 3, 4, 5].map((position) =>
    rating >= position ? 'star' : rating >= position - 0.5 ? 'star-half' : 'star-outline',
  )
  return (
    <View
      style={styles.rating}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Avaliação ${formatRating(rating)} de 5`}
    >
      {stars.map((name, index) => (
        <Icon key={index} name={name as 'star'} size={13} color="star" />
      ))}
      {showValue ? (
        <Text variant="caption" color="textMuted" style={styles.ratingValue}>
          {formatRating(rating)}
        </Text>
      ) : null}
    </View>
  )
}

// Amostra de cor -------------------------------------------------------------------------

export interface ColorSwatchProps {
  name: string
  hex: string
  selected?: boolean
  soldOut?: boolean
  onPress?: () => void
  size?: number
}

export function ColorSwatch({ name, hex, selected, soldOut, onPress, size = 30 }: ColorSwatchProps) {
  const styles = useStyles(styleFactory)
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.92}
      accessibilityRole="radio"
      accessibilityLabel={soldOut ? `${name}, esgotado` : name}
      accessibilityState={{ selected: !!selected, checked: !!selected }}
      style={styles.swatchTouch}
    >
      <View style={[styles.swatchRing, selected && styles.swatchRingSelected]}>
        <View
          style={[
            styles.swatch,
            { width: size, height: size, backgroundColor: hex },
            soldOut && styles.swatchSoldOut,
          ]}
        >
          {selected ? <Icon name="checkmark" size={16} rawColor={readableOn(hex)} /> : null}
          {soldOut && !selected ? <View style={[styles.slash, { width: size * 1.2 }]} /> : null}
        </View>
      </View>
    </PressableScale>
  )
}

// Imagem de produto ---------------------------------------------------------------------

export interface ProductImageProps extends Pick<ImageProps, 'recyclingKey' | 'priority'> {
  uri: string
  accessibilityLabel?: string
  aspectRatio?: number
  style?: StyleProp<ImageStyle>
  rounded?: boolean
}

export function ProductImage({ uri, accessibilityLabel, aspectRatio, style, rounded = true, ...rest }: ProductImageProps) {
  const theme = useTheme()
  const reduceMotion = useReducedMotion()
  return (
    <Image
      source={{ uri }}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={reduceMotion ? 0 : theme.motion.duration.base}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          width: '100%',
          aspectRatio: aspectRatio ?? theme.layout.productImageAspect,
          backgroundColor: theme.colors.imagePlaceholder,
          borderRadius: rounded ? theme.radius.md : 0,
        },
        style,
      ]}
      {...rest}
    />
  )
}

const styleFactory = makeStyles((t) => ({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: t.space.xs,
    paddingVertical: 3,
    borderRadius: t.radius.pill,
  },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  ratingValue: { marginLeft: t.space.xxs },
  swatchTouch: {
    minWidth: t.layout.minTouch,
    minHeight: t.layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRing: {
    padding: 3,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchRingSelected: { borderColor: t.colors.primary },
  swatch: {
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  swatchSoldOut: { opacity: 0.5 },
  slash: {
    position: 'absolute',
    height: 2,
    backgroundColor: t.colors.text,
    transform: [{ rotate: '-45deg' }],
  },
}))
