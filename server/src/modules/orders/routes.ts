import type { FastifyInstance } from 'fastify'

import { idParamsSchema } from '../../lib/schemas.js'
import type { ZodTypeProvider } from '../../lib/zod-compiler.js'
import {
  createOrderBodySchema,
  createOrderHeadersSchema,
  listOrdersQuerySchema,
  orderDetailSchema,
  orderListResponseSchema,
} from './schemas.js'
import type { OrdersService } from './service.js'

export function orderRoutes(service: OrdersService) {
  return async (instance: FastifyInstance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>()
    app.addHook('onRequest', app.authenticate)

    app.post(
      '/orders',
      {
        config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
        schema: {
          headers: createOrderHeadersSchema,
          body: createOrderBodySchema,
          response: { 200: orderDetailSchema, 201: orderDetailSchema },
        },
      },
      async (request, reply) => {
        const { order, created } = await service.create(
          request.user.sub,
          request.headers['idempotency-key'],
          request.body,
        )
        return reply.status(created ? 201 : 200).send(order)
      },
    )

    app.get(
      '/orders',
      { schema: { querystring: listOrdersQuerySchema, response: { 200: orderListResponseSchema } } },
      async (request) => service.list(request.user.sub, request.query.page, request.query.pageSize),
    )

    app.get(
      '/orders/:id',
      { schema: { params: idParamsSchema, response: { 200: orderDetailSchema } } },
      async (request) => service.get(request.user.sub, request.params.id),
    )
  }
}
