import { z } from 'zod'

import { paginationQuerySchema, uuidSchema } from '../../lib/schemas.js'

export const productSortSchema = z.enum(['featured', 'price_asc', 'price_desc', 'newest'])

export const listProductsQuerySchema = paginationQuerySchema.extend({
  search: z
    .string()
    .trim()
    .max(60, 'Busca muito longa.')
    .optional()
    .transform((value) => (value ? value : undefined)),
  sort: productSortSchema.default('featured'),
})

const colorSummarySchema = z.object({ id: uuidSchema, name: z.string(), hex: z.string() })

export const productSummarySchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  priceCents: z.number().int(),
  rating: z.number().nullable(),
  imageUrl: z.string(),
  colors: z.array(colorSummarySchema),
  inStock: z.boolean(),
})

export const productListResponseSchema = z.object({
  data: z.array(productSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
})

export const productColorSchema = colorSummarySchema.extend({
  imageUrls: z.array(z.string()),
  stock: z.number().int(),
})

export const productDetailSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  priceCents: z.number().int(),
  rating: z.number().nullable(),
  imageUrls: z.array(z.string()),
  colors: z.array(productColorSchema),
  inStock: z.boolean(),
})

export type ProductSort = z.infer<typeof productSortSchema>
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>
export type ProductSummaryDto = z.infer<typeof productSummarySchema>
export type ProductDetailDto = z.infer<typeof productDetailSchema>
