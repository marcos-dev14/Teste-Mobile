import { z } from 'zod'

import {
  isoDateSchema,
  MAX_LINES_PER_ORDER,
  paginationQuerySchema,
  paymentMethodSchema,
  purchaseItemSchema,
  uuidSchema,
} from '../../lib/schemas.js'

export const createOrderBodySchema = z
  .object({
    addressId: uuidSchema,
    paymentMethod: paymentMethodSchema,
    items: z.array(purchaseItemSchema).min(1, 'O pedido precisa ter ao menos um item.').max(MAX_LINES_PER_ORDER),
  })
  .strict()

export const createOrderHeadersSchema = z.object({
  'idempotency-key': z.uuid({ message: 'Envie o header Idempotency-Key com um UUID.' }),
})

export const listOrdersQuerySchema = paginationQuerySchema

// 'placed' só existe em pedidos anteriores à integração de pagamento (migration 0003).
export const orderStatusSchema = z.enum([
  'pending_payment',
  'placed',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
  'expired',
  'refunded',
])

export const paymentStatusSchema = z.enum([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'processing',
  'requires_capture',
  'succeeded',
  'canceled',
])

export const shippingAddressSchema = z.object({
  fullName: z.string(),
  addressLine1: z.string(),
  // Ausentes nas cópias gravadas antes da migration 0002.
  number: z.string().nullable().default(null),
  addressLine2: z.string().nullable(),
  neighborhood: z.string().nullable().default(null),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string(),
})

export const orderItemSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  colorId: uuidSchema,
  productName: z.string(),
  colorName: z.string(),
  colorHex: z.string(),
  imageUrl: z.string(),
  unitPriceCents: z.number().int(),
  quantity: z.number().int(),
  lineTotalCents: z.number().int(),
})

export const orderSummarySchema = z.object({
  id: uuidSchema,
  number: z.number().int(),
  status: orderStatusSchema,
  paymentMethod: paymentMethodSchema,
  itemCount: z.number().int(),
  totalCents: z.number().int(),
  createdAt: isoDateSchema,
  previewImageUrls: z.array(z.string()),
})

export const orderDetailSchema = orderSummarySchema.omit({ previewImageUrls: true }).extend({
  /** Até quando o estoque fica reservado aguardando pagamento (null fora de `pending_payment`). */
  reservedUntil: isoDateSchema.nullable(),
  paymentStatus: paymentStatusSchema.nullable(),
  /** Código da última falha informada pelo Stripe (ex.: `card_declined`), sem dados do pagador. */
  paymentFailureCode: z.string().nullable(),
  subtotalCents: z.number().int(),
  shippingCents: z.number().int(),
  shippingAddress: shippingAddressSchema,
  items: z.array(orderItemSchema),
})

export const orderListResponseSchema = z.object({
  data: z.array(orderSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
})

export type CreateOrderBody = z.infer<typeof createOrderBodySchema>
export type ShippingAddress = z.infer<typeof shippingAddressSchema>
export type OrderSummaryDto = z.infer<typeof orderSummarySchema>
export type OrderDetailDto = z.infer<typeof orderDetailSchema>
