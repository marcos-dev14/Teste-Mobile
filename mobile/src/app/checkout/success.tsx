import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef } from 'react'
import { AccessibilityInfo, BackHandler, ScrollView, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { hasOpenInstructions, isAwaitingConfirmation, paymentFailureMessage, useOrderPayment } from '@/features/payments/api'
import { RequireAuth } from '@/features/auth/require-auth'
import { PendingPaymentActions } from '@/features/payments/pending-payment-actions'
import type { OrderDetail } from '@/lib/api/types'
import { haptics } from '@/lib/haptics'
import { Button, ErrorState, Icon, LoadingState, makeStyles, popIn, Reveal, Screen, Text, useStyles, type IconName } from '@/ui'

/** Sai da confirmação para as abas, mesmo quando a tela foi aberta sem pilha (deep link). */
function leaveTo(href: '/' | '/orders' | { pathname: '/orders/[id]'; params: { id: string } }) {
  if (router.canDismiss()) router.dismissAll()
  if (typeof href === 'string') router.navigate(href)
  else router.push(href)
}

type Tone = 'success' | 'warning' | 'danger'

/** Texto e ícone vêm do status do servidor; o retorno do SDK de pagamento nunca decide o que é exibido. */
function describe(order: OrderDetail): { title: string; message: string; icon: IconName; tone: Tone } {
  if (order.status === 'paid') {
    return {
      title: 'Pagamento aprovado',
      message: 'Seu pedido foi confirmado. Ambiente de teste do Stripe: nenhuma cobrança real foi feita.',
      icon: 'checkmark',
      tone: 'success',
    }
  }
  if (order.status === 'pending_payment') {
    if (isAwaitingConfirmation(order)) {
      return { title: 'Confirmando pagamento', message: 'Assim que o Stripe confirmar, esta tela atualiza.', icon: 'time-outline', tone: 'warning' }
    }
    if (hasOpenInstructions(order)) {
      return order.paymentMethod === 'pix'
        ? { title: 'Pague com Pix', message: 'O pedido é confirmado assim que o Pix for pago.', icon: 'flash-outline', tone: 'warning' }
        : { title: 'Boleto gerado', message: 'O pedido é confirmado quando o pagamento do boleto for compensado.', icon: 'barcode-outline', tone: 'warning' }
    }
    return {
      title: order.paymentFailureCode ? 'Pagamento não concluído' : 'Pedido aguardando pagamento',
      message: paymentFailureMessage(order) ?? 'O pagamento ainda não foi concluído.',
      icon: 'card-outline',
      tone: 'warning',
    }
  }
  switch (order.status) {
    case 'expired':
      return { title: 'Pedido expirado', message: 'O prazo de pagamento terminou e os itens voltaram ao estoque.', icon: 'time-outline', tone: 'danger' }
    case 'cancelled':
      return { title: 'Pedido cancelado', message: 'Nenhuma cobrança foi mantida e os itens voltaram ao estoque.', icon: 'close', tone: 'danger' }
    case 'refunded':
      return { title: 'Pedido reembolsado', message: 'O valor pago foi devolvido pelo Stripe.', icon: 'return-down-back-outline', tone: 'warning' }
    case 'shipped':
    case 'delivered':
      return { title: 'Pedido pago', message: 'Acompanhe a entrega em "Meus pedidos".', icon: 'checkmark', tone: 'success' }
    case 'placed':
      return { title: 'Pedido recebido', message: 'Pedido anterior ao pagamento online. Acompanhe em "Meus pedidos".', icon: 'receipt-outline', tone: 'warning' }
  }
}

/** Avisa (som, vibração, leitor de tela) quando o pagamento é confirmado com a tela aberta. */
function useAnnouncePaid(order: OrderDetail | undefined) {
  const previous = useRef(order?.status)
  useEffect(() => {
    if (order?.status === 'paid' && previous.current === 'pending_payment') {
      void haptics.success()
      AccessibilityInfo.announceForAccessibility('Pagamento aprovado.')
    }
    previous.current = order?.status
  }, [order?.status])
}

export default function OrderResultScreen() {
  // Deep link sem sessão: vai ao login em vez de esperar para sempre.
  return (
    <RequireAuth>
      <OrderResult />
    </RequireAuth>
  )
}

function OrderResult() {
  const styles = useStyles(styleFactory)
  const { orderId } = useLocalSearchParams<{ orderId: string; number?: string }>()
  const { data: order, error, isPending, refetch } = useOrderPayment(orderId)
  useAnnouncePaid(order)

  // Voltar a partir do resultado leva ao início, nunca de volta ao checkout.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveTo('/')
      return true
    })
    return () => subscription.remove()
  }, [])

  if (isPending && !order) {
    return (
      <Screen edges={['top', 'bottom']}>
        <LoadingState label="Consultando o pagamento" />
      </Screen>
    )
  }
  // Erro só toma a tela se não há pedido para mostrar; falha de uma consulta periódica não esconde o Pix.
  if (!order) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState error={error} onRetry={() => void refetch()} />
        <Button title="Ver meus pedidos" variant="ghost" onPress={() => leaveTo('/orders')} />
      </Screen>
    )
  }

  const view = describe(order)
  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View
          key={view.tone}
          entering={popIn}
          style={[styles.seal, styles[view.tone]]}
        >
          <Icon name={view.icon} size={44} color="onPrimary" />
        </Animated.View>
        <Reveal index={1} style={styles.copy}>
          <Text variant="display" align="center" accessibilityRole="header" accessibilityLiveRegion="polite">
            {view.title}
          </Text>
          <Text variant="headline" color="accent" align="center">
            #{order.number}
          </Text>
          <Text variant="body" color="textMuted" align="center" style={styles.message}>
            {view.message}
          </Text>
          {error ? (
            <Text variant="caption" color="textMuted" align="center" testID="refresh-error">
              Não foi possível atualizar agora. Tentando de novo…
            </Text>
          ) : null}
        </Reveal>
        <View style={styles.actionsCard}>
          <PendingPaymentActions order={order} />
        </View>
      </ScrollView>
      <Reveal index={2} style={styles.actions}>
        <Button title="Ver detalhes do pedido" variant="secondary" onPress={() => leaveTo({ pathname: '/orders/[id]', params: { id: order.id } })} fullWidth />
        <Button title="Continuar comprando" variant="ghost" onPress={() => leaveTo('/')} fullWidth />
      </Reveal>
    </Screen>
  )
}

const styleFactory = makeStyles((t) => ({
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: t.space.md, paddingHorizontal: t.layout.gutter, paddingVertical: t.space.xl },
  seal: {
    width: 96,
    height: 96,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.space.md,
  },
  success: { backgroundColor: t.colors.success },
  warning: { backgroundColor: t.colors.warning },
  danger: { backgroundColor: t.colors.danger },
  copy: { alignItems: 'center', gap: t.space.md },
  message: { maxWidth: 340 },
  actionsCard: { alignSelf: 'stretch', maxWidth: t.layout.maxContentWidth, width: '100%' },
  actions: { paddingHorizontal: t.layout.gutter, paddingBottom: t.space.md, gap: t.space.xs },
}))
