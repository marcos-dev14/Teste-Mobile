import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { haptics } from '@/lib/haptics'

import { makeStyles, useStyles } from '../theme/theme-provider'
import { Icon, type IconName } from './icon'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

// Seletor de quantidade ---------------------------------------------------------------

export interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** Ao tentar diminuir abaixo do mínimo (ex.: remover item do carrinho). */
  onRemove?: () => void
  label?: string
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  onRemove,
  label = 'Quantidade',
}: QuantityStepperProps) {
  const styles = useStyles(styleFactory)
  const canDecrease = value > min || !!onRemove
  const canIncrease = value < max

  const decrease = () => {
    if (value > min) {
      haptics.selection()
      onChange(value - 1)
    } else onRemove?.()
  }
  const increase = () => {
    if (!canIncrease) return
    haptics.selection()
    onChange(value + 1)
  }

  return (
    <View
      style={styles.stepper}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: String(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => (event.nativeEvent.actionName === 'increment' ? increase() : decrease())}
    >
      <Pressable
        onPress={decrease}
        disabled={!canDecrease}
        hitSlop={8}
        style={[styles.stepButton, !canDecrease && styles.disabled]}
        importantForAccessibility="no"
      >
        <Icon name={value <= min && onRemove ? 'trash-outline' : 'remove'} size={18} />
      </Pressable>
      <Text variant="bodyStrong" tabular style={styles.value} maxFontSizeMultiplier={1.3}>
        {value}
      </Text>
      <Pressable
        onPress={increase}
        disabled={!canIncrease}
        hitSlop={8}
        style={[styles.stepButton, !canIncrease && styles.disabled]}
        importantForAccessibility="no"
      >
        <Icon name="add" size={18} />
      </Pressable>
    </View>
  )
}

// Chip selecionável -----------------------------------------------------------------------

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string
  selected?: boolean
  onPress?: () => void
  icon?: IconName
}) {
  const styles = useStyles(styleFactory)
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected, checked: !!selected }}
      accessibilityLabel={label}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon ? <Icon name={icon} size={14} color={selected ? 'onPrimary' : 'text'} /> : null}
      <Text variant="label" color={selected ? 'onPrimary' : 'text'} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </PressableScale>
  )
}

// Cartão, divisor e item de lista ------------------------------------------------------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles(styleFactory)
  return <View style={[styles.card, style]}>{children}</View>
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const styles = useStyles(styleFactory)
  return <View style={[styles.divider, { marginLeft: inset }]} />
}

export function ListItem({
  icon,
  title,
  subtitle,
  onPress,
  destructive,
  right,
}: {
  icon?: IconName
  title: string
  subtitle?: string
  onPress?: () => void
  destructive?: boolean
  right?: ReactNode
}) {
  const styles = useStyles(styleFactory)
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.99}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={styles.listItem}
    >
      {icon ? (
        <View style={[styles.listIcon, destructive && styles.listIconDanger]}>
          <Icon name={icon} size={18} color={destructive ? 'danger' : 'text'} />
        </View>
      ) : null}
      <View style={styles.listText}>
        <Text variant="bodyStrong" color={destructive ? 'danger' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress && !destructive ? <Icon name="chevron-forward" size={18} color="textMuted" /> : null)}
    </PressableScale>
  )
}

const styleFactory = makeStyles((t) => ({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    alignSelf: 'flex-start',
  },
  stepButton: {
    width: t.layout.minTouch,
    height: t.layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 24, textAlign: 'center' },
  disabled: { opacity: 0.35 },
  chip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.xxs + 2,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  chipSelected: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    padding: t.space.md,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border },
  listItem: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    paddingVertical: t.space.sm,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIconDanger: { backgroundColor: t.colors.dangerSoft },
  listText: { flex: 1, gap: 2 },
}))
