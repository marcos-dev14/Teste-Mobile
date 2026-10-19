import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import type { Pool } from '../../db/pool.js'
import type { ZodTypeProvider } from '../../lib/zod-compiler.js'

export function healthRoutes(pool: Pool) {
  return async (instance: FastifyInstance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>()

    // Liveness: o processo responde.
    app.get(
      '/health',
      { config: { rateLimit: false }, schema: { response: { 200: z.object({ status: z.literal('ok') }) } } },
      async () => ({ status: 'ok' as const }),
    )

    // Readiness: o banco responde.
    app.get(
      '/health/ready',
      {
        config: { rateLimit: false },
        schema: {
          response: {
            200: z.object({ status: z.literal('ok'), db: z.literal('ok') }),
            503: z.object({ status: z.literal('unavailable'), db: z.literal('down') }),
          },
        },
      },
      async (request, reply) => {
        try {
          await pool.query('SELECT 1')
          return { status: 'ok' as const, db: 'ok' as const }
        } catch (error) {
          request.log.error({ err: error }, 'database readiness check failed')
          return reply.status(503).send({ status: 'unavailable', db: 'down' })
        }
      },
    )
  }
}
