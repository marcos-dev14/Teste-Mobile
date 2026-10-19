import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

import { AppError } from '../lib/errors.js'

export interface SecurityOptions {
  corsOrigins: string[]
  rateLimitEnabled: boolean
}

/** Limites aplicados por rota sensível (via `config.rateLimit`). */
export const AUTH_RATE_LIMIT = { max: 10, timeWindow: '1 minute' } as const
export const REFRESH_RATE_LIMIT = { max: 30, timeWindow: '1 minute' } as const

export const securityPlugin = fp<SecurityOptions>(async (app: FastifyInstance, options) => {
  await app.register(helmet, {
    // API JSON: sem HTML, CSP restritiva.
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
  })

  await app.register(cors, {
    // Apps nativos não enviam Origin; só origens web explicitamente listadas são aceitas.
    origin: options.corsOrigins.length > 0 ? options.corsOrigins : false,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 600,
  })

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    enableDraftSpec: false,
    skipOnError: false,
    allowList: () => !options.rateLimitEnabled,
    errorResponseBuilder: (_request, context) =>
      new AppError(
        429,
        'RATE_LIMITED',
        `Muitas requisições. Tente novamente em ${Math.ceil(context.ttl / 1000)} s.`,
      ),
  })
})
