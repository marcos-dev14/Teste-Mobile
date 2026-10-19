import { forwardRef } from 'react'
import { Pressable, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated'

import { motion } from '../theme/tokens'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>
  /** Escala aplicada enquanto pressionado. */
  scaleTo?: number
}

/** Pressable com feedback de escala na UI thread. Sem animação quando "reduzir movimento" está ativo. */
export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { scaleTo = motion.pressScale, style, onPressIn, onPressOut, disabled, ...rest },
  ref,
) {
  const reduceMotion = useReducedMotion()
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <AnimatedPressable
      ref={ref}
      disabled={disabled}
      onPressIn={(event) => {
        if (!reduceMotion) scale.value = withSpring(scaleTo, motion.spring.snappy)
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, motion.spring.snappy)
        onPressOut?.(event)
      }}
      style={[style, animatedStyle]}
      {...rest}
    />
  )
})
