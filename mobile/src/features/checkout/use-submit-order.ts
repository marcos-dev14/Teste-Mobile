import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'

import { useCurrentUser } from '@/features/auth/require-auth'
import { usePlaceOrder } from '@/features/orders/api'
import { isAsyncMethod, usePayOrder, type PayResult } from '@/features/payments/api'
import { showPaymentFeedback } from '@/features/payments/pending-payment-actions'
import { describeError, isApiError } from '@/lib/api/errors'
import type { CreateOrderInput, OrderDetail } from '@/lib/api/types'
import { haptics } from '@/lib/haptics'
import { queryKeys } from '@/lib/query-keys'
import { useToast } from '@/ui'

import { useCheckout } from './store'

interface SubmitResult {
  order: OrderDetail
  /** Ausente se o pagamento não pôde ser iniciado (a tela de resultado permite tentar de novo). */
  payment: PayResult | null
  paymentError: unknown
}

/**
 * Finaliza a compra: cria o pedido (idempotente) e inicia o pagamento. Os efeitos — navegar,
 * avisar, zerar o checkout — ficam nos callbacks do próprio `useMutation`, que o React Query
 * executa mesmo se a tela de revisão for desmontada no meio (voltar, sessão expirada). Callbacks
 * passados a `mutate()` seriam descartados e o pedido criado ficaria "invisível".
 */
export function useSubmitOrder({ onStockChanged }: { onStockChanged: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const user = useCurrentUser()
  const placeOrder = usePlaceOrder()
  const payOrder = usePayOrder()

  return useMutation({
    mutationFn: async ({ input, idempotencyKey }: { input: CreateOrderInput; idempotencyKey: string }): Promise<SubmitResult> => {
      const order = await placeOrder.mutateAsync({ input, idempotencyKey })
      const { taxId } = useCheckout.getState()
      try {
        const payment = await payOrder.mutateAsync(isAsyncMethod(order.paymentMethod) ? { orderId: order.id, taxId } : { orderId: order.id })
        return { order, payment, paymentError: null }
      } catch (paymentError) {
        return { order, payment: null, paymentError }
      }
    },
    onSuccess: ({ order, payment, paymentError }) => {
      if (payment) showPaymentFeedback(toast, payment)
      else toast.show({ tone: 'error', message: describeError(paymentError).message })
      // Remove as etapas do checkout do histórico: "voltar" no resultado leva às abas.
      if (router.canDismiss()) router.dismissAll()
      router.push({ pathname: '/checkout/success', params: { orderId: order.id, number: String(order.number) } })
      // Só agora a compra termina: zera a chave de idempotência e o CPF/CNPJ.
      useCheckout.getState().reset()
    },
    onError: (error) => {
      void haptics.error()
      if (isApiError(error) && (error.code === 'INSUFFICIENT_STOCK' || error.code === 'ITEM_UNAVAILABLE')) {
        onStockChanged()
        toast.show({ tone: 'error', message: 'O estoque mudou. Revise sua sacola.', actionLabel: 'Ver sacola', onAction: () => router.navigate('/cart') })
      } else if (isApiError(error) && error.code === 'ADDRESS_NOT_FOUND') {
        // Endereço removido (ex.: em outro aparelho): descarta a seleção e recarrega a lista.
        useCheckout.getState().setAddress(null)
        void queryClient.invalidateQueries({ queryKey: queryKeys.addresses(user?.id ?? 'anon') })
        toast.show({ tone: 'error', message: 'Endereço não encontrado. Escolha outro.' })
        router.navigate('/checkout/address')
      } else {
        // Falha de rede/timeout: a mesma chave (persistida) será reutilizada na nova tentativa.
        toast.show({ tone: 'error', message: describeError(error).message })
      }
    },
  })
}
