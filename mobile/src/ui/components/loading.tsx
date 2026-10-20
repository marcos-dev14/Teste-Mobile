import { ActivityIndicator, View } from 'react-native'
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated'

import { makeStyles, useStyles, useTheme } from '../theme/theme-provider'
import { Text } from './text'

/** Atraso antes de mostrar o indicador: respostas rápidas não chegam a piscar um spinner. */
const SHOW_DELAY = 180

export interface LoadingStateProps {
  label?: string
  /** `fill` centraliza na área disponível; `inline` ocupa só uma faixa (listas com cabeçalho). */
  layout?: 'fill' | 'inline'
  testID?: string
}

/**
 * Indicador discreto para quando ainda não há conteúdo real a exibir.
 * Nunca imita o layout final: o conteúdo real entra com `Reveal` quando chega.
 */
export function LoadingState({ label, layout = 'fill', testID = 'loading-state' }: LoadingStateProps) {
  const styles = useStyles(styleFactory)
  const theme = useTheme()
  return (
    <Animated.View
      entering={FadeIn.delay(SHOW_DELAY).duration(theme.motion.duration.base).reduceMotion(ReduceMotion.System)}
      style={layout === 'fill' ? styles.fill : styles.inline}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Carregando'}
      accessibilityState={{ busy: true }}
      testID={testID}
    >
      <ActivityIndicator color={theme.colors.textMuted} />
      {label ? (
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
      ) : null}
    </Animated.View>
  )
}

/** Valor ainda em cálculo no servidor (ex.: preço da cotação). */
export function InlineLoader({ label = 'Calculando' }: { label?: string }) {
  const styles = useStyles(styleFactory)
  const theme = useTheme()
  return (
    <View style={styles.inlineLoader} accessible accessibilityLabel={label} accessibilityState={{ busy: true }}>
      <ActivityIndicator size="small" color={theme.colors.textMuted} />
    </View>
  )
}

const styleFactory = makeStyles((t) => ({
  fill: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: t.space.xs, paddingVertical: t.space.xxxl },
  inline: { alignItems: 'center', justifyContent: 'center', gap: t.space.xs, paddingVertical: t.space.xxl },
  inlineLoader: { minWidth: 72, height: 22, alignItems: 'flex-end', justifyContent: 'center' },
}))
