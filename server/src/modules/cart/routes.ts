import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import type { Pool } from '../../db/pool.js'
import { MAX_LINES_PER_ORDER, purchaseItemSchema, uuidSchema } from '../../lib/schemas.js'
import type { ZodTypeProvider } from '../../lib/zod-compiler.js'
import { aggregateItems, buildQuote, loadColorsForPricing } from '../orders/pricing.js'

export const quoteBodySchema = z
  .object({ items: z.array(purchaseItemSchema).min(1, 'O carrinho está vazio.').max(MAX_LINES_PER_ORDER) })
  .strict()

export const quoteLineSchema = z.object({
  productId: uuidSchema,
  colorId: uuidSchema,
  productName: z.string(),
  colorName: z.string(),
  colorHex: z.string(),
  imageUrl: z.string(),
  unitPriceCents: z.number().int(),
  quantity: z.number().int(),
  lineTotalCents: z.number().int(),
  availableStock: z.number().int(),
  status: z.enum(['ok', 'insufficient_stock']),
})

export const quoteResponseSchema = z.object({
  lines: z.array(quoteLineSchema),
  unavailable: z.array(z.object({ productId: uuidSchema, colorId: uuidSchema })),
  itemCount: z.number().int(),
  subtotalCents: z.number().int(),
  shippingCents: z.number().int(),
  totalCents: z.number().int(),
  isPurchasable: z.boolean(),
})

/** Cotação pública: o app exibe no carrinho os valores calculados aqui, não os que guardou localmente. */
export function cartRoutes(pool: Pool) {
  return async (instance: FastifyInstance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>()

    app.post(
      '/cart/quote',
      { schema: { body: quoteBodySchema, response: { 200: quoteResponseSchema } } },
      async (request) => {
        const items = aggregateItems(request.body.items)
        const rows = await loadColorsForPricing(
          pool,
          items.map((item) => item.colorId),
          { forUpdate: false },
        )
        return buildQuote(items, rows)
      },
    )
  }
}
