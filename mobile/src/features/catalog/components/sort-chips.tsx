import { ScrollView } from 'react-native'

import type { ProductSort } from '@/lib/api/types'
import { haptics } from '@/lib/haptics'
import { Chip, makeStyles, useStyles } from '@/ui'

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Destaques' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'newest', label: 'Novidades' },
]

export function SortChips({ value, onChange }: { value: ProductSort; onChange: (value: ProductSort) => void }) {
  const styles = useStyles(styleFactory)
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel="Ordenar produtos"
    >
      {SORT_OPTIONS.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={option.value === value}
          onPress={() => {
            if (option.value === value) return
            haptics.selection()
            onChange(option.value)
          }}
        />
      ))}
    </ScrollView>
  )
}

const styleFactory = makeStyles((t) => ({
  row: { gap: t.space.xs, paddingVertical: t.space.xxs },
}))
