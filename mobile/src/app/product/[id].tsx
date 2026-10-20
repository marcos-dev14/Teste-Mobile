import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { FlatList, ScrollView, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MAX_CART_LINES, MAX_QUANTITY_PER_ITEM, quantityInCart } from '@/features/cart/cart-logic'
import { useCartCount, useCartStore } from '@/features/cart/store'
import { useProduct } from '@/features/catalog/hooks'
import { isApiError } from '@/lib/api/errors'
import type { ProductColor } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'
import { haptics } from '@/lib/haptics'
import {
  AppHeader,
  Badge,
  Button,
  ColorSwatch,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  makeStyles,
  Price,
  ProductImage,
  QuantityStepper,
  RatingStars,
  Reveal,
  Screen,
  Text,
  useStyles,
  useTheme,
  useToast,
} from '@/ui'

export default function ProductScreen() {
  const styles = useStyles(styleFactory)
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const { width } = useWindowDimensions()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: product, error, isPending, refetch } = useProduct(id)
  const cartItems = useCartStore((state) => state.items)
  const addToCart = useCartStore((state) => state.add)
  const cartCount = useCartCount()

  const [colorId, setColorId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)

  // Pré-seleciona a primeira cor disponível quando o produto carrega.
  useEffect(() => {
    if (product && !colorId) {
      setColorId((product.colors.find((color) => color.stock > 0) ?? product.colors[0])?.id ?? null)
    }
  }, [product, colorId])

  const color: ProductColor | undefined = product?.colors.find((item) => item.id === colorId)
  const inCart = color ? quantityInCart(cartItems, color.id) : 0
  const maxAddable = color ? Math.max(0, Math.min(color.stock, MAX_QUANTITY_PER_ITEM) - inCart) : 0
  const images = useMemo(() => (color?.imageUrls.length ? color.imageUrls : (product?.imageUrls ?? [])), [color, product])

  useEffect(() => {
    setQuantity((current) => Math.max(1, Math.min(current, maxAddable || 1)))
  }, [maxAddable])

  const cartLabel = cartCount ? `Abrir sacola, ${cartCount} itens` : 'Abrir sacola'
  const cartButton = (
    <IconButton
      icon="bag-handle-outline"
      accessibilityLabel={cartLabel}
      onPress={() => router.navigate('/cart')}
    />
  )

  if (isPending) {
    return (
      <Screen>
        <AppHeader back right={cartButton} />
        <LoadingState label="Carregando produto" testID="product-loading" />
      </Screen>
    )
  }

  if (error || !product) {
    const notFound = isApiError(error) && error.status === 404
    return (
      <Screen>
        <AppHeader back />
        {notFound ? (
          <EmptyState
            icon="shirt-outline"
            title="Produto indisponível"
            message="Este produto não está mais no catálogo."
            actionLabel="Voltar ao início"
            onAction={() => router.navigate('/')}
          />
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}
      </Screen>
    )
  }

  const soldOut = !color || color.stock === 0
  const handleAdd = () => {
    if (!color) return
    if (inCart === 0 && cartItems.length >= MAX_CART_LINES) {
      toast.show({ tone: 'info', message: `A sacola aceita até ${MAX_CART_LINES} itens diferentes por pedido.` })
      return
    }
    if (maxAddable === 0) {
      toast.show({ tone: 'info', message: 'Você já tem na sacola todas as unidades disponíveis desta cor.' })
      return
    }
    addToCart(
      {
        productId: product.id,
        colorId: color.id,
        snapshot: {
          name: product.name,
          colorName: color.name,
          colorHex: color.hex,
          imageUrl: color.imageUrls[0] ?? product.imageUrls[0] ?? '',
          priceCents: product.priceCents,
        },
      },
      quantity,
    )
    void haptics.light()
    toast.show({
      tone: 'success',
      message: `${quantity}× ${product.name} (${color.name}) na sacola`,
      actionLabel: 'Ver sacola',
      onAction: () => router.navigate('/cart'),
    })
    setQuantity(1)
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View>
          <Reveal index={0}>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              keyExtractor={(uri) => uri}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => setImageIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
              renderItem={({ item, index }) => (
                <View style={{ width }}>
                  <ProductImage
                    uri={item}
                    rounded={false}
                    priority={index === 0 ? 'high' : 'normal'}
                    accessibilityLabel={`${product.name}, cor ${color?.name ?? ''}, foto ${index + 1} de ${images.length}`}
                  />
                </View>
              )}
            />
            {images.length > 1 ? (
              <View style={styles.dots} accessibilityElementsHidden>
                {images.map((uri, index) => (
                  <View key={uri} style={[styles.dot, index === imageIndex && styles.dotActive]} />
                ))}
              </View>
            ) : null}
          </Reveal>
          {/* Navegação fora da entrada: visível e tocável desde o primeiro quadro. */}
          <View style={styles.floatingHeader}>
            <IconButton
              icon="chevron-back"
              variant="surface"
              accessibilityLabel="Voltar"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
            <IconButton
              icon="bag-handle-outline"
              variant="surface"
              accessibilityLabel={cartLabel}
              onPress={() => router.navigate('/cart')}
            />
          </View>
        </View>

        <View style={[styles.section, styles.centered, { maxWidth: theme.layout.maxContentWidth }]}>
          <Reveal index={1} style={styles.titleBlock}>
            <Text variant="title" accessibilityRole="header">
              {product.name}
            </Text>
            {product.rating !== null ? <RatingStars rating={product.rating} /> : null}
            <Price cents={product.priceCents} variant="priceLarge" />
          </Reveal>

          <Reveal index={2} style={styles.block}>
            <View style={styles.colorHeader}>
              <Text variant="label" color="textMuted">
                Cor: <Text variant="label">{color?.name ?? '—'}</Text>
              </Text>
              {color && color.stock === 0 ? <Badge label="Esgotado" /> : null}
              {color && color.stock > 0 && color.stock <= 3 ? (
                <Badge label={`Últimas ${color.stock} unidades`} tone="accent" />
              ) : null}
            </View>
            <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Cores disponíveis">
              {product.colors.map((option) => (
                <ColorSwatch
                  key={option.id}
                  name={option.name}
                  hex={option.hex}
                  selected={option.id === colorId}
                  soldOut={option.stock === 0}
                  onPress={() => {
                    void haptics.selection()
                    setColorId(option.id)
                    setImageIndex(0)
                  }}
                />
              ))}
            </View>
          </Reveal>

          {!soldOut ? (
            <Reveal index={3} once="quantity" style={styles.block}>
              <Text variant="label" color="textMuted">
                Quantidade
              </Text>
              <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, maxAddable)} />
              {inCart > 0 ? (
                <Text variant="caption" color="textMuted">
                  {inCart} já na sacola
                </Text>
              ) : null}
            </Reveal>
          ) : null}

          <Reveal index={4} style={styles.block}>
            <Text variant="headline">Sobre a peça</Text>
            <Text variant="body" color="textMuted">
              {product.description}
            </Text>
          </Reveal>
        </View>
      </ScrollView>

      <Reveal index={5} containerStyle={styles.bottomBar} style={[styles.bottomBarContent, { paddingBottom: insets.bottom + theme.space.sm }]}>
        <View>
          <Text variant="caption" color="textMuted">
            Total
          </Text>
          <Text variant="price" tabular>
            {formatMoney(product.priceCents * (soldOut ? 1 : quantity))}
          </Text>
        </View>
        <Button
          title={soldOut ? 'Esgotado' : 'Adicionar à sacola'}
          icon={soldOut ? undefined : 'bag-add-outline'}
          disabled={soldOut}
          onPress={handleAdd}
          style={styles.addButton}
          testID="add-to-cart"
        />
      </Reveal>
    </Screen>
  )
}

const styleFactory = makeStyles((t) => ({
  floatingHeader: {
    position: 'absolute',
    top: t.space.xs,
    left: t.space.md,
    right: t.space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: t.space.sm },
  dot: { width: 6, height: 6, borderRadius: t.radius.pill, backgroundColor: t.colors.borderStrong },
  dotActive: { backgroundColor: t.colors.text, width: 18 },
  section: { paddingHorizontal: t.layout.gutter, paddingTop: t.space.lg, gap: t.space.xl },
  centered: { alignSelf: 'center', width: '100%' },
  titleBlock: { gap: t.space.xs },
  block: { gap: t.space.xs },
  colorHeader: { flexDirection: 'row', alignItems: 'center', gap: t.space.xs },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: -t.space.xxs },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingTop: t.space.sm,
    paddingHorizontal: t.layout.gutter,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  addButton: { flex: 1 },
}))
