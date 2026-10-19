import { useState } from 'react'
import { View } from 'react-native'

import { ProductGrid } from '@/features/catalog/components/product-grid'
import { SortChips } from '@/features/catalog/components/sort-chips'
import { useDebouncedValue, useProductList } from '@/features/catalog/hooks'
import type { ProductSort } from '@/lib/api/types'
import { AppHeader, IconButton, makeStyles, Screen, Text, TextField, useStyles } from '@/ui'

export default function SearchScreen() {
  const styles = useStyles(styleFactory)
  const [term, setTerm] = useState('')
  const [sort, setSort] = useState<ProductSort>('featured')
  const search = useDebouncedValue(term.trim(), 300)
  const query = useProductList({ search: search || undefined, sort })
  const total = query.data?.pages[0]?.total

  const header = (
    <View style={styles.header}>
      <TextField
        label="O que você procura?"
        icon="search"
        value={term}
        onChangeText={setTerm}
        placeholder="Camiseta, jeans, bolsa…"
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
        maxLength={60}
      />
      <SortChips value={sort} onChange={setSort} />
      {total !== undefined && !query.isPending ? (
        <Text variant="caption" color="textMuted" accessibilityLiveRegion="polite">
          {total === 0 ? 'Nenhum resultado' : `${total} ${total === 1 ? 'resultado' : 'resultados'}`}
          {search ? ` para “${search}”` : ''}
        </Text>
      ) : null}
    </View>
  )

  return (
    <Screen>
      <AppHeader
        largeTitle="Buscar"
        right={term ? <IconButton icon="close" accessibilityLabel="Limpar busca" onPress={() => setTerm('')} /> : undefined}
      />
      <ProductGrid
        query={query}
        header={header}
        empty={{
          title: 'Nada por aqui',
          message: search ? `Não encontramos produtos para “${search}”. Tente outro termo.` : 'Nenhum produto disponível.',
          actionLabel: search ? 'Limpar busca' : undefined,
          onAction: search ? () => setTerm('') : undefined,
        }}
      />
    </Screen>
  )
}

const styleFactory = makeStyles((t) => ({
  header: { gap: t.space.sm, paddingBottom: t.space.xs },
}))
