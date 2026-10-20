import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentUser } from '@/features/auth/require-auth'
import { useCartStore } from '@/features/cart/store'
import { api } from '@/lib/api/client'
import type { CreateOrderInput, OrderDetail, OrderStatus, OrderSummary, Paginated, PaymentMethod } from '@/lib/api/types'
import { queryKeys } from '@/lib/query-keys'

export const ordersApi = {
  create: (input: CreateOrderInput, idempotencyKey: string) =>
    api.post<OrderDetail>('/v1/orders', input, { auth: true, headers: { 'Idempotency-Key': idempotencyKey } }),
  list: (page: number, signal?: AbortSignal) =>
    api.get<Paginated<OrderSummary>>('/v1/orders', { auth: true, query: { page, pageSize: 20 }, signal }),
  get: (id: string, signal?: AbortSignal) => api.get<OrderDetail>(`/v1/orders/${id}`, { auth: true, signal }),
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  credit_card: 'Cartão de crédito',
  boleto: 'Boleto bancário',
}

export const STATUS_LABELS: Record<OrderStatus, { label: string; tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }> = {
  placed: { label: 'Recebido', tone: 'accent' },
  paid: { label: 'Pago', tone: 'success' },
  shipped: { label: 'Enviado', tone: 'warning' },
  delivered: { label: 'Entregue', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
}

export function useOrders() {
  const user = useCurrentUser()
  return useInfiniteQuery({
    queryKey: queryKeys.orders.all(user?.id ?? 'anon'),
    queryFn: ({ pageParam, signal }) => ordersApi.list(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled: !!user,
  })
}

export function useOrder(id: string | undefined) {
  const user = useCurrentUser()
  return useQuery({
    queryKey: queryKeys.orders.detail(user?.id ?? 'anon', id ?? ''),
    queryFn: ({ signal }) => ordersApi.get(id!, signal),
    enabled: !!user && !!id,
  })
}

export function usePlaceOrder() {
  const user = useCurrentUser()
  const client = useQueryClient()
  const clearCart = useCartStore((state) => state.clear)
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateOrderInput; idempotencyKey: string }) =>
      ordersApi.create(input, idempotencyKey),
    onSuccess: (order) => {
      clearCart()
      const userId = user?.id ?? 'anon'
      client.setQueryData(queryKeys.orders.detail(userId, order.id), order)
      void client.invalidateQueries({ queryKey: queryKeys.orders.all(userId) })
      // Estoque mudou: catálogo e cotações precisam ser recarregados.
      void client.invalidateQueries({ queryKey: queryKeys.products.all })
      client.removeQueries({ queryKey: ['cart-quote'] })
    },
  })
}
