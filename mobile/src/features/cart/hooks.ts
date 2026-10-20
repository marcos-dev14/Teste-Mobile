import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { api } from '@/lib/api/client'
import type { CartQuote, PurchaseItem } from '@/lib/api/types'
import { queryKeys } from '@/lib/query-keys'

import { toPurchaseItems } from './cart-logic'
import { useCartStore } from './store'

export const cartApi = {
  quote: (items: PurchaseItem[], signal?: AbortSignal) =>
    api.post<CartQuote>('/v1/cart/quote', { items }, { signal }),
}

/** Cotação autoritativa do servidor para o carrinho atual (preço, estoque, totais). */
export function useCartQuote() {
  const items = useCartStore((state) => state.items)
  const purchaseItems = useMemo(() => toPurchaseItems(items), [items])

  return useQuery({
    queryKey: queryKeys.cartQuote(purchaseItems),
    queryFn: ({ signal }) => cartApi.quote(purchaseItems, signal),
    enabled: purchaseItems.length > 0,
    // Mantém os valores anteriores na tela enquanto a nova cotação chega (sem "piscar").
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}
