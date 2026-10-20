import { router } from 'expo-router'
import { forwardRef, useEffect, useRef } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { IconButton, makeStyles, Text, useStyles } from '@/ui'

import { useCartCount } from '../store'

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)

export interface CartIconButtonProps {
  variant?: 'plain' | 'surface'
  /** Cada mudança dispara o "bump" do ícone (ex.: quando o item que voa chega). */
  bumpSignal?: number
}

export function cartButtonLabel(count: number): string {
  if (count === 0) return 'Abrir sacola'
  return `Abrir sacola, ${count} ${count === 1 ? 'item' : 'itens'}`
}

/**
 * Ícone da sacola com contador. O número vem do estado persistido da sacola (fonte única),
 * então nunca diverge do que está salvo; a animação é só confirmação visual.
 */
export const CartIconButton = forwardRef<View, CartIconButtonProps>(function CartIconButton(
  { variant = 'plain', bumpSignal = 0 },
  ref,
) {
  const styles = useStyles(styleFactory)
  const count = useCartCount()
  const reduceMotion = useReducedMotion()
  const iconScale = useSharedValue(1)
  const iconRotate = useSharedValue(0)
  const badgeScale = useSharedValue(1)
  const lastSignal = useRef(bumpSignal)

  useEffect(() => {
    if (bumpSignal === lastSignal.current) return
    lastSignal.current = bumpSignal
    // Movimento reduzido: só o número muda.
    if (reduceMotion) return
    iconScale.set(withSequence(withTiming(1.16, { duration: 110, easing: EASE_OUT }), withSpring(1, { duration: 320, dampingRatio: 0.55 })))
    iconRotate.set(
      withSequence(
        withTiming(-9, { duration: 70, easing: EASE_OUT }),
        withTiming(7, { duration: 90 }),
        withSpring(0, { duration: 300, dampingRatio: 0.6 }),
      ),
    )
    badgeScale.set(withSequence(withTiming(1.35, { duration: 120, easing: EASE_OUT }), withSpring(1, { duration: 300, dampingRatio: 0.55 })))
  }, [bumpSignal, reduceMotion, iconScale, iconRotate, badgeScale])

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.get() }, { rotate: `${iconRotate.get()}deg` }],
  }))
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.get() }] }))

  return (
    <View ref={ref} collapsable={false}>
      <Animated.View style={iconStyle}>
        <IconButton
          icon="bag-handle-outline"
          variant={variant}
          accessibilityLabel={cartButtonLabel(count)}
          onPress={() => router.navigate('/cart')}
          testID="cart-button"
        />
      </Animated.View>
      {count > 0 ? (
        <Animated.View style={[styles.badge, badgeStyle]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text variant="overline" color="onAccent" maxFontSizeMultiplier={1} testID="cart-badge">
            {count > 99 ? '99+' : count}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  )
})

const styleFactory = makeStyles((t) => ({
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
}))
