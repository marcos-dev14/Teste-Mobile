import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'

import { motion } from '../theme/tokens'
import { useEntranceGate, useScreenEntrance } from './screen-entrance'

const easing = Easing.bezier(...motion.easeOut)

export interface RevealProps {
  children: ReactNode
  /** Posição do grupo na sequência da tela (0 = primeiro). Define o atraso escalonado. */
  index?: number
  /**
   * Chave única na tela: o grupo anima só na primeira vez que monta. Use em itens de lista,
   * que remontam ao rolar, paginar ou filtrar.
   */
  once?: string
  /** Desliga a animação (ex.: itens além da primeira dobra). O conteúdo aparece pronto. */
  disabled?: boolean
  /** Estilo da área de conteúdo (onde ficam os filhos: gap, padding, flexDirection…). */
  style?: StyleProp<ViewStyle>
  /** Estilo da caixa externa (tamanho e posição: width, flex, position…). */
  containerStyle?: StyleProp<ViewStyle>
  testID?: string
}

/**
 * Revela conteúdo real com fade e uma subida de poucos dp (só opacity/transform, na UI thread).
 * Começa depois da primeira medição, para não animar algo que ainda não tem tamanho.
 */
export function Reveal({ children, index = 0, once, disabled, style, containerStyle, testID }: RevealProps) {
  const entrance = useScreenEntrance()
  const gateOpen = useEntranceGate()
  const reduceMotion = useReducedMotion()
  const owner = useId()
  const [animate] = useState(() => !disabled && (once ? entrance.claim(once, owner) : true))

  const progress = useSharedValue(animate ? 0 : 1)
  const measured = useRef(false)
  const started = useRef(false)

  const { completed, schedule } = entrance
  const { duration, reducedDuration, offsetY } = motion.entrance

  const start = useCallback(() => {
    if (started.current || !measured.current || !gateOpen) return
    started.current = true
    progress.value = reduceMotion
      ? withTiming(1, { duration: reducedDuration })
      : withDelay(schedule(index), withTiming(1, { duration, easing }))
  }, [gateOpen, reduceMotion, index, progress, duration, reducedDuration, schedule])

  // O portão pode abrir depois da medição (splash ainda na tela).
  useEffect(() => {
    if (animate) start()
  }, [animate, start])

  const onLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      if (!animate || measured.current) return
      measured.current = true
      start()
    },
    [animate, start],
  )

  const animatedStyle = useAnimatedStyle(() => {
    const p = Math.max(progress.value, completed.value)
    if (reduceMotion) return { opacity: p }
    return { opacity: p, transform: [{ translateY: (1 - p) * offsetY }] }
  })

  if (!animate) {
    return (
      <Animated.View style={containerStyle} testID={testID}>
        <Animated.View style={style}>{children}</Animated.View>
      </Animated.View>
    )
  }

  return (
    <Animated.View onLayout={onLayout} style={[containerStyle, animatedStyle]} testID={testID}>
      <Animated.View style={style}>{children}</Animated.View>
    </Animated.View>
  )
}
