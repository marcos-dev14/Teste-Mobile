import { memo } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated'

import type { QuoteLine } from '@/lib/api/types'
import { Badge, InlineLoader, makeStyles, Price, ProductImage, QuantityStepper, Text, useStyles } from '@/ui'

import { MAX_QUANTITY_PER_ITEM, type CartItem } from '../cart-logic'

interface CartLineProps {
  item: CartItem
  /** Linha da cotação do servidor (ausente enquanto carrega). */
  quote?: QuoteLine
  unavailable: boolean
  onQuantityChange: (colorId: string, quantity: number) => void
  onRemove: (colorId: string) => void
}

export const CartLine = memo(function CartLine({ item, quote, unavailable, onQuantityChange, onRemove }: CartLineProps) {
  const styles = useStyles(styleFactory)
  const name = quote?.productName ?? item.snapshot.name
  const colorName = quote?.colorName ?? item.snapshot.colorName
  const insufficient = quote?.status === 'insufficient_stock'

  return (
    <Animated.View
      exiting={FadeOut.duration(160).reduceMotion(ReduceMotion.System)}
      layout={LinearTransition.duration(220).reduceMotion(ReduceMotion.System)}
      style={styles.row}
    >
      <View style={styles.image}>
        <ProductImage uri={quote?.imageUrl ?? item.snapshot.imageUrl} recyclingKey={item.colorId} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="bodyStrong" numberOfLines={2} style={styles.flex}>
            {name}
          </Text>
          <Pressable
            onPress={() => onRemove(item.colorId)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${name} da sacola`}
          >
            <Text variant="label" color="textMuted" style={styles.remove}>
              Remover
            </Text>
          </Pressable>
        </View>
        <View style={styles.colorRow}>
          <View style={[styles.dot, { backgroundColor: quote?.colorHex ?? item.snapshot.colorHex }]} />
          <Text variant="caption" color="textMuted">
            {colorName}
          </Text>
        </View>

        {unavailable ? (
          <Badge label="Indisponível" tone="danger" />
        ) : insufficient ? (
          <View style={styles.warning}>
            <Badge label={quote.availableStock === 0 ? 'Esgotado' : `Só ${quote.availableStock} em estoque`} tone="warning" />
            {quote.availableStock > 0 ? (
              <Pressable
                onPress={() => onQuantityChange(item.colorId, quote.availableStock)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Ajustar quantidade para ${quote.availableStock}`}
              >
                <Text variant="label" color="accent">
                  Ajustar
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footer}>
          {unavailable ? (
            <View />
          ) : (
            <QuantityStepper
              value={item.quantity}
              max={Math.min(MAX_QUANTITY_PER_ITEM, Math.max(quote?.availableStock ?? MAX_QUANTITY_PER_ITEM, item.quantity))}
              onChange={(quantity) => onQuantityChange(item.colorId, quantity)}
              onRemove={() => onRemove(item.colorId)}
              label={`Quantidade de ${name}`}
            />
          )}
          {quote ? <Price cents={quote.lineTotalCents} /> : unavailable ? null : <InlineLoader />}
        </View>
      </View>
    </Animated.View>
  )
})

const styleFactory = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: t.space.md },
  image: { width: 96 },
  body: { flex: 1, gap: t.space.xs },
  titleRow: { flexDirection: 'row', gap: t.space.xs, alignItems: 'flex-start' },
  flex: { flex: 1 },
  remove: { textDecorationLine: 'underline' },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.xxs + 2 },
  dot: { width: 12, height: 12, borderRadius: t.radius.pill, borderWidth: 1, borderColor: t.colors.border },
  warning: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
}))
