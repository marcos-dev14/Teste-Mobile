import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import { makeStyles, useStyles } from '@/ui'

const DOT = 18
const DURATION = 520
/** Altura extra do arco (px): a bolinha sobe além da linha reta e desce sobre o ícone. */
const ARC = 90
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1)

export interface FlyToCartHandle {
  /** Faz uma bolinha da cor escolhida voar de `from` até `to`. Chama `onArrive` na chegada. */
  launch: (from: View | null, to: View | null, color: string) => void
}

type Box = { x: number; y: number; width: number; height: number }

function measure(view: View | null): Promise<Box | null> {
  return new Promise((resolve) => {
    if (!view) return resolve(null)
    view.measureInWindow((x, y, width, height) => resolve(width || height ? { x, y, width, height } : null))
  })
}

/**
 * Camada que não recebe toques, por cima da tela. Uma única View animada só com transform e
 * opacity na UI thread: não bloqueia a interação nem re-renderiza a tela durante o voo.
 */
export const FlyToCart = forwardRef<FlyToCartHandle, { onArrive: () => void }>(function FlyToCart({ onArrive }, ref) {
  const styles = useStyles(styleFactory)
  const overlay = useRef<View>(null)
  const onArriveRef = useRef(onArrive)
  onArriveRef.current = onArrive

  const progress = useSharedValue(0)
  const active = useSharedValue(0)
  const from = useSharedValue({ x: 0, y: 0 })
  const to = useSharedValue({ x: 0, y: 0 })
  const color = useSharedValue('transparent')

  const arrive = useCallback(() => onArriveRef.current(), [])

  useImperativeHandle(
    ref,
    () => ({
      launch: (fromView, toView, dotColor) => {
        void Promise.all([measure(overlay.current), measure(fromView), measure(toView)]).then(([origin, start, end]) => {
          // Sem medidas (tela saindo, layout ainda não pronto): confirma sem o voo.
          if (!origin || !start || !end) return arrive()
          const center = (box: Box) => ({ x: box.x - origin.x + box.width / 2, y: box.y - origin.y + box.height / 2 })
          from.set(center(start))
          to.set(center(end))
          color.set(dotColor)
          active.set(1)
          progress.set(0)
          progress.set(
            withTiming(1, { duration: DURATION, easing: EASE_IN_OUT }, (finished) => {
              if (!finished) return
              active.set(0)
              scheduleOnRN(arrive)
            }),
          )
        })
      },
    }),
    [active, arrive, color, from, progress, to],
  )

  const dotStyle = useAnimatedStyle(() => {
    const p = progress.get()
    const start = from.get()
    const end = to.get()
    const x = start.x + (end.x - start.x) * p
    const y = start.y + (end.y - start.y) * p - ARC * 4 * p * (1 - p)
    return {
      backgroundColor: color.get(),
      opacity: active.get() === 0 ? 0 : p < 0.8 ? 1 : (1 - p) / 0.2,
      transform: [{ translateX: x - DOT / 2 }, { translateY: y - DOT / 2 }, { scale: 1 - 0.5 * p }],
    }
  })

  return (
    <View ref={overlay} style={StyleSheet.absoluteFill} pointerEvents="none" collapsable={false}>
      <Animated.View style={[styles.dot, dotStyle]} />
    </View>
  )
})

const styleFactory = makeStyles((t) => ({
  dot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DOT,
    height: DOT,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: t.colors.surface,
    ...t.elevation.card,
  },
}))
