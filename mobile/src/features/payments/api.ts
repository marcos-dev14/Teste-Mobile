import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useIsFocused } from 'expo-router'

import { useCurrentUser } from '@/features/auth/require-auth'
import { api } from '@/lib/api/client'
import { isApiError } from '@/lib/api/errors'
import type { OrderDetail, PaymentMethod, PaymentSession } from '@/lib/api/types'
import { queryKeys } from '@/lib/query-keys'

import { payWithCard, type PaymentSheetOutcome } from './payment-sheet'

export const paymentsApi = {
  /** Formas de pagamento habilitadas no servidor (conforme a conta Stripe). */
  methods: () => api.get<{ data: PaymentMethod[]; testMode: boolean }>('/v1/payment-methods'),
  /** Cartão: client secret para o painel de cartão. Pix/boleto: instruções (o CPF/CNPJ só é enviado para gerá-las). */
  start: (orderId: string, taxId?: string) =>
    api.post<PaymentSession>(`/v1/orders/${orderId}/payment`, taxId ? { taxId } : undefined, { auth: true }),
  /** O servidor consulta o Stripe e devolve o pedido com o status real. */
  sync: (orderId: string) => api.post<OrderDetail>(`/v1/orders/${orderId}/payment/sync`, undefined, { auth: true }),
  cancel: (orderId: string) => api.post<OrderDetail>(`/v1/orders/${orderId}/cancel`, undefined, { auth: true }),
}

export const isAsyncMethod = (method: PaymentMethod) => method === 'pix' || method === 'boleto'

/** Pagamento em andamento no Stripe: vale consultar de novo em instantes. */
export const isAwaitingConfirmation = (order: OrderDetail | undefined) =>
  order?.status === 'pending_payment' &&
  (order.paymentStatus === 'processing' ||
    order.paymentStatus === 'requires_capture' ||
    order.paymentStatus === 'requires_confirmation')

/** Pix ou boleto já gerado, aguardando o cliente pagar. */
export const hasOpenInstructions = (order: OrderDetail | undefined) =>
  order?.status === 'pending_payment' && isAsyncMethod(order.paymentMethod) && order.paymentStatus === 'requires_action'

/**
 * Intervalo de consulta ao servidor: rápido quando o Stripe está processando; Pix a cada 5 s até
 * vencer e, depois do prazo, a cada 15 s até o servidor encerrar o pedido (a rotina de expiração
 * roda a cada minuto); boleto não (leva dias). Ao receber 429, recua para não piorar o limite.
 */
export function pollingInterval(order: OrderDetail | undefined, error?: unknown): number | false {
  let interval: number | false = false
  if (isAwaitingConfirmation(order)) interval = 3_000
  else if (hasOpenInstructions(order) && order?.paymentMethod === 'pix') {
    const expired = order.reservedUntil !== null && Date.parse(order.reservedUntil) < Date.now()
    interval = expired ? 15_000 : 5_000
  }
  if (interval && isApiError(error) && error.status === 429) return 30_000
  return interval
}

/** Métodos habilitados e se o servidor opera com o Stripe em modo de teste. */
export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: async () => {
      const { data, testMode } = await paymentsApi.methods()
      return { methods: data, testMode }
    },
    staleTime: 5 * 60_000,
  })
}

function useOrderCache() {
  const user = useCurrentUser()
  const client = useQueryClient()
  const userId = user?.id ?? 'anon'
  return {
    userId,
    client,
    setOrder: (order: OrderDetail) => {
      client.setQueryData(queryKeys.orders.detail(userId, order.id), order)
      void client.invalidateQueries({ queryKey: queryKeys.orders.all(userId) })
      // Cancelamento e expiração devolvem estoque ao catálogo.
      if (order.status === 'cancelled' || order.status === 'expired') {
        void client.invalidateQueries({ queryKey: queryKeys.products.all })
      }
    },
  }
}

export interface PayResult {
  /** null se a consulta logo após o pagamento falhou: a tela de resultado reconcilia em seguida. */
  order: OrderDetail | null
  session: PaymentSession
  /** Só para cartão (resultado do painel de cartão). É uma dica de UX: o status vem do servidor. */
  outcome: PaymentSheetOutcome | null
}

