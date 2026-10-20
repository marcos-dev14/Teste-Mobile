import { router } from 'expo-router'
import { memo } from 'react'
import { View } from 'react-native'

import type { ProductSummary } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'
import { Badge, makeStyles, PressableScale, Price, ProductImage, RatingStars, Reveal, Text, useStyles } from '@/ui'

/** Só a primeira "dobra" entra animada; o resto da lista (e as próximas páginas) aparece pronto. */
const ANIMATED_ITEMS = 6

interface ProductCardProps {
  product: ProductSummary
  width: number
  index: number
  /** Posição do primeiro card na sequência de entrada da tela (depois do cabeçalho). */
  entranceOffset?: number
}

export const ProductCard = memo(function ProductCard({ product, width, index, entranceOffset = 0 }: ProductCardProps) {
  const styles = useStyles(styleFactory)

  // A chave por posição (não por produto) impede reanimar ao rolar de volta, filtrar ou paginar.
  return (
    <Reveal
      index={entranceOffset + index}
      once={`product-card-${index}`}
      disabled={index >= ANIMATED_ITEMS}
      containerStyle={{ width }}
    >
      <PressableScale
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${formatMoney(product.priceCents)}${product.inStock ? '' : ', esgotado'}`}
        accessibilityHint="Abre os detalhes do produto"
        style={styles.card}
      >
        <View>
          <ProductImage uri={product.imageUrl} recyclingKey={product.id} />
          {!product.inStock ? (
            <View style={styles.badge}>
              <Badge label="Esgotado" tone="neutral" />
            </View>
          ) : null}
        </View>
        <View style={styles.info}>
          <Text variant="label" numberOfLines={2} style={styles.name}>
            {product.name}
          </Text>
          <Price cents={product.priceCents} />
          <View style={styles.meta}>
            {product.rating !== null ? <RatingStars rating={product.rating} /> : <View />}
            <View style={styles.dots}>
              {product.colors.slice(0, 4).map((color) => (
                <View key={color.id} style={[styles.dot, { backgroundColor: color.hex }]} />
              ))}
            </View>
          </View>
        </View>
      </PressableScale>
    </Reveal>
  )
})

const styleFactory = makeStyles((t) => ({
  card: { gap: t.space.xs },
  badge: { position: 'absolute', top: t.space.xs, left: t.space.xs },
  info: { gap: t.space.xxs, paddingTop: t.space.xs, paddingHorizontal: 2 },
  name: { minHeight: 36 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: t.radius.pill, borderWidth: 1, borderColor: t.colors.border },
}))
