import { router } from 'expo-router'
import { View } from 'react-native'

import { AddressSummary } from '@/features/addresses/address-card'
import { useAddresses } from '@/features/addresses/api'
import { toPurchaseItems } from '@/features/cart/cart-logic'
import { useCartQuote } from '@/features/cart/hooks'
import { useCartStore } from '@/features/cart/store'
import { CheckoutLayout } from '@/features/checkout/checkout-layout'
import { idempotencyKeyFor, useCheckout } from '@/features/checkout/store'
import { PAYMENT_LABELS, usePlaceOrder } from '@/features/orders/api'
import { describeError, isApiError } from '@/lib/api/errors'
import { formatMoney, pluralize } from '@/lib/format'
import { haptics } from '@/lib/haptics'
import { Button, Card, Divider, ErrorState, makeStyles, Price, ProductImage, Skeleton, Text, useStyles, useToast } from '@/ui'

export default function CheckoutReviewScreen() {
  const styles = useStyles(styleFactory)
  const toast = useToast()
  const items = useCartStore((state) => state.items)
  const quote = useCartQuote()
  const addresses = useAddresses()
  const addressId = useCheckout((state) => state.addressId)
  const paymentMethod = useCheckout((state) => state.paymentMethod)
  const placeOrder = usePlaceOrder()

  const address = addresses.data?.find((item) => item.id === addressId)
  const data = quote.data

  const confirm = () => {
    if (!address || !data?.isPurchasable) return
    const input = { addressId: address.id, paymentMethod, items: toPurchaseItems(items) }
    const idempotencyKey = idempotencyKeyFor(JSON.stringify(input))
    placeOrder.mutate(
      { input, idempotencyKey },
      {
        onSuccess: (order) => {
          void haptics.success()
          useCheckout.getState().reset()
          // Remove as etapas do checkout do histórico: "voltar" na confirmação leva às abas.
          router.dismissAll()
          router.push({ pathname: '/checkout/success', params: { orderId: order.id, number: String(order.number) } })
        },
        onError: (error) => {
          void haptics.error()
          if (isApiError(error) && (error.code === 'INSUFFICIENT_STOCK' || error.code === 'ITEM_UNAVAILABLE')) {
            void quote.refetch()
            toast.show({ tone: 'error', message: 'O estoque mudou. Revise sua sacola.', actionLabel: 'Ver sacola', onAction: () => router.navigate('/cart') })
          } else if (isApiError(error) && error.code === 'ADDRESS_NOT_FOUND') {
            toast.show({ tone: 'error', message: 'Endereço não encontrado. Escolha outro.' })
            router.navigate('/checkout/address')
          } else {
            // Falha de rede: a mesma chave de idempotência será reutilizada na nova tentativa.
            toast.show({ tone: 'error', message: describeError(error).message })
          }
        },
      },
    )
  }

  if (items.length === 0 && !placeOrder.isSuccess) {
    return (
      <CheckoutLayout step={2} title="Revisão">
        <Text variant="body" color="textMuted">
          Sua sacola está vazia.
        </Text>
        <Button title="Voltar às compras" variant="secondary" onPress={() => router.navigate('/')} />
      </CheckoutLayout>
    )
  }

  return (
    <CheckoutLayout
      step={2}
      title="Confira e confirme"
      footer={
        <Button
          title={data ? `Confirmar pedido · ${formatMoney(data.totalCents)}` : 'Confirmar pedido'}
          onPress={confirm}
          loading={placeOrder.isPending}
          disabled={!address || !data?.isPurchasable || quote.isFetching}
          fullWidth
          testID="place-order"
        />
      }
    >
      {quote.isError ? <ErrorState error={quote.error} onRetry={() => void quote.refetch()} /> : null}

      <Card style={styles.card}>
        <Text variant="headline">Itens</Text>
        {data ? (
          data.lines.map((line) => (
            <View key={line.colorId} style={styles.line}>
              <View style={styles.thumb}>
                <ProductImage uri={line.imageUrl} recyclingKey={line.colorId} />
              </View>
              <View style={styles.flex}>
                <Text variant="label" numberOfLines={2}>
                  {line.productName}
                </Text>
                <Text variant="caption" color="textMuted">
                  {line.colorName} · {line.quantity}×
                </Text>
                {line.status !== 'ok' ? (
                  <Text variant="caption" color="danger">
                    Só {line.availableStock} em estoque
                  </Text>
                ) : null}
              </View>
              <Price cents={line.lineTotalCents} variant="bodyStrong" />
            </View>
          ))
        ) : (
          <Skeleton height={64} />
        )}
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="headline">Entrega</Text>
          <Button title="Alterar" variant="ghost" size="md" onPress={() => router.navigate('/checkout/address')} />
        </View>
        {address ? <AddressSummary address={address} /> : <Skeleton height={60} />}
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="headline">Pagamento</Text>
          <Button title="Alterar" variant="ghost" size="md" onPress={() => router.navigate('/checkout/payment')} />
        </View>
        <Text variant="body">{PAYMENT_LABELS[paymentMethod]}</Text>
      </Card>

      <Card style={styles.card}>
        <Row label={data ? `Subtotal (${pluralize(data.itemCount, 'item', 'itens')})` : 'Subtotal'} cents={data?.subtotalCents} />
        <Row label="Frete" cents={data?.shippingCents} free={data?.shippingCents === 0} />
        <Divider />
        <Row label="Total" cents={data?.totalCents} strong />
      </Card>
    </CheckoutLayout>
  )
}

function Row({ label, cents, strong, free }: { label: string; cents?: number; strong?: boolean; free?: boolean }) {
  const styles = useStyles(styleFactory)
  return (
    <View style={styles.row}>
      <Text variant={strong ? 'headline' : 'body'} color={strong ? 'text' : 'textMuted'}>
        {label}
      </Text>
      {free ? (
        <Text variant="bodyStrong" color="success">
          Grátis
        </Text>
      ) : cents !== undefined ? (
        <Price cents={cents} variant={strong ? 'priceLarge' : 'bodyStrong'} />
      ) : (
        <Skeleton width={80} height={18} />
      )}
    </View>
  )
}

const styleFactory = makeStyles((t) => ({
  card: { gap: t.space.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: -t.space.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  thumb: { width: 52 },
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
}))
