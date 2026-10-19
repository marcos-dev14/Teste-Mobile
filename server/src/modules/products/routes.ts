import type { FastifyInstance } from 'fastify'

import type { Pool } from '../../db/pool.js'
import { notFound } from '../../lib/errors.js'
import { idParamsSchema, offsetFor } from '../../lib/schemas.js'
import type { ZodTypeProvider } from '../../lib/zod-compiler.js'
import { findActiveProductById, listProducts } from './repository.js'
import { listProductsQuerySchema, productDetailSchema, productListResponseSchema } from './schemas.js'

// Catálogo é somente leitura e não tem regra de negócio além da consulta: as rotas chamam o repositório diretamente.
export function productRoutes(pool: Pool) {
  return async (instance: FastifyInstance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>()

    app.get(
      '/products',
      { schema: { querystring: listProductsQuerySchema, response: { 200: productListResponseSchema } } },
      async (request) => {
        const { search, sort, page, pageSize } = request.query
        const { items, total } = await listProducts(pool, {
          search,
          sort,
          limit: pageSize,
          offset: offsetFor(page, pageSize),
        })
        return { data: items, page, pageSize, total }
      },
    )

    app.get(
      '/products/:id',
      { schema: { params: idParamsSchema, response: { 200: productDetailSchema } } },
      async (request) => {
        const product = await findActiveProductById(pool, request.params.id)
        if (!product) throw notFound('Produto não encontrado.', 'PRODUCT_NOT_FOUND')
        return product
      },
    )
  }
}