/**
 * Cartão: abre o painel de cartão e depois pergunta ao servidor o status real.
 * Pix/boleto: gera as instruções (QR Code ou boleto). Em nenhum caso o app decide que está pago.
 */
export function usePayOrder() {
  const { userId, client, setOrder } = useOrderCache()
  return useMutation({
    mutationFn: async ({ orderId, taxId }: { orderId: string; taxId?: string }): Promise<PayResult> => {
      const session = await paymentsApi.start(orderId, taxId)
      const outcome = session.method === 'card' ? await payWithCard(session) : null
      // Falha aqui não significa pagamento falho (o cartão pode ter sido aprovado): não vira erro.
      const order = await paymentsApi.sync(orderId).catch(() => null)
      return { order, session, outcome }
    },
    onSuccess: ({ order, session }, { orderId }) => {
      if (session.method !== 'card') client.setQueryData(queryKeys.orders.payment(userId, orderId), session)
      if (order) setOrder(order)
      else void client.invalidateQueries({ queryKey: queryKeys.orders.detail(userId, orderId) })
    },
  })
}

export function useCancelOrder() {
  const { setOrder } = useOrderCache()
  return useMutation({ mutationFn: paymentsApi.cancel, onSuccess: setOrder })
}

/** Instruções vigentes do Pix/boleto (o servidor as relê no Stripe; não pede o CPF de novo). */
export function usePaymentInstructions(order: OrderDetail) {
  const { userId } = useOrderCache()
  return useQuery({
    queryKey: queryKeys.orders.payment(userId, order.id),
    queryFn: () => paymentsApi.start(order.id),
    enabled: hasOpenInstructions(order),
    retry: false,
    staleTime: 60_000,
  })
}

/**
 * Pedido com reconciliação: enquanto o pagamento está em processamento, ou um Pix aguarda o
 * cliente, o servidor é consultado periodicamente — sem depender da chegada do webhook.
 */
export function useOrderPayment(orderId: string | undefined) {
  const user = useCurrentUser()
  // Só consulta com a tela em foco: um Pix aberto embaixo de outra tela não gasta requisições.
  const focused = useIsFocused()
  return useQuery({
    queryKey: queryKeys.orders.detail(user?.id ?? 'anon', orderId ?? ''),
    queryFn: () => paymentsApi.sync(orderId!),
    enabled: !!user && !!orderId && focused,
    refetchInterval: (query) => pollingInterval(query.state.data, query.state.error),
  })
}

/** Texto para o código de falha informado pelo Stripe (sem expor detalhes técnicos). */
export function paymentFailureMessage(order: OrderDetail): string | null {
  const code = order.paymentFailureCode
  if (!code || order.status !== 'pending_payment') return null
  if (order.paymentMethod === 'pix') return 'O Pix anterior expirou ou não foi concluído. Gere um novo código para pagar.'
  if (order.paymentMethod === 'boleto') return 'O boleto venceu sem pagamento.'
  return cardErrorMessage(code)
}

/** Texto em português para os códigos de erro/recusa de cartão do Stripe. */
export function cardErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'insufficient_funds':
      return 'Saldo ou limite insuficiente. Tente outro cartão.'
    case 'expired_card':
      return 'O cartão está vencido.'
    case 'incorrect_cvc':
    case 'invalid_cvc':
      return 'O código de segurança não confere.'
    case 'incorrect_number':
    case 'invalid_number':
      return 'Número do cartão inválido.'
    case 'invalid_expiry_month':
    case 'invalid_expiry_year':
      return 'Data de validade inválida.'
    case 'processing_error':
      return 'Não foi possível processar o cartão. Tente novamente.'
    case 'authentication_required':
    case 'payment_intent_authentication_failure':
      return 'A autenticação do cartão não foi concluída. Tente novamente.'
  }
  if (code === 'card_declined' || code?.endsWith('_decline')) return 'O cartão foi recusado. Tente outro cartão.'
  return 'O pagamento não foi aprovado. Tente novamente.'
}
