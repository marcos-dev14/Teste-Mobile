import { Text as RNText, type TextProps as RNTextProps } from 'react-native'

import { useTheme } from '../theme/theme-provider'
import type { ColorTokens, TypographyVariant } from '../theme/tokens'

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant
  color?: keyof ColorTokens
  align?: 'left' | 'center' | 'right'
  uppercase?: boolean
  tabular?: boolean
}

export function Text({
  variant = 'body',
  color = 'text',
  align,
  uppercase,
  tabular,
  style,
  maxFontSizeMultiplier = 1.6,
  ...rest
}: TextProps) {
  const theme = useTheme()
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        theme.typography[variant],
        { color: theme.colors[color] },
        align && { textAlign: align },
        uppercase && { textTransform: 'uppercase' },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
      {...rest}
    />
  )
}
