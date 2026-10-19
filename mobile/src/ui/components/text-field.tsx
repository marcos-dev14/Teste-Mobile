import { forwardRef, useState } from 'react'
import { Pressable, TextInput, View, type TextInputProps } from 'react-native'

import { makeStyles, useStyles, useTheme } from '../theme/theme-provider'
import { Icon, type IconName } from './icon'
import { Text } from './text'

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string
  error?: string
  hint?: string
  icon?: IconName
  /** Exibe botão para mostrar/ocultar a senha. */
  secureToggle?: boolean
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, icon, secureToggle, secureTextEntry, onFocus, onBlur, ...rest },
  ref,
) {
  const styles = useStyles(styleFactory)
  const theme = useTheme()
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(true)
  const isSecure = secureToggle ? hidden : secureTextEntry
  const message = error ?? hint

  return (
    <View style={styles.container}>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      <View style={[styles.field, focused && styles.focused, !!error && styles.error]}>
        {icon ? <Icon name={icon} size={18} color="textMuted" /> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.accent}
          secureTextEntry={isSecure}
          style={styles.input}
          maxFontSizeMultiplier={1.4}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color="textMuted" />
          </Pressable>
        ) : null}
      </View>
      {message ? (
        <Text
          variant="caption"
          color={error ? 'danger' : 'textMuted'}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
        >
          {message}
        </Text>
      ) : null}
    </View>
  )
})

const styleFactory = makeStyles((t) => ({
  container: { gap: t.space.xxs + 2 },
  field: {
    minHeight: t.layout.fieldHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.xs,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  focused: { borderColor: t.colors.primary },
  error: { borderColor: t.colors.danger },
  input: {
    flex: 1,
    ...t.typography.body,
    color: t.colors.text,
    paddingVertical: t.space.sm,
  },
}))
