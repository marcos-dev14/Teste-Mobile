import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import type { ProductSort } from '@/lib/api/types'
import { queryKeys } from '@/lib/query-keys'

import { catalogApi } from './api'

export const PRODUCTS_PAGE_SIZE = 20

export function useProductList(params: { search?: string; sort: ProductSort }) {
  return useInfiniteQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: ({ pageParam, signal }) =>
      catalogApi.list({ ...params, page: pageParam, pageSize: PRODUCTS_PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    // Catálogo muda pouco: evita refetch a cada troca de aba.
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(id ?? ''),
    queryFn: ({ signal }) => catalogApi.get(id!, signal),
    enabled: !!id,
    // Estoque muda com pedidos: detalhe fica "fresco" por menos tempo.
    staleTime: 30_000,
  })
}

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
