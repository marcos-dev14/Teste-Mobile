import { router } from 'expo-router'
import { View } from 'react-native'

import { AddressSummary } from '@/features/addresses/address-card'
import { useAddresses } from '@/features/addresses/api'
import { toPurchaseItems } from '@/features/cart/cart-logic'
import { useCartQuote } from '@/features/cart/hooks'
import { useCartStore } from '@/features/cart/store'
import { CheckoutLayout, CONTENT_ENTRANCE } from '@/features/checkout/checkout-layout'
import { idempotencyKeyFor, useCheckout } from '@/features/checkout/store'
import { useSubmitOrder } from '@/features/checkout/use-submit-order'
import { PAYMENT_LABELS } from '@/features/orders/api'
import { formatMoney, pluralize } from '@/lib/format'
import { Button, Card, Divider, ErrorState, InlineLoader, LoadingState, makeStyles, Price, ProductImage, Reveal, Text, useStyles } from '@/ui'

const PAY_LABELS = { credit_card: 'Pagar', pix: 'Gerar Pix', boleto: 'Gerar boleto' } as const

export default function CheckoutReviewScreen() {
  const styles = useStyles(styleFactory)
  const items = useCartStore((state) => state.items)
  const quote = useCartQuote()
  const addresses = useAddresses()
  const addressId = useCheckout((state) => state.addressId)
  const paymentMethod = useCheckout((state) => state.paymentMethod)
  const submit = useSubmitOrder({ onStockChanged: () => void quote.refetch() })

  const address = addresses.data?.find((item) => item.id === addressId)
  const data = quote.data

  const confirm = () => {
    if (!address || !data?.isPurchasable || submit.isPending) return
    const input = { addressId: address.id, paymentMethod, items: toPurchaseItems(items) }
    submit.mutate({ input, idempotencyKey: idempotencyKeyFor(JSON.stringify(input)) })
  }

  if (items.length === 0 && submit.isIdle) {
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
          title={`${PAY_LABELS[paymentMethod]}${data ? ` · ${formatMoney(data.totalCents)}` : ''}`}
          icon="lock-closed-outline"
          onPress={confirm}
          loading={submit.isPending}
          disabled={!address || !data?.isPurchasable || quote.isFetching}
          fullWidth
          testID="place-order"
        />
      }
    >
      {quote.isError ? <ErrorState error={quote.error} onRetry={() => void quote.refetch()} /> : null}

      <Reveal index={CONTENT_ENTRANCE}>
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
            <LoadingState layout="inline" label="Calculando itens" />
          )}
        </Card>
      </Reveal>

      <Reveal index={CONTENT_ENTRANCE + 1}>
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="headline">Entrega</Text>
            <Button title="Alterar" variant="ghost" size="md" onPress={() => router.navigate('/checkout/address')} />
          </View>
          {address ? (
            <AddressSummary address={address} />
          ) : addresses.isPending ? (
            <LoadingState layout="inline" label="Carregando endereço" />
          ) : (
            // Sem endereço escolhido (deep link, endereço removido): não fica carregando para sempre.
            <Button title="Escolher endereço" variant="secondary" onPress={() => router.navigate('/checkout/address')} />
          )}
        </Card>
      </Reveal>

      <Reveal index={CONTENT_ENTRANCE + 2}>
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="headline">Pagamento</Text>
            <Button title="Alterar" variant="ghost" size="md" onPress={() => router.navigate('/checkout/payment')} />
          </View>
          <Text variant="body">{PAYMENT_LABELS[paymentMethod]}</Text>
        </Card>
      </Reveal>

      <Reveal index={CONTENT_ENTRANCE + 3}>
        <Card style={styles.card}>
          <Row label={data ? `Subtotal (${pluralize(data.itemCount, 'item', 'itens')})` : 'Subtotal'} cents={data?.subtotalCents} />
          <Row label="Frete" cents={data?.shippingCents} free={data?.shippingCents === 0} />
          <Divider />
          <Row label="Total" cents={data?.totalCents} strong />
        </Card>
      </Reveal>
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
        <InlineLoader />
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
