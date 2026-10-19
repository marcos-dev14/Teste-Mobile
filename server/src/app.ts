import { randomUUID } from 'node:crypto'

import Fastify, { type FastifyServerOptions } from 'fastify'
import { z } from 'zod'

import type { Env } from './config/env.js'
import type { Pool } from './db/pool.js'
import { serializerCompiler, validatorCompiler } from './lib/zod-compiler.js'
import { addressRoutes } from './modules/addresses/routes.js'
import { createAddressesService } from './modules/addresses/service.js'
import { authRoutes } from './modules/auth/routes.js'
import { createAuthService } from './modules/auth/service.js'
import { cartRoutes } from './modules/cart/routes.js'
import { healthRoutes } from './modules/health/routes.js'
import { orderRoutes } from './modules/orders/routes.js'
import { createOrdersService } from './modules/orders/service.js'
import { productRoutes } from './modules/products/routes.js'
import { authPlugin } from './plugins/auth.js'
import { errorHandlerPlugin } from './plugins/error-handler.js'
import { securityPlugin } from './plugins/security.js'

export interface BuildAppOptions {
  env: Env
  pool: Pool
  logger?: FastifyServerOptions['logger']
}

/** Campos nunca registrados em log, mesmo que algum serializador futuro os inclua. */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.refreshToken',
  'res.headers["set-cookie"]',
]

function defaultLogger(env: Env): FastifyServerOptions['logger'] {
  return {
    level: env.LOG_LEVEL,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
      : {}),
  }
}

export async function buildApp({ env, pool, logger }: BuildAppOptions) {
  // Mensagens padrão de validação em português (as mensagens customizadas dos schemas têm precedência).
  z.config(z.locales.pt())

  const app = Fastify({
    logger: logger ?? defaultLogger(env),
    trustProxy: env.TRUST_PROXY,
    bodyLimit: 64 * 1024,
    // Id gerado no servidor (não aceitamos o do cliente para não poluir logs).
    genReqId: () => randomUUID(),
    requestIdHeader: false,
    routerOptions: { ignoreTrailingSlash: true },
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })

  await app.register(errorHandlerPlugin)
  await app.register(securityPlugin, {
    corsOrigins: env.CORS_ORIGINS,
    rateLimitEnabled: env.RATE_LIMIT_ENABLED,
  })
  await app.register(authPlugin, {
    secret: env.JWT_SECRET,
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
  })

  const authService = createAuthService({
    pool,
    log: app.log,
    signAccessToken: (userId) => app.signAccessToken(userId),
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
  })
  const ordersService = createOrdersService({ pool })
  const addressesService = createAddressesService({ pool })

  await app.register(healthRoutes(pool))
  await app.register(
    async (v1) => {
      await v1.register(authRoutes(authService))
      await v1.register(productRoutes(pool))
      await v1.register(cartRoutes(pool))
      await v1.register(addressRoutes(addressesService))
      await v1.register(orderRoutes(ordersService))
    },
    { prefix: '/v1' },
  )

  return app
}

export type App = Awaited<ReturnType<typeof buildApp>>
