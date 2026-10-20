import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { makeStyles, useStyles, useTheme } from '../theme/theme-provider'
import type { ColorTokens } from '../theme/tokens'
import { Icon, type IconName } from './icon'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

export interface ButtonProps {
  title: string
  onPress?: () => void
  variant?: Variant
  size?: Size
  icon?: IconName
  iconPosition?: 'left' | 'right'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  accessibilityHint?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

const FOREGROUND: Record<Variant, keyof ColorTokens> = {
  primary: 'onPrimary',
  secondary: 'text',
  ghost: 'text',
  danger: 'danger',
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const styles = useStyles(styleFactory)
  const theme = useTheme()
  const inactive = disabled || loading
  const foreground = FOREGROUND[variant]

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.base,
        styles[size],
        styles[variant],
        fullWidth && styles.fullWidth,
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors[foreground]} />
      ) : (
        <View style={[styles.content, iconPosition === 'right' && styles.reverse]}>
          {icon ? <Icon name={icon} size={18} color={foreground} /> : null}
          <Text variant="bodyStrong" color={foreground} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {title}
          </Text>
        </View>
      )}
    </PressableScale>
  )
}

const styleFactory = makeStyles((t) => ({
  base: {
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.space.xl,
  },
  md: { minHeight: t.layout.minTouch },
  lg: { minHeight: t.layout.buttonHeight },
  primary: { backgroundColor: t.colors.primary },
  secondary: {
    backgroundColor: t.colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.colors.borderStrong,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: t.colors.dangerSoft },
  fullWidth: { alignSelf: 'stretch' },
  inactive: { opacity: 0.45 },
  content: { flexDirection: 'row', alignItems: 'center', gap: t.space.xs },
  reverse: { flexDirection: 'row-reverse' },
}))
