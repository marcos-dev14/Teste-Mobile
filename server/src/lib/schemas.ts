import { z } from 'zod'

/** Schemas reutilizados por vários módulos. */
export const uuidSchema = z.uuid({ message: 'Identificador inválido.' })

export const idParamsSchema = z.object({ id: uuidSchema })

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export const isoDateSchema = z.iso.datetime({ offset: true })

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.record(z.string(), z.unknown())).optional(),
    requestId: z.string(),
  }),
})

export const paymentMethodSchema = z.enum(['pix', 'credit_card', 'boleto'])

/** Quantidade máxima de uma mesma cor por pedido (também garantida por CHECK no banco). */
export const MAX_QUANTITY_PER_ITEM = 20

export const purchaseItemSchema = z
  .object({
    productId: uuidSchema,
    colorId: uuidSchema,
    quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
  })
  .strict()

export type PurchaseItem = z.infer<typeof purchaseItemSchema>

export const offsetFor = (page: number, pageSize: number) => (page - 1) * pageSize
