import type { ProductSort, PurchaseItem } from './api/types'

/** Chaves centralizadas. Dados do usuário incluem o userId para nunca misturar contas. */
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (params: { search?: string; sort: ProductSort }) => ['products', 'list', params] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  cartQuote: (items: PurchaseItem[]) => ['cart-quote', items] as const,
  addresses: (userId: string) => ['user', userId, 'addresses'] as const,
  // Dado público de referência (sem userId); a resposta não depende de quem consulta.
  zipCode: (digits: string) => ['zip-code', digits] as const,
  orders: {
    all: (userId: string) => ['user', userId, 'orders'] as const,
    detail: (userId: string, id: string) => ['user', userId, 'orders', id] as const,
  },
  user: (userId: string) => ['user', userId] as const,
}
