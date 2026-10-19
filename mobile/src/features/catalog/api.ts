import { api } from '@/lib/api/client'
import type { Paginated, ProductDetail, ProductSort, ProductSummary } from '@/lib/api/types'

export const catalogApi = {
  list: (params: { search?: string; sort: ProductSort; page: number; pageSize: number }, signal?: AbortSignal) =>
    api.get<Paginated<ProductSummary>>('/v1/products', { query: params, signal }),
  get: (id: string, signal?: AbortSignal) => api.get<ProductDetail>(`/v1/products/${id}`, { signal }),
}
