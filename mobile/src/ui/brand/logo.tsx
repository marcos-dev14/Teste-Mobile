import { Image, View, type StyleProp, type ViewStyle } from 'react-native'

import { useTheme } from '../theme/theme-provider'
import { brandImages, lockupLayout } from './brand-assets'

export interface LogoProps {
  /** Largura do símbolo em dp; o wordmark acompanha a proporção da marca. */
  size?: number
  /** `full`: símbolo + nome. `symbol`: só o símbolo (espaços apertados). */
  variant?: 'full' | 'symbol'
  style?: StyleProp<ViewStyle>
}

/** Logo Vesti com a variante de cor do tema atual. */
export function Logo({ size = 28, variant = 'full', style }: LogoProps) {
  const theme = useTheme()
  const images = brandImages[theme.scheme]
  const layout = lockupLayout(size)

  if (variant === 'symbol') {
    return (
      <View style={style} accessible accessibilityRole="image" accessibilityLabel="Vesti">
        <Image source={images.symbol} style={{ width: layout.symbol.width, height: layout.symbol.height }} fadeDuration={0} />
      </View>
    )
  }

  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'flex-start', width: layout.width, height: layout.height }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Vesti"
    >
      <Image source={images.symbol} style={layout.symbol} fadeDuration={0} />
      <Image source={images.wordmark} style={layout.wordmark} fadeDuration={0} />
    </View>
  )
}
