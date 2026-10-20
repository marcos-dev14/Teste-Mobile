import type { Queryable } from '../../db/pool.js'
import { badRequest } from '../../lib/errors.js'
import { MAX_QUANTITY_PER_ITEM, type PurchaseItem } from '../../lib/schemas.js'

/** Frete fora do escopo atual: sempre grátis, mas calculado no servidor para o total ser autoritativo. */
export const SHIPPING_CENTS = 0

export interface ColorPricingRow {
  colorId: string
  productId: string
  productName: string
  productActive: boolean
  colorName: string
  colorHex: string
  imageUrl: string
  priceCents: number
  stock: number
}

export type LineStatus = 'ok' | 'insufficient_stock'

export interface PricedLine {
  productId: string
  colorId: string
  productName: string
  colorName: string
  colorHex: string
  imageUrl: string
  unitPriceCents: number
  quantity: number
  lineTotalCents: number
  availableStock: number
  status: LineStatus
}

export interface Quote {
  lines: PricedLine[]
  unavailable: { productId: string; colorId: string }[]
  itemCount: number
  subtotalCents: number
  shippingCents: number
  totalCents: number
  isPurchasable: boolean
}

/** Junta linhas repetidas da mesma cor. Quantidade somada acima do limite é erro de entrada. */
export function aggregateItems(items: PurchaseItem[]): PurchaseItem[] {
  const byColor = new Map<string, PurchaseItem>()
  for (const item of items) {
    const key = `${item.productId}:${item.colorId}`
    const existing = byColor.get(key)
    byColor.set(key, existing ? { ...existing, quantity: existing.quantity + item.quantity } : { ...item })
  }
  const merged = [...byColor.values()]
  const overLimit = merged.filter((item) => item.quantity > MAX_QUANTITY_PER_ITEM)
  if (overLimit.length > 0) {
    throw badRequest(
      'QUANTITY_LIMIT',
      `Máximo de ${MAX_QUANTITY_PER_ITEM} unidades por item.`,
      overLimit.map((item) => ({ message: 'Quantidade acima do limite.', colorId: item.colorId })),
    )
  }
  return merged
}

/** Calcula preços e disponibilidade exclusivamente a partir do banco. Função pura. */
export function buildQuote(items: PurchaseItem[], rows: ColorPricingRow[]): Quote {
  const rowsByColor = new Map(rows.map((row) => [row.colorId, row]))
  const lines: PricedLine[] = []
  const unavailable: Quote['unavailable'] = []

  for (const item of items) {
    const row = rowsByColor.get(item.colorId)
    // Cor inexistente, de outro produto ou produto desativado.
    if (!row || row.productId !== item.productId || !row.productActive) {
      unavailable.push({ productId: item.productId, colorId: item.colorId })
      continue
    }
    lines.push({
      productId: row.productId,
      colorId: row.colorId,
      productName: row.productName,
      colorName: row.colorName,
      colorHex: row.colorHex,
      imageUrl: row.imageUrl,
      unitPriceCents: row.priceCents,
      quantity: item.quantity,
      lineTotalCents: row.priceCents * item.quantity,
      availableStock: row.stock,
      status: row.stock >= item.quantity ? 'ok' : 'insufficient_stock',
    })
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0)
  return {
    lines,
    unavailable,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalCents,
    shippingCents: SHIPPING_CENTS,
    totalCents: subtotalCents + SHIPPING_CENTS,
    isPurchasable:
      lines.length > 0 && unavailable.length === 0 && lines.every((line) => line.status === 'ok'),
  }
}

interface PricingRow {
  color_id: string
  product_id: string
  product_name: string
  product_active: boolean
  color_name: string
  color_hex: string
  image_url: string
  price_cents: number
  stock: number
}

/**
 * Carrega preço e estoque atuais. Com `forUpdate`, trava as linhas de cor em ordem de id
 * (ordem determinística evita deadlock entre pedidos concorrentes).
 */
export async function loadColorsForPricing(
  db: Queryable,
  colorIds: string[],
  options: { forUpdate: boolean },
): Promise<ColorPricingRow[]> {
  if (colorIds.length === 0) return []
  const { rows } = await db.query<PricingRow>(
    `SELECT pc.id AS color_id, p.id AS product_id, p.name AS product_name, p.is_active AS product_active,
            pc.name AS color_name, pc.hex AS color_hex, pc.image_urls[1] AS image_url,
            p.price_cents, pc.stock
       FROM product_colors pc
       JOIN products p ON p.id = pc.product_id
      WHERE pc.id = ANY($1::uuid[])
      ORDER BY pc.id
      ${options.forUpdate ? 'FOR UPDATE OF pc' : ''}`,
    [colorIds],
  )
  return rows.map((row) => ({
    colorId: row.color_id,
    productId: row.product_id,
    productName: row.product_name,
    productActive: row.product_active,
    colorName: row.color_name,
    colorHex: row.color_hex,
    imageUrl: row.image_url,
    priceCents: row.price_cents,
    stock: row.stock,
  }))
}
