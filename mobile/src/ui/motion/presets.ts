import { Easing, FadeIn, Keyframe, ReduceMotion, SlideInDown } from 'react-native-reanimated'

import { motion } from '../theme/tokens'

// Entradas de modais: curtas, desacelerando, sem mola (nada passa do ponto e volta).
const easeOut = Easing.bezier(...motion.easeOut)

/** Fundo escurecido de diálogos e painéis. */
export const backdropIn = FadeIn.duration(motion.duration.fast).reduceMotion(ReduceMotion.System)

/** Diálogos e selos: fade com aumento sutil (96% → 100%). */
export const popIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.96 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: easeOut },
})
  .duration(motion.duration.base)
  .reduceMotion(ReduceMotion.System)

/** Painéis que sobem do rodapé. */
export const sheetIn = SlideInDown.duration(motion.duration.slow).easing(easeOut).reduceMotion(ReduceMotion.System)
