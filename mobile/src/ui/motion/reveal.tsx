import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native'
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

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
 * Revela conteúdo real: sobe alguns dp e uma máscara avança da esquerda para a direita.
 *
 * A máscara usa só transforms (UI thread, sem relayout): a caixa externa recorta (`overflow: hidden`)
 * e desliza da esquerda, enquanto o conteúdo interno faz a translação inversa e fica parado.
 * O recorte só existe durante a animação, para não cortar sombras depois.
 */
export function Reveal({ children, index = 0, once, disabled, style, containerStyle, testID }: RevealProps) {
  const entrance = useScreenEntrance()
  const gateOpen = useEntranceGate()
  const reduceMotion = useReducedMotion()
  const owner = useId()
  const [animate] = useState(() => !disabled && (once ? entrance.claim(once, owner) : true))
  const [settled, setSettled] = useState(!animate)

  const progress = useSharedValue(animate ? 0 : 1)
  const width = useSharedValue(0)
  const measured = useRef(false)
  const started = useRef(false)

  const { completed, schedule } = entrance
  const { duration, reducedDuration, offsetX, offsetY } = motion.entrance

  const start = useCallback(() => {
    if (started.current || !measured.current || !gateOpen) return
    started.current = true
    const onEnd = (finished?: boolean) => {
      'worklet'
      if (finished) scheduleOnRN(setSettled, true)
    }
    progress.value = reduceMotion
      ? withTiming(1, { duration: reducedDuration }, onEnd)
      : withDelay(schedule(index), withTiming(1, { duration, easing }, onEnd))
  }, [gateOpen, reduceMotion, index, progress, duration, reducedDuration, schedule])

  // O portão pode abrir depois da medição (splash ainda na tela).
  useEffect(() => {
    if (animate) start()
  }, [animate, start])

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!animate || measured.current) return
      width.value = event.nativeEvent.layout.width
      measured.current = true
      start()
    },
    [animate, start, width],
  )

  const outerStyle = useAnimatedStyle(() => {
    const p = Math.max(progress.value, completed.value)
    if (reduceMotion) return { opacity: p }
    return {
      opacity: interpolate(p, [0, 0.55], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: (1 - p) * offsetY }, { translateX: -(1 - p) * width.value }],
    }
  })

  const innerStyle = useAnimatedStyle(() => {
    const p = Math.max(progress.value, completed.value)
    if (reduceMotion) return { transform: [{ translateX: 0 }] }
    return { transform: [{ translateX: (1 - p) * (width.value - offsetX) }] }
  })

  if (!animate) {
    return (
      <Animated.View style={containerStyle} testID={testID}>
        <Animated.View style={style}>{children}</Animated.View>
      </Animated.View>
    )
  }

  return (
    <Animated.View
      onLayout={onLayout}
      style={[containerStyle, outerStyle, !settled && !reduceMotion && { overflow: 'hidden' }]}
      testID={testID}
    >
      <Animated.View style={[style, innerStyle]}>{children}</Animated.View>
    </Animated.View>
  )
}
