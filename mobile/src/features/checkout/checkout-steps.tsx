import { View } from 'react-native'

import { makeStyles, Text, useStyles } from '@/ui'

const STEPS = ['Entrega', 'Pagamento', 'Revisão'] as const

/** Indicador de progresso do checkout. */
export function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  const styles = useStyles(styleFactory)
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Etapa ${current + 1} de ${STEPS.length}: ${STEPS[current]}`}
    >
      {STEPS.map((label, index) => (
        <View key={label} style={styles.step}>
          <View style={[styles.bar, index <= current && styles.barActive]} />
          <Text variant="caption" color={index <= current ? 'text' : 'textMuted'}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styleFactory = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: t.space.xs, paddingVertical: t.space.xs },
  step: { flex: 1, gap: t.space.xxs },
  bar: { height: 4, borderRadius: t.radius.pill, backgroundColor: t.colors.border },
  barActive: { backgroundColor: t.colors.primary },
}))
