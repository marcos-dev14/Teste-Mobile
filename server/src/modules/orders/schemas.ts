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

export const orderStatusSchema = z.enum(['placed', 'paid', 'shipped', 'delivered', 'cancelled'])

export const shippingAddressSchema = z.object({
  fullName: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
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
