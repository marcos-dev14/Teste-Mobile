import { router } from 'expo-router'
import { memo } from 'react'
import { View } from 'react-native'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'

import type { ProductSummary } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'
import { Badge, makeStyles, PressableScale, Price, ProductImage, RatingStars, Skeleton, Text, useStyles } from '@/ui'

/** Entradas escalonadas só na primeira "dobra": itens além disso aparecem sem animação. */
const ANIMATED_ITEMS = 6

interface ProductCardProps {
  product: ProductSummary
  width: number
  index: number
}

export const ProductCard = memo(function ProductCard({ product, width, index }: ProductCardProps) {
  const styles = useStyles(styleFactory)
  const entering =
    index < ANIMATED_ITEMS
      ? FadeInDown.delay(index * 40).duration(260).reduceMotion(ReduceMotion.System)
      : undefined

  return (
    <Animated.View entering={entering} style={{ width }}>
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
    </Animated.View>
  )
})

export function ProductCardSkeleton({ width }: { width: number }) {
  const styles = useStyles(styleFactory)
  return (
    <View style={{ width }}>
      <Skeleton height={(width * 5) / 4} radius={12} />
      <View style={styles.info}>
        <Skeleton width="80%" height={14} />
        <Skeleton width="40%" height={16} />
      </View>
    </View>
  )
}

const styleFactory = makeStyles((t) => ({
  card: { gap: t.space.xs },
  badge: { position: 'absolute', top: t.space.xs, left: t.space.xs },
  info: { gap: t.space.xxs, paddingTop: t.space.xs, paddingHorizontal: 2 },
  name: { minHeight: 36 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: t.radius.pill, borderWidth: 1, borderColor: t.colors.border },
}))
