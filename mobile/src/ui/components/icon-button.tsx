import { View } from 'react-native'

import { makeStyles, useStyles } from '../theme/theme-provider'
import type { ColorTokens } from '../theme/tokens'
import { Icon, type IconName } from './icon'
import { PressableScale } from './pressable-scale'

export interface IconButtonProps {
  icon: IconName
  /** Obrigatório: botões só com ícone precisam de rótulo para leitores de tela. */
  accessibilityLabel: string
  onPress?: () => void
  variant?: 'plain' | 'surface'
  color?: keyof ColorTokens
  disabled?: boolean
  size?: number
  testID?: string
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  color = 'text',
  disabled,
  size = 22,
  testID,
}: IconButtonProps) {
  const styles = useStyles(styleFactory)
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.base, variant === 'surface' && styles.surface, disabled && styles.disabled]}
    >
      <View>
        <Icon name={icon} size={size} color={color} />
      </View>
    </PressableScale>
  )
}

const styleFactory = makeStyles((t) => ({
  base: {
    width: t.layout.minTouch,
    height: t.layout.minTouch,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: { backgroundColor: t.colors.surface, ...t.elevation.card },
  disabled: { opacity: 0.4 },
}))
