import type { PurchaseItem } from '@/lib/api/types'

/** Mesmo limite aplicado pelo servidor. */
export const MAX_QUANTITY_PER_ITEM = 20

/**
 * Item do carrinho local. `snapshot` serve só para exibição imediata/offline;
 * preços e disponibilidade exibidos no resumo vêm da cotação do servidor.
 */
export interface CartItem {
  productId: string
  colorId: string
  quantity: number
  snapshot: {
    name: string
    colorName: string
    colorHex: string
    imageUrl: string
    priceCents: number
  }
}

const clamp = (quantity: number) => Math.max(1, Math.min(MAX_QUANTITY_PER_ITEM, Math.floor(quantity)))

export function addItem(items: CartItem[], item: Omit<CartItem, 'quantity'>, quantity: number): CartItem[] {
  const existing = items.find((current) => current.colorId === item.colorId)
  if (existing) {
    return items.map((current) =>
      current.colorId === item.colorId
        ? { ...current, snapshot: item.snapshot, quantity: clamp(current.quantity + quantity) }
        : current,
    )
  }
  return [...items, { ...item, quantity: clamp(quantity) }]
}

export function setQuantity(items: CartItem[], colorId: string, quantity: number): CartItem[] {
  return items.map((item) => (item.colorId === colorId ? { ...item, quantity: clamp(quantity) } : item))
}

export function removeItem(items: CartItem[], colorId: string): CartItem[] {
  return items.filter((item) => item.colorId !== colorId)
}

export function countItems(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0)
}

export function quantityInCart(items: CartItem[], colorId: string): number {
  return items.find((item) => item.colorId === colorId)?.quantity ?? 0
}

/** Somente identificadores e quantidades seguem para o servidor — nunca preços. */
export function toPurchaseItems(items: CartItem[]): PurchaseItem[] {
  return items.map(({ productId, colorId, quantity }) => ({ productId, colorId, quantity }))
}
