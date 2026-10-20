import { router, useLocalSearchParams } from 'expo-router'
import { ScrollView, View } from 'react-native'

import { AddressSummary } from '@/features/addresses/address-card'
import { RequireAuth } from '@/features/auth/require-auth'
import { PAYMENT_LABELS, STATUS_LABELS, useOrder } from '@/features/orders/api'
import { isApiError } from '@/lib/api/errors'
import { formatDate, formatMoney, pluralize } from '@/lib/format'
import { AppHeader, Badge, Card, Divider, EmptyState, ErrorState, LoadingState, makeStyles, Price, ProductImage, Reveal, Screen, Text, useStyles } from '@/ui'

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <RequireAuth>
      <OrderDetail id={id} />
    </RequireAuth>
  )
}

function OrderDetail({ id }: { id: string }) {
  const styles = useStyles(styleFactory)
  const { data: order, error, isPending, refetch } = useOrder(id)

  let content
  if (isPending) {
    content = <LoadingState label="Carregando pedido" />
  } else if (error || !order) {
    // 404 também para pedidos de outra pessoa: o servidor não revela que existem.
    content =
      isApiError(error) && error.status === 404 ? (
        <EmptyState icon="receipt-outline" title="Pedido não encontrado" actionLabel="Ver meus pedidos" onAction={() => router.replace('/orders')} />
      ) : (
        <ErrorState error={error} onRetry={() => void refetch()} />
      )
  } else {
    const status = STATUS_LABELS[order.status]
    content = (
      <ScrollView contentContainerStyle={styles.content}>
        <Reveal index={0} style={styles.titleRow}>
          <View style={styles.flex}>
            <Text variant="display" accessibilityRole="header">
              #{order.number}
            </Text>
            <Text variant="body" color="textMuted">
              Feito em {formatDate(order.createdAt)}
            </Text>
          </View>
          <Badge label={status.label} tone={status.tone} />
        </Reveal>

        <Reveal index={1}>
          <Card style={styles.card}>
            <Text variant="headline">{pluralize(order.itemCount, 'item', 'itens')}</Text>
            {order.items.map((item) => (
              <View
                key={item.id}
                style={styles.item}
                accessible
                accessibilityLabel={`${item.productName}, cor ${item.colorName}, ${item.quantity} unidades de ${formatMoney(item.unitPriceCents)}, total ${formatMoney(item.lineTotalCents)}`}
              >
                <View style={styles.thumb}>
                  <ProductImage uri={item.imageUrl} />
                </View>
                <View style={styles.flex}>
                  <Text variant="label" numberOfLines={2}>
                    {item.productName}
                  </Text>
                  <View style={styles.colorRow}>
                    <View style={[styles.dot, { backgroundColor: item.colorHex }]} />
                    <Text variant="caption" color="textMuted">
                      {item.colorName} · {item.quantity} × {formatMoney(item.unitPriceCents)}
                    </Text>
                  </View>
                </View>
                <Price cents={item.lineTotalCents} variant="bodyStrong" />
              </View>
            ))}
          </Card>
        </Reveal>

        <Reveal index={2}>
          <Card style={styles.card}>
            <Text variant="headline">Entrega</Text>
            <AddressSummary address={order.shippingAddress} />
          </Card>
        </Reveal>

        <Reveal index={3}>
          <Card style={styles.card}>
            <Text variant="headline">Pagamento</Text>
            <Text variant="body">{PAYMENT_LABELS[order.paymentMethod]}</Text>
            <Divider />
            <Row label="Subtotal" value={formatMoney(order.subtotalCents)} />
            <Row label="Frete" value={order.shippingCents === 0 ? 'Grátis' : formatMoney(order.shippingCents)} />
            <Row label="Total" value={formatMoney(order.totalCents)} strong />
          </Card>
        </Reveal>
      </ScrollView>
    )
  }

  return (
    <Screen>
      <AppHeader back title="Pedido" fallbackHref="/orders" />
      {content}
    </Screen>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const styles = useStyles(styleFactory)
  return (
    <View style={styles.row}>
      <Text variant={strong ? 'headline' : 'body'} color={strong ? 'text' : 'textMuted'}>
        {label}
      </Text>
      <Text variant={strong ? 'priceLarge' : 'bodyStrong'} tabular>
        {value}
      </Text>
    </View>
  )
}

const styleFactory = makeStyles((t) => ({
  content: {
    paddingHorizontal: t.layout.gutter,
    paddingBottom: t.space.xxl,
    gap: t.space.md,
    width: '100%',
    maxWidth: t.layout.maxContentWidth,
    alignSelf: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space.sm, paddingTop: t.space.xs },
  flex: { flex: 1, gap: 2 },
  card: { gap: t.space.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  thumb: { width: 56 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: t.radius.pill, borderWidth: 1, borderColor: t.colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
}))
