import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import type { ZodTypeProvider } from '../../lib/zod-compiler.js'
import { AUTH_RATE_LIMIT, REFRESH_RATE_LIMIT } from '../../plugins/security.js'
import {
  authResponseSchema,
  loginBodySchema,
  refreshBodySchema,
  refreshResponseSchema,
  registerBodySchema,
  userSchema,
} from './schemas.js'
import type { AuthService } from './service.js'

export function authRoutes(service: AuthService) {
  return async (instance: FastifyInstance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>()

    app.post(
      '/auth/register',
      {
        config: { rateLimit: AUTH_RATE_LIMIT },
        schema: { body: registerBodySchema, response: { 201: authResponseSchema } },
      },
      async (request, reply) => reply.status(201).send(await service.register(request.body)),
    )

    app.post(
      '/auth/login',
      {
        config: { rateLimit: AUTH_RATE_LIMIT },
        schema: { body: loginBodySchema, response: { 200: authResponseSchema } },
      },
      async (request) => service.login(request.body),
    )

    app.post(
      '/auth/refresh',
      {
        config: { rateLimit: REFRESH_RATE_LIMIT },
        schema: { body: refreshBodySchema, response: { 200: refreshResponseSchema } },
      },
      async (request) => ({ tokens: await service.refresh(request.body.refreshToken) }),
    )

    app.post(
      '/auth/logout',
      {
        config: { rateLimit: REFRESH_RATE_LIMIT },
        schema: { body: refreshBodySchema, response: { 204: z.null() } },
      },
      async (request, reply) => {
        await service.logout(request.body.refreshToken)
        return reply.status(204).send(null)
      },
    )

    app.get(
      '/me',
      { onRequest: [app.authenticate], schema: { response: { 200: userSchema } } },
      async (request) => service.getProfile(request.user.sub),
    )
  }
}
