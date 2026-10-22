import { View } from 'react-native'

import { describeError } from '@/lib/api/errors'
import type { OrderDetail } from '@/lib/api/types'
import { formatTime } from '@/lib/format'
import { haptics } from '@/lib/haptics'
import { Button, Card, InlineLoader, makeStyles, Text, useConfirm, useStyles, useToast } from '@/ui'

import { hasOpenInstructions, isAsyncMethod, isAwaitingConfirmation, paymentFailureMessage, useCancelOrder, usePayOrder, type PayResult } from './api'
import { AsyncPaymentPanel } from './async-payment'

type Toast = ReturnType<typeof useToast>

/** Feedback após iniciar o pagamento, sempre a partir do status devolvido pelo servidor. */
export function showPaymentFeedback(toast: Toast, { outcome, order, session }: PayResult) {
  if (!order) {
    // Não deu para confirmar agora; a tela do pedido consulta o servidor de novo.
    toast.show({ tone: 'info', message: 'Verificando o pagamento…' })
  } else if (order.status === 'paid') {
    void haptics.success()
    toast.show({ tone: 'success', message: 'Pagamento aprovado.' })
  } else if (session.method === 'pix') {
    toast.show({ tone: 'info', message: 'Pix gerado. Pague pelo app do seu banco.' })
  } else if (session.method === 'boleto') {
    toast.show({ tone: 'info', message: 'Boleto gerado.' })
  } else if (isAwaitingConfirmation(order)) {
    toast.show({ tone: 'info', message: 'Estamos confirmando seu pagamento.' })
  } else if (outcome?.kind === 'failed') {
    void haptics.error()
    toast.show({ tone: 'error', message: outcome.message })
  } else if (outcome?.kind === 'canceled') {
    const until = order.reservedUntil ? ` Você pode pagar até ${formatTime(order.reservedUntil)}.` : ''
    toast.show({ tone: 'info', message: `Pagamento não concluído.${until}` })
  } else {
    // SDK disse "concluído", mas o servidor ainda não confirmou: nunca exibimos sucesso por conta própria.
    toast.show({ tone: 'info', message: 'Ainda não recebemos a confirmação do pagamento. Tente novamente.' })
  }
}

/** Ações de um pedido aguardando pagamento: pagar (cartão, Pix ou boleto) ou cancelar. */
export function PendingPaymentActions({ order }: { order: OrderDetail }) {
  const styles = useStyles(styleFactory)
  const toast = useToast()
  const confirm = useConfirm()
  const pay = usePayOrder()
  const cancel = useCancelOrder()

  if (order.status !== 'pending_payment') return null

  if (isAwaitingConfirmation(order)) {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <InlineLoader />
          <Text variant="headline">Confirmando pagamento</Text>
        </View>
        <Text variant="body" color="textMuted">
          O Stripe está processando o pagamento. Esta tela atualiza sozinha.
        </Text>
      </Card>
    )
  }

  const confirmCancel = async () => {
    const confirmed = await confirm({
      title: 'Cancelar pedido?',
      message: 'Os itens voltam ao estoque e nenhuma cobrança será feita.',
      confirmLabel: 'Cancelar pedido',
      cancelLabel: 'Manter pedido',
      tone: 'danger',
      icon: 'bag-remove-outline',
    })
    if (!confirmed) return
    cancel.mutate(order.id, {
      onSuccess: () => toast.show({ tone: 'info', message: 'Pedido cancelado.' }),
      onError: (error) => toast.show({ tone: 'error', message: describeError(error).message }),
    })
  }

  // Boleto emitido não pode ser cancelado no Stripe antes de vencer.
  const canCancel = !(order.paymentMethod === 'boleto' && hasOpenInstructions(order))
  const cancelButton = canCancel ? (
    <Button
      title="Cancelar pedido"
      variant="ghost"
      size="md"
      loading={cancel.isPending}
      disabled={pay.isPending}
      onPress={() => void confirmCancel()}
      fullWidth
      testID="cancel-order"
    />
  ) : null

  if (isAsyncMethod(order.paymentMethod)) {
    return (
      <View style={styles.stack}>
        <AsyncPaymentPanel order={order} />
        {cancelButton}
      </View>
    )
  }

  const failure = paymentFailureMessage(order)
  return (
    <Card style={styles.card}>
      <Text variant="headline">Pagamento pendente</Text>
      {failure ? (
        <Text variant="body" color="danger" testID="payment-failure">
          {failure}
        </Text>
      ) : null}
      {order.reservedUntil ? (
        <Text variant="body" color="textMuted">
          Seus itens ficam reservados até {formatTime(order.reservedUntil)}. Depois disso o pedido expira automaticamente.
        </Text>
      ) : null}
      <Button
        title="Pagar agora"
        icon="card-outline"
        loading={pay.isPending}
        disabled={cancel.isPending}
        onPress={() =>
          pay.mutate(
            { orderId: order.id },
            {
              onSuccess: (result) => showPaymentFeedback(toast, result),
              onError: (error) => toast.show({ tone: 'error', message: describeError(error).message }),
            },
          )
        }
        fullWidth
        testID="pay-now"
      />
      {cancelButton}
    </Card>
  )
}

const styleFactory = makeStyles((t) => ({
  card: { gap: t.space.sm },
  stack: { gap: t.space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.xs },
}))
