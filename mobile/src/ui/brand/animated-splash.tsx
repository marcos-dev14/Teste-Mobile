import * as SplashScreen from 'expo-splash-screen'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Image, StyleSheet } from 'react-native'
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import { motion } from '../theme/tokens'
import { useTheme } from '../theme/theme-provider'
import { brandImages, lockupLayout, SPLASH_SYMBOL_WIDTH } from './brand-assets'

const easeOut = Easing.bezier(...motion.easeOut)

/** Linha do tempo (ms). Sem espera artificial: ~1,2 s do primeiro quadro até a interface livre. */
const TIMELINE = {
  symbolDelay: 60,
  symbolDuration: 560,
  wordDelay: 180,
  wordDuration: 520,
  /** Momento em que a splash começa a sair e as telas iniciam a própria entrada. */
  exitAt: 780,
  exitDuration: 320,
  reducedExitAt: 300,
} as const

/** Se o símbolo não carregar a tempo, a splash segue mesmo assim: nunca prende o app. */
const SAFETY_TIMEOUT = 1000

export interface AnimatedSplashProps {
  /** A splash começou a sair: as telas podem iniciar a entrada. */
  onReveal: () => void
  /** A splash terminou e pode ser desmontada. */
  onFinish: () => void
}

/**
 * Continuação animada da splash nativa. Começa idêntica a ela (mesmo fundo, símbolo do mesmo
 * tamanho e posição), troca de lugar com a nativa quando o símbolo já está desenhado e então:
 * o símbolo desliza para a esquerda enquanto o nome "vesti" é revelado da esquerda para a
 * direita; por fim a camada some com uma leve ampliação, revelando o app que já carregou por baixo.
 */
export function AnimatedSplash({ onReveal, onFinish }: AnimatedSplashProps) {
  const theme = useTheme()
  const reduceMotion = useReducedMotion()
  const images = brandImages[theme.scheme]
  const layout = lockupLayout(SPLASH_SYMBOL_WIDTH)
  // O símbolo começa no centro da tela, como na splash nativa.
  const centerShift = (layout.width - layout.symbol.width) / 2
  const centerOffsetY = layout.height / 2 - (layout.symbol.marginTop + layout.symbol.height / 2)

  const symbolX = useSharedValue(centerShift)
  const word = useSharedValue(0)
  const exit = useSharedValue(0)
  const [leaving, setLeaving] = useState(false)
  const started = useRef(false)

  const reveal = useCallback(() => {
    setLeaving(true)
    onReveal()
  }, [onReveal])

  // A saída começa na UI thread; o app é avisado no mesmo instante para iniciar as entradas.
  useAnimatedReaction(
    () => exit.value > 0,
    (leavingNow, wasLeaving) => {
      if (leavingNow && !wasLeaving) scheduleOnRN(reveal)
    },
  )

  const begin = useCallback(() => {
    if (started.current) return
    started.current = true

    // Um quadro depois do símbolo carregar, a camada JS já está pintada: a troca é invisível.
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {})
    })

    const finish = () => onFinish()
    const exitAt = reduceMotion ? TIMELINE.reducedExitAt : TIMELINE.exitAt
    const exitDuration = reduceMotion ? motion.entrance.reducedDuration : TIMELINE.exitDuration

    if (reduceMotion) {
      symbolX.value = 0
      word.value = withTiming(1, { duration: motion.entrance.reducedDuration })
    } else {
      symbolX.value = withDelay(TIMELINE.symbolDelay, withTiming(0, { duration: TIMELINE.symbolDuration, easing: easeOut }))
      word.value = withDelay(TIMELINE.wordDelay, withTiming(1, { duration: TIMELINE.wordDuration, easing: easeOut }))
    }
    exit.value = withDelay(
      exitAt,
      withTiming(1, { duration: exitDuration, easing: Easing.out(Easing.quad) }, (done) => {
        if (done) scheduleOnRN(finish)
      }),
    )
  }, [exit, onFinish, reduceMotion, symbolX, word])

  useEffect(() => {
    const safety = setTimeout(begin, SAFETY_TIMEOUT)
    return () => clearTimeout(safety)
  }, [begin])

  const overlayStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }))
  const lockupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: centerOffsetY }, { scale: reduceMotion ? 1 : 1 + exit.value * 0.04 }],
  }))
  const symbolStyle = useAnimatedStyle(() => ({ transform: [{ translateX: symbolX.value }] }))

  // Mesma máscara das entradas de tela: o recorte avança da esquerda e o conteúdo fica parado.
  const wordWidth = layout.wordmark.width
  const wordClipStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: word.value, transform: [{ translateX: symbolX.value }] }
    return {
      opacity: interpolate(word.value, [0, 0.4], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: symbolX.value - (1 - word.value) * wordWidth },
        { translateY: (1 - word.value) * motion.entrance.offsetY * 0.5 },
      ],
    }
  })
  const wordInnerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: reduceMotion ? 0 : (1 - word.value) * wordWidth }],
  }))

  return (
    <Animated.View
      style={[styles.overlay, { backgroundColor: theme.colors.bg }, overlayStyle]}
      pointerEvents={leaving ? 'none' : 'auto'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="animated-splash"
    >
      <Animated.View style={[styles.row, { width: layout.width, height: layout.height }, lockupStyle]}>
        <Animated.View style={symbolStyle}>
          <Image source={images.symbol} style={layout.symbol} fadeDuration={0} onLoad={begin} onError={begin} />
        </Animated.View>
        <Animated.View style={[{ marginLeft: layout.wordmark.marginLeft, overflow: 'hidden' }, wordClipStyle]}>
          <Animated.View style={wordInnerStyle}>
            <Image source={images.wordmark} style={{ width: wordWidth, height: layout.wordmark.height }} fadeDuration={0} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
})
