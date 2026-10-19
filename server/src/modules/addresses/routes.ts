import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import type { Pool } from '../../db/pool.js'
import { withTransaction } from '../../db/transaction.js'
import { conflict, notFound } from '../../lib/errors.js'
import { idParamsSchema } from '../../lib/schemas.js'
import type { ZodTypeProvider } from '../../lib/zod-compiler.js'
import { deleteAddressForUser, insertAddress, listAddresses, lockUser } from './repository.js'
import { addressSchema, createAddressBodySchema, MAX_ADDRESSES_PER_USER } from './schemas.js'

export function addressRoutes(pool: Pool) {
  return async (instance: FastifyInstance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>()
    app.addHook('onRequest', app.authenticate)

    app.get(
      '/addresses',
      { schema: { response: { 200: z.object({ data: z.array(addressSchema) }) } } },
      async (request) => ({ data: await listAddresses(pool, request.user.sub) }),
    )

    app.post(
      '/addresses',
      { schema: { body: createAddressBodySchema, response: { 201: addressSchema } } },
      async (request, reply) => {
        const userId = request.user.sub
        const address = await withTransaction(pool, async (tx) => {
          // Serializa criações do mesmo usuário para o limite não ser furado por concorrência.
          await lockUser(tx, userId)
          return insertAddress(tx, userId, request.body, MAX_ADDRESSES_PER_USER)
        })
        if (!address) {
          throw conflict('ADDRESS_LIMIT', `Você pode ter no máximo ${MAX_ADDRESSES_PER_USER} endereços.`)
        }
        return reply.status(201).send(address)
      },
    )

    app.delete(
      '/addresses/:id',
      { schema: { params: idParamsSchema, response: { 204: z.null() } } },
      async (request, reply) => {
        const deleted = await deleteAddressForUser(pool, request.user.sub, request.params.id)
        if (!deleted) throw notFound('Endereço não encontrado.', 'ADDRESS_NOT_FOUND')
        return reply.status(204).send(null)
      },
    )
  }
}
