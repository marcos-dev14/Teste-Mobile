/* eslint-disable @typescript-eslint/no-require-imports -- imagens locais do Metro precisam de require estático */
import type { ImageSourcePropType } from 'react-native'

import metrics from '../../../assets/brand/metrics.json'

/** Camadas da marca por tema. Geradas por `assets/brand/build-brand.js` (não edite os PNGs à mão). */
export const brandImages: Record<'light' | 'dark', { symbol: ImageSourcePropType; wordmark: ImageSourcePropType }> = {
  light: {
    symbol: require('../../../assets/images/brand-symbol.png'),
    wordmark: require('../../../assets/images/brand-wordmark.png'),
  },
  dark: {
    symbol: require('../../../assets/images/brand-symbol-dark.png'),
    wordmark: require('../../../assets/images/brand-wordmark-dark.png'),
  },
}

/** Largura (dp) do símbolo na splash nativa — a splash animada parte exatamente dele. */
export const SPLASH_SYMBOL_WIDTH = metrics.splashSymbolWidth

export interface LockupLayout {
  symbol: { width: number; height: number; marginTop: number }
  wordmark: { width: number; height: number; marginLeft: number }
  width: number
  height: number
}

/**
 * Geometria do lockup (símbolo + "vesti") para um símbolo de `symbolWidth` dp.
 * O símbolo tem a altura de maiúscula da Fraunces e apoia na linha de base do wordmark.
 */
export function lockupLayout(symbolWidth: number): LockupLayout {
  const symbolHeight = symbolWidth / metrics.symbolAspect
  // O wordmark começa um pouco acima do topo do símbolo (pingo do "i"); o símbolo desce essa diferença.
  const symbolTop = -metrics.wordmarkOffsetY * symbolWidth
  const wordmark = {
    width: metrics.wordmarkWidth * symbolWidth,
    height: metrics.wordmarkHeight * symbolWidth,
    marginLeft: metrics.wordmarkOffsetX * symbolWidth,
  }
  return {
    symbol: { width: symbolWidth, height: symbolHeight, marginTop: symbolTop },
    wordmark,
    width: symbolWidth + wordmark.marginLeft + wordmark.width,
    height: Math.max(symbolTop + symbolHeight, wordmark.height),
  }
}
