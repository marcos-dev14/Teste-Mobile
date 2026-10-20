import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { idParamsSchema } from '../../lib/schemas.js'
import type { ZodTypeProvider } from '../../lib/zod-compiler.js'
import { addressSchema, createAddressBodySchema } from './schemas.js'
import type { AddressesService } from './service.js'

export function addressRoutes(service: AddressesService) {
  return async (instance: FastifyInstance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>()
    app.addHook('onRequest', app.authenticate)

    app.get(
      '/addresses',
      { schema: { response: { 200: z.object({ data: z.array(addressSchema) }) } } },
      async (request) => ({ data: await service.list(request.user.sub) }),
    )

    app.post(
      '/addresses',
      { schema: { body: createAddressBodySchema, response: { 201: addressSchema } } },
      async (request, reply) => reply.status(201).send(await service.create(request.user.sub, request.body)),
    )

    app.delete(
      '/addresses/:id',
      { schema: { params: idParamsSchema, response: { 204: z.null() } } },
      async (request, reply) => {
        await service.remove(request.user.sub, request.params.id)
        return reply.status(204).send(null)
      },
    )
  }
}
