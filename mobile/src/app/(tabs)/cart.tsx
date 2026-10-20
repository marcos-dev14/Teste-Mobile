import { router } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { FlatList, View } from 'react-native'

import { useSession } from '@/features/auth/session-store'
import { countItems } from '@/features/cart/cart-logic'
import { CartLine } from '@/features/cart/components/cart-line'
import { useCartQuote } from '@/features/cart/hooks'
import { useCartStore } from '@/features/cart/store'
import { describeError } from '@/lib/api/errors'
import { pluralize } from '@/lib/format'
import { AppHeader, Button, Card, Divider, EmptyState, InlineLoader, makeStyles, Price, Reveal, Screen, Text, useStyles, useTheme } from '@/ui'

const ANIMATED_LINES = 4

export default function CartScreen() {
  const styles = useStyles(styleFactory)
  const theme = useTheme()
  const items = useCartStore((state) => state.items)
  const setQuantity = useCartStore((state) => state.setQuantity)
  const remove = useCartStore((state) => state.remove)
  const status = useSession((state) => state.status)
  const quote = useCartQuote()

  const linesByColor = useMemo(
    () => new Map((quote.data?.lines ?? []).map((line) => [line.colorId, line])),
    [quote.data],
  )
  const unavailable = useMemo(
    () => new Set((quote.data?.unavailable ?? []).map((item) => item.colorId)),
    [quote.data],
  )

  // Linhas da primeira dobra entram em sequência após o título; alterar quantidade, remover ou
  // adicionar itens depois não reanima nada (chaves por posição, reservadas na montagem).
  const renderItem = useCallback(
    ({ item, index }: { item: (typeof items)[number]; index: number }) => (
      <Reveal index={1 + index} once={`cart-line-${index}`} disabled={index >= ANIMATED_LINES}>
        <CartLine
          item={item}
          quote={linesByColor.get(item.colorId)}
          unavailable={unavailable.has(item.colorId)}
          onQuantityChange={setQuantity}
          onRemove={remove}
        />
      </Reveal>
    ),
    [linesByColor, unavailable, setQuantity, remove],
  )

  if (items.length === 0) {
    return (
      <Screen>
        <AppHeader largeTitle="Sacola" />
        <EmptyState
          icon="bag-handle-outline"
          title="Sua sacola está vazia"
          message="Explore o catálogo e adicione as peças que combinam com você."
          actionLabel="Explorar produtos"
          onAction={() => router.navigate('/')}
        />
      </Screen>
    )
  }

  const data = quote.data
  const canCheckout = !!data?.isPurchasable && !quote.isFetching
  const goToCheckout = () =>
    status === 'authenticated'
      ? router.push('/checkout/address')
      : router.push({ pathname: '/sign-in', params: { redirect: '/checkout/address' } })

  return (
    <Screen>
      <AppHeader largeTitle="Sacola" subtitle={pluralize(countItems(items), 'item', 'itens')} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.colorId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <Divider />}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <Reveal index={1 + Math.min(items.length, ANIMATED_LINES)} containerStyle={styles.summary}>
            <Card style={styles.summaryCard}>
              {quote.isError ? (
                <Text variant="label" color="danger" accessibilityLiveRegion="polite">
                  {describeError(quote.error).message}
                </Text>
              ) : null}
              {data && !data.isPurchasable ? (
                <Text variant="label" color="warning" accessibilityLiveRegion="polite">
                  Ajuste os itens destacados para continuar.
                </Text>
              ) : null}
              <SummaryRow label="Subtotal" cents={data?.subtotalCents} />
              <SummaryRow label="Frete" text={data ? (data.shippingCents === 0 ? 'Grátis' : undefined) : undefined} cents={data?.shippingCents} />
              <Divider />
              <SummaryRow label="Total" cents={data?.totalCents} strong />
              <Text variant="caption" color="textMuted">
                Preços e estoque confirmados pelo servidor no momento da compra.
              </Text>
            </Card>
          </Reveal>
        }
      />
      <Reveal index={2 + Math.min(items.length, ANIMATED_LINES)} style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <Button
          title={status === 'authenticated' ? 'Finalizar compra' : 'Entrar para finalizar'}
          icon="arrow-forward"
          iconPosition="right"
          onPress={goToCheckout}
          disabled={!canCheckout}
          loading={quote.isPending}
          fullWidth
        />
        {quote.isError ? <Button title="Tentar novamente" variant="ghost" size="md" onPress={() => void quote.refetch()} /> : null}
      </Reveal>
    </Screen>
  )
}

function SummaryRow({ label, cents, text, strong }: { label: string; cents?: number; text?: string; strong?: boolean }) {
  const styles = useStyles(styleFactory)
  return (
    <View style={styles.summaryRow}>
      <Text variant={strong ? 'headline' : 'body'} color={strong ? 'text' : 'textMuted'}>
        {label}
      </Text>
      {text ? (
        <Text variant="bodyStrong" color="success">
          {text}
        </Text>
      ) : cents !== undefined ? (
        <Price cents={cents} variant={strong ? 'priceLarge' : 'bodyStrong'} />
      ) : (
        <InlineLoader />
      )}
    </View>
  )
}

const styleFactory = makeStyles((t) => ({
  list: { paddingHorizontal: t.layout.gutter, paddingBottom: t.space.xl, gap: t.space.md },
  summary: { marginTop: t.space.lg },
  summaryCard: { gap: t.space.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footer: {
    paddingHorizontal: t.layout.gutter,
    paddingVertical: t.space.sm,
    borderTopWidth: 1,
    backgroundColor: t.colors.bg,
    gap: t.space.xxs,
  },
}))
