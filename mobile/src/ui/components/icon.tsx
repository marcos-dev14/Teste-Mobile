import Ionicons from '@expo/vector-icons/Ionicons'
import type { ComponentProps } from 'react'

import { useTheme } from '../theme/theme-provider'
import type { ColorTokens } from '../theme/tokens'

export type IconName = ComponentProps<typeof Ionicons>['name']

export interface IconProps {
  name: IconName
  size?: number
  color?: keyof ColorTokens
  /** Cor fora do tema (ex.: contraste sobre a cor de um produto). Tem precedência sobre `color`. */
  rawColor?: string
}

/** Ícones decorativos: ocultos do leitor de tela (o rótulo fica no elemento interativo). */
export function Icon({ name, size = 20, color = 'text', rawColor }: IconProps) {
  const theme = useTheme()
  return (
    <Ionicons
      name={name}
      size={size}
      color={rawColor ?? theme.colors[color]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  )
}
